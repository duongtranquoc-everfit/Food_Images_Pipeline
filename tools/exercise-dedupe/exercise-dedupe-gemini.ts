/**
 * Gemini judge: two exercise titles = same movement (different naming) or not.
 *
 * Requires GEMINI_API_KEY (Bun loads .env automatically).
 * Optional: GEMINI_MODEL (default: gemini-2.5-flash)
 *
 * Examples:
 *   bun run tools/exercise-dedupe/exercise-dedupe-gemini.ts --pair "Half Kneeling Single Arm Lat Pulldown" "Half Knelt single arm lat pulldown"
 *   bun run tools/exercise-dedupe/exercise-dedupe-gemini.ts --jsonl pairs.jsonl --out results.jsonl
 *   bun run tools/exercise-dedupe/exercise-dedupe-gemini.ts --xlsx ./data.xlsx --sheet "Sheet1" --out results.jsonl
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { GoogleGenerativeAI, SchemaType, type ObjectSchema } from "@google/generative-ai";
import { NAMING_VARIATION_SYSTEM_APPEND } from "./naming-variation-knowledge.ts";

export type PairInput = {
  title_a: string;
  title_b: string;
  modality_a?: string;
  modality_b?: string;
  category_a?: string;
  category_b?: string;
  muscle_a?: string;
  muscle_b?: string;
};

export type JudgeResult = {
  same_exercise: boolean;
  confidence: number;
  reason: string;
};

const responseSchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    same_exercise: {
      type: SchemaType.BOOLEAN,
      description:
        "True only if both names denote the same exercise; false if equipment, stance, pattern, or emphasis differs.",
    },
    confidence: {
      type: SchemaType.NUMBER,
      description: "Confidence between 0 and 1.",
    },
    reason: {
      type: SchemaType.STRING,
      description: "One short sentence, no markdown.",
    },
  },
  required: ["same_exercise", "confidence", "reason"],
};

const SYSTEM_INSTRUCTION = `You label pairs of exercise names from a coach/training library.

Mark same_exercise = true when the two strings are naming variants of ONE exercise (grammar, synonyms, word order, US/UK spelling, abbreviations like DB vs Dumbbell, pluralization, e.g. "Half Kneeling" vs "Half Knelt" for the same half-kneeling position).

Mark same_exercise = false when they would be different exercises for programming: different equipment, single vs bilateral, different main movement (e.g. pull-up vs lat pulldown), different base position, or clearly different intent.

Use optional context fields only to reduce mistakes; if context conflicts with the titles, prefer what the titles imply for typical gym naming.

---
${NAMING_VARIATION_SYSTEM_APPEND}`;

function buildUserText(p: PairInput): string {
  const lines: string[] = [
    "Exercise A title:",
    p.title_a.trim(),
    "",
    "Exercise B title:",
    p.title_b.trim(),
    "",
  ];
  if (p.modality_a || p.modality_b) {
    lines.push("Primary modality A:", p.modality_a ?? "", "Primary modality B:", p.modality_b ?? "", "");
  }
  if (p.category_a || p.category_b) {
    lines.push("Category A:", p.category_a ?? "", "Category B:", p.category_b ?? "", "");
  }
  if (p.muscle_a || p.muscle_b) {
    lines.push("Muscle/context A:", p.muscle_a ?? "", "Muscle/context B:", p.muscle_b ?? "", "");
  }
  lines.push("Decide if A and B are the same exercise under different names.");
  return lines.join("\n");
}

function isRetriableApiError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("429") ||
    msg.includes("529") ||
    msg.includes("Too Many Requests") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Service Unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("UNAVAILABLE")
  );
}

function parseJudgeJson(raw: string): JudgeResult {
  let t = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fenced) t = fenced[1]!.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  const parsed = JSON.parse(t) as JudgeResult;
  return parsed;
}

export async function judgeExercisePair(
  apiKey: string,
  modelId: string,
  pair: PairInput,
): Promise<JudgeResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const prompt = buildUserText(pair);
  const maxAttempts = 10;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = parseJudgeJson(text);
      if (typeof parsed.same_exercise !== "boolean" || typeof parsed.confidence !== "number") {
        throw new Error(`Unexpected JSON from model: ${text}`);
      }
      return {
        same_exercise: parsed.same_exercise,
        confidence: Math.min(1, Math.max(0, parsed.confidence)),
        reason: String(parsed.reason ?? "").trim(),
      };
    } catch (e) {
      lastErr = e;
      if (isRetriableApiError(e) && attempt < maxAttempts) {
        const waitMs = Math.min(120_000, 32_000 * attempt);
        console.error(`Gemini API error (retryable), waiting ${waitMs}ms (attempt ${attempt}/${maxAttempts})`);
        await sleep(waitMs);
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type CliArgs = {
  pair?: [string, string];
  jsonl?: string;
  xlsx?: string;
  sheet?: string;
  out?: string;
  delayMs: number;
  dryRun: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { delayMs: 400, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pair") {
      const x = argv[i + 1];
      const y = argv[i + 2];
      if (!x || !y) throw new Error("--pair requires two arguments");
      out.pair = [x, y];
      i += 2;
    } else if (a === "--jsonl") {
      out.jsonl = argv[++i];
    } else if (a === "--xlsx") {
      out.xlsx = argv[++i];
    } else if (a === "--sheet") {
      out.sheet = argv[++i];
    } else if (a === "--out") {
      out.out = argv[++i];
    } else if (a === "--delay-ms") {
      out.delayMs = Number(argv[++i]);
    } else if (a === "--dry-run") {
      out.dryRun = true;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  --pair "Title A" "Title B"
  --jsonl path.jsonl [--out out.jsonl]
  --xlsx path.xlsx [--sheet name] [--out out.jsonl]
  Columns for xlsx/jsonl: title_a, title_b; optional: modality_a, modality_b, category_a, category_b, muscle_a, muscle_b
  --delay-ms ms   (default 400, between API calls in batch mode)
  --dry-run       (print pairs only, no API calls)
`);
      process.exit(0);
    }
  }
  return out;
}

function readJsonl(pathStr: string): PairInput[] {
  const raw = fs.readFileSync(pathStr, "utf8");
  const rows: PairInput[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    rows.push(JSON.parse(t) as PairInput);
  }
  return rows;
}

function readXlsxRows(filePath: string, sheetName?: string): PairInput[] {
  const wb = XLSX.readFile(filePath);
  const name = sheetName ?? wb.SheetNames[0];
  if (!name) throw new Error("No sheets in workbook");
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Sheet not found: ${name}`);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  const out: PairInput[] = [];
  for (const r of rows) {
    const ta = String(r.title_a ?? r.Title_A ?? r["title A"] ?? "").trim();
    const tb = String(r.title_b ?? r.Title_B ?? r["title B"] ?? "").trim();
    if (!ta || !tb) continue;
    out.push({
      title_a: ta,
      title_b: tb,
      modality_a: optStr(r, ["modality_a", "Primary Modality A", "modality A"]),
      modality_b: optStr(r, ["modality_b", "Primary Modality B", "modality B"]),
      category_a: optStr(r, ["category_a", "Category Type A", "category A"]),
      category_b: optStr(r, ["category_b", "Category Type B", "category B"]),
      muscle_a: optStr(r, ["muscle_a", "Primary Muscle Group 1 A", "muscle A"]),
      muscle_b: optStr(r, ["muscle_b", "Primary Muscle Group 1 B", "muscle B"]),
    });
  }
  return out;
}

function optStr(r: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

async function main() {
  const args = parseArgs(process.argv);
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const modelId = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  let pairs: PairInput[] = [];
  if (args.pair) {
    pairs.push({ title_a: args.pair[0], title_b: args.pair[1] });
  } else if (args.jsonl) {
    pairs = readJsonl(path.resolve(args.jsonl));
  } else if (args.xlsx) {
    pairs = readXlsxRows(path.resolve(args.xlsx), args.sheet);
  } else {
    console.error("Provide --pair, --jsonl, or --xlsx");
    process.exit(1);
  }

  if (!args.dryRun && !apiKey) {
    console.error("Set GEMINI_API_KEY in the environment or .env");
    process.exit(1);
  }

  const outPath = args.out ? path.resolve(args.out) : null;
  const isTty = process.stdout.isTTY;

  if (args.dryRun) {
    console.log(JSON.stringify({ count: pairs.length, pairs }, null, 2));
    return;
  }

  let lineOut: ((s: string) => void) | null = null;
  if (outPath) {
    fs.writeFileSync(outPath, "");
    lineOut = (s: string) => fs.appendFileSync(outPath, s + "\n");
  }

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]!;
    if (isTty) {
      console.error(`[${i + 1}/${pairs.length}] ${pair.title_a.slice(0, 48)} …`);
    }
    const judged = await judgeExercisePair(apiKey, modelId, pair);
    const record = { ...pair, gemini: judged };
    const line = JSON.stringify(record);
    if (lineOut) lineOut(line);
    else console.log(line);
    if (i < pairs.length - 1) await sleep(args.delayMs);
  }

  if (outPath) console.error(`Wrote ${pairs.length} line(s) to ${outPath}`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
