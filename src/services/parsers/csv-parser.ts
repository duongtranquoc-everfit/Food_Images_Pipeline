import type { FileParser, ParsedData } from "../../shared/types";

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] ?? "";
  const delimiters = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = 0;

  for (const d of delimiters) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export const csvParser: FileParser = {
  canParse(file: File): boolean {
    return (
      file.name.endsWith(".csv") || file.type === "text/csv"
    );
  },

  async parse(file: File): Promise<ParsedData> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");

    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    const delimiter = detectDelimiter(text);
    const headers = parseCSVLine(lines[0]!, delimiter);
    const rows = lines.slice(1).map((line) => parseCSVLine(line, delimiter));

    return { headers, rows };
  },
};
