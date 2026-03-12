import type { FileParser, ParsedData } from "../../shared/types";
import { csvParser } from "./csv-parser";
import { xlsxParser } from "./xlsx-parser";

const parsers: FileParser[] = [csvParser, xlsxParser];

const SUPPORTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export function isSupportedFile(file: File): boolean {
  return SUPPORTED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );
}

export function getParser(file: File): FileParser | null {
  return parsers.find((p) => p.canParse(file)) ?? null;
}

export async function parseFile(
  file: File,
  sheetName?: string
): Promise<ParsedData> {
  const parser = getParser(file);
  if (!parser) {
    throw new Error(
      `Unsupported file type: ${file.name}. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`
    );
  }
  return parser.parse(file, sheetName);
}
