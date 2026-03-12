import * as XLSX from "xlsx";
import type { FileParser, ParsedData } from "../../shared/types";

export const xlsxParser: FileParser = {
  canParse(file: File): boolean {
    return (
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  },

  async parse(file: File, sheetName?: string): Promise<ParsedData> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetNames = workbook.SheetNames;
    const targetSheet = sheetName ?? sheetNames[0];
    if (!targetSheet) {
      return { headers: [], rows: [], sheetNames };
    }

    const worksheet = workbook.Sheets[targetSheet];
    if (!worksheet) {
      return { headers: [], rows: [], sheetNames };
    }

    const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: "",
    });

    if (jsonData.length === 0) {
      return { headers: [], rows: [], sheetNames };
    }

    const headers = (jsonData[0] ?? []).map(String);
    const rows = jsonData.slice(1).map((row) => row.map(String));

    return { headers, rows, sheetNames };
  },
};
