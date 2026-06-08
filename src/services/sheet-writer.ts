import { getSheetHeaders, getSheetData, batchUpdateSheet } from "./sheets";

export interface WritebackResult {
  written: number;
  skipped: number;
  warnings: string[];
}

export async function writeUrlsToSheet(
  spreadsheetId: string,
  tab: string,
  nameColIndex: number,
  targetColIndex: number,
  urlMap: Map<string, string>,
  overwrite: boolean
): Promise<WritebackResult> {
  const headers = await getSheetHeaders(spreadsheetId, tab);
  const rows = await getSheetData(spreadsheetId, tab);

  const targetColLetter = String.fromCharCode(65 + targetColIndex);
  const result: WritebackResult = { written: 0, skipped: 0, warnings: [] };
  const updates: Array<{ range: string; values: string[][] }> = [];
  const matchedNames = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const name = row[nameColIndex]?.trim() ?? "";
    if (!name) continue;

    const driveUrl = urlMap.get(name);
    if (!driveUrl) continue;

    // Duplicate name detection
    if (matchedNames.has(name)) {
      result.warnings.push(`Duplicate name: "${name}" at row ${i + 2}`);
      continue;
    }
    matchedNames.add(name);

    // Check existing value
    const existingValue = row[targetColIndex]?.trim() ?? "";
    if (existingValue && !overwrite) {
      result.skipped++;
      continue;
    }

    // Row index in sheet is i + 2 (1-based, skip header)
    const range = `'${tab}'!${targetColLetter}${i + 2}`;
    updates.push({ range, values: [[driveUrl]] });
    result.written++;
  }

  if (updates.length > 0) {
    await batchUpdateSheet(spreadsheetId, updates);
  }

  return result;
}
