/**
 * Full exercise dedupe → one clean CSV (same columns as raw, same order).
 *
 * 1) Exact: group by normalized title, keep best row per group.
 * 2) Optional Gemini: candidate pairs (similar wording, not identical norm) → merge if same_exercise + confidence.
 *
 * bun run tools/exercise-dedupe/exercise-dedupe-pipeline.ts --input ./in.xlsx --output ./clean.csv
 * GEMINI_API_KEY=... (omit or --skip-gemini for exact-only)
 *
 * Env: GEMINI_MODEL (default gemini-2.5-flash), GEMINI_API_KEY
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { judgeExercisePair, type PairInput } from "./exercise-dedupe-gemini.ts";

type RowData = Record<string, unknown>;

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "for",
  "with",
  "on",
  "in",
  "at",
  "by",
  "from",
  "as",
  "vs",
]);

/** Whole-token gym abbreviations → expanded words (before punctuation strip). Longer tokens first where relevant. */
function expandGymAbbreviations(s: string): string {
  let t = s;
  const pairs: [RegExp, string][] = [
    [/\bsldl\b/gi, "stiff leg deadlift"],
    [/\brdl\b/gi, "romanian deadlift"],
    [/\btrx\b/gi, "trx"],
    [/\bdbs\b/gi, "dumbbells"],
    [/\bdb\b/gi, "dumbbell"],
    [/\bbb\b/gi, "barbell"],
    [/\bkb\b/gi, "kettlebell"],
    [/\bmb\b/gi, "medicine ball"],
    [/\bbw\b/gi, "bodyweight"],
    [/\btb\b/gi, "trap bar"],
    [/\bsm\b/gi, "smith machine"],
    [/\bez\b/gi, "ez bar"],
    [/\bcbl\b/gi, "cable"],
    [/\bcb\b/gi, "cable"],
    [/\bohp\b/gi, "overhead press"],
    [/\bbp\b/gi, "bench press"],
    [/\bfdl\b/gi, "front deadlift"],
    [/\bdl\b/gi, "deadlift"],
    [/\bgm\b/gi, "good morning"],
    [/\bfs\b/gi, "front squat"],
    [/\bhs\b/gi, "hack squat"],
    [/\blp\b/gi, "leg press"],
    [/\ble\b/gi, "leg extension"],
    [/\blc\b/gi, "leg curl"],
    [/\bghr\b/gi, "glute ham raise"],
    [/\bcg\b/gi, "close grip"],
    [/\bwg\b/gi, "wide grip"],
    [/\bng\b/gi, "neutral grip"],
    [/\bsa\b/gi, "single arm"],
    [/\bsl\b/gi, "single leg"],
  ];
  for (const [re, rep] of pairs) t = t.replace(re, rep);
  return t;
}

/** Fold common plural exercise names so "Burpee"/"Burpees" share one key. */
function foldCommonExercisePlurals(s: string): string {
  return s
    .replace(/\b(burpees|lunges)\b/gi, (_, g1: string) => (g1.toLowerCase() === "burpees" ? "burpee" : "lunge"))
    .replace(/\bsquats\b/gi, "squat")
    .replace(/\bcurls\b/gi, "curl")
    .replace(/\brows\b/gi, "row")
    .replace(/\bpresses\b/gi, "press");
}

function normalizeTitle(raw: string): string {
  let s = raw.normalize("NFKC").trim().toLowerCase();
  s = expandGymAbbreviations(s);
  s = foldCommonExercisePlurals(s);
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"');
  s = s.replace(/[^\p{L}\p{N}\s']/gu, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function tokenize(norm: string): string[] {
  return norm
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

function wordJaccard(normA: string, normB: string): number {
  const A = new Set(tokenize(normA));
  const B = new Set(tokenize(normB));
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

function scoreRow(row: RowData, headers: string[]): number {
  let score = 0;
  for (const h of headers) {
    const v = row[h];
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    score += 1;
  }
  const raw = row.totalTracked ?? row.TotalTracked ?? row["totalTracked"];
  let n = 0;
  if (typeof raw === "number" && !Number.isNaN(raw)) n = raw;
  else if (typeof raw === "string") {
    const x = Number(raw);
    if (!Number.isNaN(x)) n = x;
  }
  score += n * 0.001;
  return score;
}

function findHeader(headers: string[], candidates: string[]): string | undefined {
  const map = new Map(headers.map((h) => [h.toLowerCase(), h] as const));
  for (const c of candidates) {
    const h = map.get(c.toLowerCase());
    if (h) return h;
  }
  return undefined;
}

function readSheetOrdered(ws: XLSX.WorkSheet): { headers: string[]; rows: RowData[] } {
  const ref = ws["!ref"];
  if (!ref) return { headers: [], rows: [] };
  const range = XLSX.utils.decode_range(ref);
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c });
    const cell = ws[addr];
    const h = cell?.v != null ? String(cell.v) : `__col_${c}`;
    headers.push(h);
  }
  const rows: RowData[] = [];
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const row: RowData = {};
    for (let ci = 0; ci < headers.length; ci++) {
      const c = range.s.c + ci;
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      let v: unknown = cell?.v;
      if (v === undefined) v = "";
      row[headers[ci]] = v;
    }
    rows.push(row);
  }
  return { headers, rows };
}

function toCsvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(pathStr: string, headers: string[], rows: RowData[]): void {
  const lines: string[] = [];
  lines.push(headers.map((h) => toCsvCell(h)).join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => toCsvCell(row[h])).join(","));
  }
  fs.writeFileSync(pathStr, "\uFEFF" + lines.join("\n"), "utf8");
}

class UF {
  parent: number[];
  rank: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = Array(n).fill(0);
  }
  find(i: number): number {
    const p = this.parent;
    while (p[i] !== i) {
      p[i] = p[p[i]];
      i = p[i];
    }
    return i;
  }
  union(i: number, j: number): void {
    let ri = this.find(i);
    let rj = this.find(j);
    if (ri === rj) return;
    const p = this.parent;
    const r = this.rank;
    if (r[ri] < r[rj]) p[ri] = rj;
    else if (r[ri] > r[rj]) p[rj] = ri;
    else {
      p[rj] = ri;
      r[ri]++;
    }
  }
}

type Rep = {
  row: RowData;
  norm: string;
};

function rowTitles(
  a: RowData,
  b: RowData,
  titleKey: string,
  modalityKey: string | undefined,
  categoryKey: string | undefined,
  muscleKey: string | undefined,
): PairInput {
  const pk: PairInput = {
    title_a: String(a[titleKey] ?? "").trim(),
    title_b: String(b[titleKey] ?? "").trim(),
  };
  if (modalityKey) {
    pk.modality_a = String(a[modalityKey] ?? "").trim();
    pk.modality_b = String(b[modalityKey] ?? "").trim();
  }
  if (categoryKey) {
    pk.category_a = String(a[categoryKey] ?? "").trim();
    pk.category_b = String(b[categoryKey] ?? "").trim();
  }
  if (muscleKey) {
    pk.muscle_a = String(a[muscleKey] ?? "").trim();
    pk.muscle_b = String(b[muscleKey] ?? "").trim();
  }
  return pk;
}

type PipelineArgs = {
  input: string;
  output: string;
  sheet?: string;
  skipGemini: boolean;
  maxGeminiPairs: number;
  delayMs: number;
  geminiMinConfidence: number;
  jaccardMin: number;
  jaccardMax: number;
  lengthNeighbor: number;
  dryRun: boolean;
};

