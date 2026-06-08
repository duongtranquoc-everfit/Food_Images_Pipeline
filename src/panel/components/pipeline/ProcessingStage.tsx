import { useState, useCallback, useRef } from "react";
import {
  Stack,
  NumberInput,
  Button,
  Group,
  Progress,
  Text,
  ScrollArea,
  ThemeIcon,
  Badge,
  Switch,
  Alert,
} from "@mantine/core";
import { usePipelineStore } from "../../store/pipeline-store";
import { processImage } from "../../../services/image-pipeline";
import { checkNeoServer } from "../../../services/neo-server";

export function ProcessingStage() {
  const pState = usePipelineStore((s) => s.state);
  const updateRow = usePipelineStore((s) => s.updateRow);
  const setDimensions = usePipelineStore((s) => s.setDimensions);
  const setStage = usePipelineStore((s) => s.setStage);

  const [width, setWidth] = useState(pState.dimensions.width);
  const [height, setHeight] = useState(pState.dimensions.height);
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);
  const [enableBgRemoval, setEnableBgRemoval] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const rowsToProcess = pState.rows.filter((r) => r.imageUrl);

  const handleStart = useCallback(async () => {
    setServerError(null);
    const serverStatus = await checkNeoServer();
    if (!serverStatus.ok) {
      setServerError(serverStatus.message || "Neo server is not available");
      return;
    }

    // Decide once for this run (avoids stale enableBgRemoval after setState)
    let skipBgRemovalThisRun = !enableBgRemoval;
    if (enableBgRemoval && !serverStatus.bgRemovalAvailable) {
      skipBgRemovalThisRun = true;
      setEnableBgRemoval(false);
      setServerError("Neo/CDP not available — switched to resize-only mode");
    }

    setDimensions(width, height);
    setProcessing(true);
    setDone(false);
    abortRef.current = new AbortController();
    pausedRef.current = false;

    // Immutable snapshot: index + URL frozen at start — lag cannot mix URLs across rows.
    const snapshot = usePipelineStore
      .getState()
      .state.rows.map((row, rowIndex) => ({
        rowIndex,
        imageUrl: row.imageUrl,
      }))
      .filter((x): x is { rowIndex: number; imageUrl: string } =>
        Boolean(x.imageUrl)
      );

    for (const { rowIndex, imageUrl } of snapshot) {
      while (pausedRef.current) {
        await new Promise((r) => setTimeout(r, 300));
        if (abortRef.current?.signal.aborted) break;
      }
      if (abortRef.current?.signal.aborted) break;

      setCurrentIndex(rowIndex);
      updateRow(rowIndex, { status: "downloading" });

      try {
        const result = await processImage(imageUrl, {
          width,
          height,
          skipBgRemoval: skipBgRemovalThisRun,
          abortSignal: abortRef.current.signal,
          onStatus: (status) =>
            updateRow(rowIndex, { status: status as any }),
        });

        updateRow(rowIndex, {
          status: "done",
          processedBlob: result.blob,
          warning: result.warning,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") break;
        updateRow(rowIndex, {
          status: "failed",
          error: (err as Error).message,
        });
      }

      await new Promise((r) => setTimeout(r, 50));
    }

    setProcessing(false);
    setCurrentIndex(-1);
    if (!abortRef.current?.signal.aborted) {
      setDone(true);
    }
  }, [width, height, updateRow, setDimensions, enableBgRemoval]);

  const completedCount = pState.rows.filter((r) => r.status === "done").length;
  const failedCount = pState.rows.filter((r) => r.status === "failed").length;
  const percent =
    rowsToProcess.length > 0
      ? Math.round((completedCount / rowsToProcess.length) * 100)
      : 0;

  const statusIcon = (status: string) => {
    const map: Record<string, { icon: string; color: string }> = {
      queued: { icon: "...", color: "gray" },
      downloading: { icon: "↓", color: "blue" },
      "removing-bg": { icon: "✂", color: "violet" },
      resizing: { icon: "⟲", color: "cyan" },
      done: { icon: "✓", color: "green" },
      failed: { icon: "✗", color: "red" },
    };
    return map[status] ?? map.queued!;
  };

  return (
    <Stack gap="sm">
      {!processing && !done && (
        <>
          <Group grow>
            <NumberInput
              label="Width (px)"
              value={width}
              onChange={(v) => setWidth(Number(v) || 1000)}
              min={100}
              max={4000}
            />
            <NumberInput
              label="Height (px)"
              value={height}
              onChange={(v) => setHeight(Number(v) || 650)}
              min={100}
              max={4000}
            />
          </Group>

          <Switch
            label="Remove background (via remove.bg)"
            description="Opens remove.bg in background tab to process each image"
            checked={enableBgRemoval}
            onChange={(e) => setEnableBgRemoval(e.currentTarget.checked)}
          />

          {enableBgRemoval && (
            <Alert color="blue" variant="light">
              Background removal uses Neo server + remove.bg. Make sure the server is running: bun neo-server.ts
            </Alert>
          )}

          {serverError && (
            <Alert color="red" variant="light" title="Server Error">
              {serverError}
            </Alert>
          )}

          <Button onClick={handleStart} fullWidth>
            Start Processing ({rowsToProcess.length} images)
          </Button>
        </>
      )}

      {(processing || done) && (
        <>
          <Progress value={percent} animated={processing} />
          <Group justify="space-between">
            <Text size="sm">
              {completedCount}/{rowsToProcess.length}
              {failedCount > 0 && (
                <Text span c="red">
                  {" "}
                  ({failedCount} failed)
                </Text>
              )}
            </Text>
            <Text size="sm" c="dimmed">{percent}%</Text>
          </Group>

          {processing && (
            <Group>
              <Button
                size="xs"
                color="yellow"
                variant="light"
                onClick={() => (pausedRef.current = !pausedRef.current)}
              >
                {pausedRef.current ? "Resume" : "Pause"}
              </Button>
              <Button
                size="xs"
                color="red"
                variant="light"
                onClick={() => abortRef.current?.abort()}
              >
                Stop
              </Button>
            </Group>
          )}

          <ScrollArea h={200}>
            {pState.rows
              .map((row, rowIndex) => ({ row, rowIndex }))
              .filter(({ row }) => row.imageUrl)
              .map(({ row, rowIndex }) => {
                const info = statusIcon(row.status);
                return (
                  <Group key={rowIndex} gap="xs" mb={4}>
                    <ThemeIcon
                      size="xs"
                      color={info.color}
                      variant="light"
                      radius="xl"
                    >
                      <Text size="xs" lh={1}>
                        {info.icon}
                      </Text>
                    </ThemeIcon>
                    <Text size="xs" style={{ flex: 1 }} truncate>
                      {row.name}
                    </Text>
                    <Badge size="xs" color={info.color} variant="light">
                      {row.status}
                    </Badge>
                    {row.warning && (
                      <Badge size="xs" color="yellow" variant="light">
                        warning
                      </Badge>
                    )}
                  </Group>
                );
              })}
          </ScrollArea>

          {done && (
            <Button onClick={() => setStage(4)} fullWidth>
              Next: Upload to Drive
            </Button>
          )}
        </>
      )}
    </Stack>
  );
}
