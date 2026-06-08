import { useState } from "react";
import { TextInput, Select, Button, Stack, Alert } from "@mantine/core";
import {
  parseSheetUrl,
  getSheetMetadata,
  getSheetHeaders,
  getSheetData,
} from "../../../services/sheets";
import { usePipelineStore } from "../../store/pipeline-store";
import type { PipelineRow } from "../../../shared/types";

export function SheetConfig() {
  const setSheetConfig = usePipelineStore((s) => s.setSheetConfig);
  const setRows = usePipelineStore((s) => s.setRows);
  const setStage = usePipelineStore((s) => s.setStage);

  const [sheetUrl, setSheetUrl] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [nameCol, setNameCol] = useState<string | null>(null);
  const [imageCol, setImageCol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");

  const handleFetchSheet = async () => {
    setError(null);
    setLoading(true);
    try {
      const id = parseSheetUrl(sheetUrl);
      setSpreadsheetId(id);
      const meta = await getSheetMetadata(id);
      setTabs(meta.tabs);
      if (meta.tabs[0]) {
        setSelectedTab(meta.tabs[0]);
        const hdrs = await getSheetHeaders(id, meta.tabs[0]);
        setHeaders(hdrs);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (tab: string | null) => {
    if (!tab) return;
    setSelectedTab(tab);
    setNameCol(null);
    try {
      const hdrs = await getSheetHeaders(spreadsheetId, tab);
      setHeaders(hdrs);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const isDriveLink = (url: string) =>
    /drive\.google\.com|googleusercontent\.com/i.test(url);

  const isUrl = (s: string) =>
    /^https?:\/\/.+/i.test(s.trim());

  const handleLoadData = async () => {
    if (!selectedTab || nameCol === null) return;
    setLoading(true);
    setError(null);
    try {
      const nameIdx = parseInt(nameCol, 10);
      const imgIdx = imageCol !== null ? parseInt(imageCol, 10) : -1;
      const data = await getSheetData(spreadsheetId, selectedTab);

      const rows: PipelineRow[] = data
        .map((row) => {
          const name = row[nameIdx]?.trim() ?? "";
          const existingUrl = imgIdx >= 0 ? (row[imgIdx]?.trim() ?? "") : "";

          if (isDriveLink(existingUrl)) {
            // Already uploaded to Drive → mark done, skip processing
            return {
              name,
              imageUrl: "",
              status: "done" as const,
              driveUrl: existingUrl,
            };
          }

          if (isUrl(existingUrl)) {
            // Has a non-Drive image URL → auto-fill for processing
            return {
              name,
              imageUrl: existingUrl,
              status: "queued" as const,
            };
          }

          // No URL → needs manual image selection
          return {
            name,
            imageUrl: "",
            status: "queued" as const,
          };
        })
        .filter((r) => r.name !== "");

      setSheetConfig({
        url: sheetUrl,
        spreadsheetId,
        tab: selectedTab,
        nameColIndex: nameIdx,
        headers,
      });
      setRows(rows);
      setStage(2);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const columnOptions = headers.map((h, i) => ({
    value: String(i),
    label: `${String.fromCharCode(65 + i)}: ${h}`,
  }));

  return (
    <Stack gap="sm">
      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      <TextInput
        label="Google Sheet URL"
        placeholder="https://docs.google.com/spreadsheets/d/..."
        value={sheetUrl}
        onChange={(e) => setSheetUrl(e.currentTarget.value)}
      />

      <Button onClick={handleFetchSheet} loading={loading} disabled={!sheetUrl}>
        Connect Sheet
      </Button>

      {tabs.length > 0 && (
        <Select
          label="Tab"
          data={tabs}
          value={selectedTab}
          onChange={handleTabChange}
        />
      )}

      {headers.length > 0 && (
        <>
          <Select
            label="Name column"
            placeholder="Select column with food names"
            data={columnOptions}
            value={nameCol}
            onChange={setNameCol}
          />

          <Select
            label="Image URL column (optional)"
            placeholder="Select column with existing image links"
            description="Drive links → skip. Other URLs → auto-fill for processing."
            data={columnOptions}
            value={imageCol}
            onChange={setImageCol}
            clearable
          />

          <Button
            onClick={handleLoadData}
            loading={loading}
            disabled={nameCol === null}
          >
            Load Data
          </Button>
        </>
      )}
    </Stack>
  );
}
