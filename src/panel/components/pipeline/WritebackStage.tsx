import { useState, useCallback } from "react";
import { Stack, Select, Switch, Button, Alert, Text, Card, Group } from "@mantine/core";
import { usePipelineStore } from "../../store/pipeline-store";
import { writeUrlsToSheet } from "../../../services/sheet-writer";
import { clearPipelineState } from "../../../services/pipeline-state";
import type { WritebackResult } from "../../../services/sheet-writer";

export function WritebackStage() {
  const pState = usePipelineStore((s) => s.state);
  const reset = usePipelineStore((s) => s.reset);

  const [targetCol, setTargetCol] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [writing, setWriting] = useState(false);
  const [result, setResult] = useState<WritebackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = pState.sheetConfig?.headers ?? [];
  const columnOptions = headers.map((h, i) => ({
    value: String(i),
    label: `${String.fromCharCode(65 + i)}: ${h}`,
  }));

  const rowsWithUrls = pState.rows.filter((r) => r.driveUrl);

  const handleWrite = useCallback(async () => {
    if (!pState.sheetConfig || targetCol === null) return;
    setWriting(true);
    setError(null);

    try {
      const urlMap = new Map<string, string>();
      for (const row of pState.rows) {
        if (row.driveUrl) {
          urlMap.set(row.name, row.driveUrl);
        }
      }

      const writeResult = await writeUrlsToSheet(
        pState.sheetConfig.spreadsheetId,
        pState.sheetConfig.tab,
        pState.sheetConfig.nameColIndex,
        parseInt(targetCol, 10),
        urlMap,
        overwrite
      );

      setResult(writeResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWriting(false);
    }
  }, [pState, targetCol, overwrite]);

  const handleDone = async () => {
    await clearPipelineState();
    reset();
  };

  return (
    <Stack gap="sm">
      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      {!result && (
        <>
          <Select
            label="Target column for Drive URLs"
            placeholder="Select column"
            data={columnOptions}
            value={targetCol}
            onChange={setTargetCol}
          />

          <Switch
            label="Overwrite existing values"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.currentTarget.checked)}
          />

          <Button
            onClick={handleWrite}
            loading={writing}
            disabled={targetCol === null}
            fullWidth
          >
            Write URLs ({rowsWithUrls.length} items)
          </Button>
        </>
      )}

      {result && (
        <Card withBorder>
          <Stack gap="xs">
            <Text fw={600} c="green">
              Write-back Complete
            </Text>
            <Group>
              <Text size="sm">Written: {result.written}</Text>
              <Text size="sm">Skipped: {result.skipped}</Text>
            </Group>
            {result.warnings.length > 0 && (
              <Alert color="yellow" title={`${result.warnings.length} warnings`}>
                {result.warnings.map((w, i) => (
                  <Text key={i} size="xs">
                    {w}
                  </Text>
                ))}
              </Alert>
            )}

            <Button onClick={handleDone} fullWidth>
              Done
            </Button>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
