import { useState, useCallback } from "react";
import type { ParsedData } from "../../shared/types";
import { parseFile, isSupportedFile } from "../../services/parsers";

interface UseFileParserReturn {
  parsedData: ParsedData | null;
  error: string | null;
  loading: boolean;
  handleFile: (file: File) => Promise<void>;
  handleSheetChange: (file: File, sheetName: string) => Promise<void>;
  reset: () => void;
}

export function useFileParser(): UseFileParserReturn {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setParsedData(null);

    if (!isSupportedFile(file)) {
      setError("Unsupported file type. Please upload a .csv or .xlsx file.");
      return;
    }

    setLoading(true);
    try {
      const data = await parseFile(file);
      setParsedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSheetChange = useCallback(
    async (file: File, sheetName: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await parseFile(file, sheetName);
        setParsedData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse sheet");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setParsedData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { parsedData, error, loading, handleFile, handleSheetChange, reset };
}