function parseArgs(argv: string[]): PipelineArgs {
  const d: PipelineArgs = {
    input: "",
    output: "",
    skipGemini: false,
    maxGeminiPairs: 25_000,
    delayMs: 1000,
    geminiMinConfidence: 0.65,
    jaccardMin: 0.42,
    jaccardMax: 0.995,
    lengthNeighbor: 80,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input") d.input = path.resolve(argv[++i]);
    else if (a === "--output") d.output = path.resolve(argv[++i]);
    else if (a === "--sheet") d.sheet = argv[++i];
    else if (a === "--skip-gemini") d.skipGemini = true;
    else if (a === "--max-gemini-pairs") d.maxGeminiPairs = Number(argv[++i]);
    else if (a === "--delay-ms") d.delayMs = Number(argv[++i]);
    else if (a === "--gemini-min-confidence") d.geminiMinConfidence = Number(argv[++i]);
    else if (a === "--jaccard-min") d.jaccardMin = Number(argv[++i]);
    else if (a === "--jaccard-max") d.jaccardMax = Number(argv[++i]);
    else if (a === "--length-neighbor") d.lengthNeighbor = Number(argv[++i]);
    else if (a === "--dry-run") d.dryRun = true;
    else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  --input path.xlsx --output clean.csv
  [--sheet name]  [--skip-gemini]
  [--max-gemini-pairs N]  [--delay-ms 400]  [--gemini-min-confidence 0.65]
  [--jaccard-min 0.42] [--jaccard-max 0.995] [--length-neighbor 80]
  [--dry-run]  (exact dedupe + candidate stats, no Gemini)

Produces UTF-8 CSV with BOM, all original columns in sheet column order.`);
      process.exit(0);
    }
  }
  return d;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function collectCandidates(
  reps: Rep[],
  jMin: number,
  jMax: number,
  lengthNeighbor: number,
  maxPairs: number,
): { i: number; j: number; jac: number }[] {
  const sorted = reps
    .map((r, idx) => ({ ...r, idx }))
    .sort((a, b) => a.norm.length - b.norm.length || a.norm.localeCompare(b.norm));

  const out: { i: number; j: number; jac: number }[] = [];
  const seen = new Set<string>();

  for (let pi = 0; pi < sorted.length; pi++) {
    const base = sorted[pi];
    for (let k = 1; k <= lengthNeighbor && pi + k < sorted.length; k++) {
      const other = sorted[pi + k];
      const lenDiff = other.norm.length - base.norm.length;
      if (lenDiff > 18) break;
      if (base.norm === other.norm) continue;
      const jac = wordJaccard(base.norm, other.norm);
      if (jac < jMin || jac > jMax) continue;
      const i = Math.min(base.idx, other.idx);
      const j = Math.max(base.idx, other.idx);
      const key = `${i}\t${j}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ i, j, jac });
    }
  }

  out.sort((a, b) => b.jac - a.jac);
  return out.slice(0, maxPairs);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.input || !args.output) {
    console.error("Required: --input path.xlsx --output clean.csv");
    process.exit(1);
  }

  const wb = XLSX.readFile(args.input);
  const sheetName = args.sheet ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("No sheets");
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Missing sheet: ${sheetName}`);

  const { headers, rows } = readSheetOrdered(ws);
  const titleKey = findHeader(headers, ["title"]);
  if (!titleKey) throw new Error('No "title" column found (case-insensitive).');

  const modalityKey = findHeader(headers, ["Primary Modality", "primary modality", "modality"]);
  const categoryKey = findHeader(headers, ["Category Type", "category type", "category"]);
  const muscleKey = findHeader(headers, ["Primary Muscle Group 1", "primary muscle group 1"]);

  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const modelId = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!args.skipGemini && !args.dryRun && !apiKey) {
    console.error("Set GEMINI_API_KEY or use --skip-gemini for title-normalization-only dedupe.");
    process.exit(1);
  }

  /** exact groups */
  const byNorm = new Map<string, RowData[]>();
  for (const row of rows) {
    const t = String(row[titleKey] ?? "").trim();
    const norm = normalizeTitle(t);
    const key = norm || "__empty__";
    if (!byNorm.has(key)) byNorm.set(key, []);
    byNorm.get(key)!.push(row);
  }

  const reps: Rep[] = [];
  let exactMerged = 0;
  for (const [, group] of byNorm) {
    if (group.length === 0) continue;
    let best = group[0];
    let bestScore = scoreRow(best, headers);
    for (let g = 1; g < group.length; g++) {
      const sc = scoreRow(group[g], headers);
      if (sc > bestScore) {
        best = group[g];
        bestScore = sc;
      }
    }
    exactMerged += group.length - 1;
    const norm = normalizeTitle(String(best[titleKey] ?? ""));
    reps.push({ row: best, norm });
  }

  console.error(
    `Rows in: ${rows.length} | After exact dedupe: ${reps.length} (dropped ${exactMerged} duplicate rows)`,
  );

  if (args.skipGemini || args.dryRun) {
    const outRows = reps.map((r) => r.row);
    if (!args.dryRun) writeCsv(args.output, headers, outRows);
    const cand = collectCandidates(
      reps,
      args.jaccardMin,
      args.jaccardMax,
      args.lengthNeighbor,
      args.maxGeminiPairs,
    );
    console.error(`Gemini candidate pairs (cap ${args.maxGeminiPairs}): ${cand.length}`);
    if (args.dryRun) {
      console.error("Dry run: no file written. Use without --dry-run to write CSV.");
      process.exit(0);
    }
    if (args.skipGemini) {
      console.error(`Wrote ${outRows.length} rows → ${args.output}`);
    }
    process.exit(0);
  }

  const cand = collectCandidates(
    reps,
    args.jaccardMin,
    args.jaccardMax,
    args.lengthNeighbor,
    args.maxGeminiPairs,
  );
  console.error(`Gemini calls: ${cand.length} (max ${args.maxGeminiPairs})`);

  const uf = new UF(reps.length);
  let geminiUnions = 0;

  for (let k = 0; k < cand.length; k++) {
    const { i, j, jac } = cand[k];
    const ri = reps[i].row;
    const rj = reps[j].row;
    const pair = rowTitles(ri, rj, titleKey, modalityKey, categoryKey, muscleKey);

    if (k % 50 === 0) {
      console.error(`[${k + 1}/${cand.length}] jacc=${jac.toFixed(3)} …`);
    }

    const judged = await judgeExercisePair(apiKey, modelId, pair);
    if (judged.same_exercise && judged.confidence >= args.geminiMinConfidence) {
      const sameComp = uf.find(i) === uf.find(j);
      uf.union(i, j);
      if (!sameComp) geminiUnions++;
    }

    if (k < cand.length - 1) await sleep(args.delayMs);
  }

  const comp = new Map<number, RowData[]>();
  for (let i = 0; i < reps.length; i++) {
    const root = uf.find(i);
    if (!comp.has(root)) comp.set(root, []);
    comp.get(root)!.push(reps[i].row);
  }

  const finalRows: RowData[] = [];
  for (const [, group] of comp) {
    let best = group[0];
    let bestScore = scoreRow(best, headers);
    for (let g = 1; g < group.length; g++) {
      const sc = scoreRow(group[g], headers);
      if (sc > bestScore) {
        best = group[g];
        bestScore = sc;
      }
    }
    finalRows.push(best);
  }

  writeCsv(args.output, headers, finalRows);
  console.error(
    `Done. Rows: ${rows.length} → ${finalRows.length} | exact duplicate rows removed: ${exactMerged} | after exact: ${reps.length} reps | Gemini unions: ${geminiUnions} | components: ${comp.size}`,
  );
  console.error(`Wrote → ${args.output}`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
