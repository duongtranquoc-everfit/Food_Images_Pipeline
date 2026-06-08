import { googleFetch } from "./google-api";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export function parseSheetUrl(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match?.[1]) {
    throw new Error("Invalid Google Sheet URL");
  }
  return match[1];
}

export interface SheetMetadata {
  title: string;
  tabs: string[];
}

export async function getSheetMetadata(
  spreadsheetId: string
): Promise<SheetMetadata> {
  const response = await googleFetch(
    `${SHEETS_API}/${spreadsheetId}?fields=properties.title,sheets.properties.title`
  );
  const data = await response.json();
  return {
    title: data.properties.title,
    tabs: data.sheets.map(
      (s: { properties: { title: string } }) => s.properties.title
    ),
  };
}

export async function getSheetHeaders(
  spreadsheetId: string,
  tab: string
): Promise<string[]> {
  const range = encodeURIComponent(`'${tab}'!1:1`);
  const response = await googleFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}`
  );
  const data = await response.json();
  return data.values?.[0] ?? [];
}

export async function getSheetData(
  spreadsheetId: string,
  tab: string
): Promise<string[][]> {
  const range = encodeURIComponent(`'${tab}'`);
  const response = await googleFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}`
  );
  const data = await response.json();
  const rows: string[][] = data.values ?? [];
  // Return rows excluding header
  return rows.slice(1);
}

export async function batchUpdateSheet(
  spreadsheetId: string,
  updates: Array<{ range: string; values: string[][] }>
): Promise<void> {
  await googleFetch(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: updates,
    }),
  });
}
