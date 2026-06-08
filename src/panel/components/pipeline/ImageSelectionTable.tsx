import { useState, useEffect, useCallback, useRef } from "react";
import { Table, ScrollArea, Text, Button, Stack, Badge, ActionIcon, Tooltip, Group } from "@mantine/core";
import { usePipelineStore } from "../../store/pipeline-store";
import { ConfirmModal } from "../ConfirmModal";
import { MSG } from "../../../shared/constants";

function clampRowIndex(index: number, rowCount: number): number {
  if (rowCount <= 0) return 0;
  return Math.max(0, Math.min(index, rowCount - 1));
}

export function ImageSelectionTable() {
  const rows = usePipelineStore((s) => s.state.rows);
  const updateRow = usePipelineStore((s) => s.updateRow);
  const setStage = usePipelineStore((s) => s.setStage);

  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const first = rows.findIndex((r) => !r.imageUrl);
    return first >= 0 ? first : 0;
  });

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const [pendingCapture, setPendingCapture] = useState<{
    index: number;
    url: string;
  } | null>(null);

  // Keep service worker + session storage in sync with the selected row (no stale closure on capture).
  useEffect(() => {
    chrome.runtime
      .sendMessage({
        type: MSG.SET_CAPTURE_TARGET_ROW,
        index: activeIndex,
      })
      .catch(() => {});
    void chrome.storage.session.set({ captureTargetRowIndex: activeIndex });
  }, [activeIndex]);

  const advanceToNextEmpty = useCallback((fromIndex: number) => {
    const r = usePipelineStore.getState().state.rows;
    for (let i = fromIndex + 1; i < r.length; i++) {
      if (!r[i]?.imageUrl) {
        setActiveIndex(i);
        return;
      }
    }
  }, []);

  // Single listener: use payload.rowIndex from SW (stamped before inject) + fresh store state.
  useEffect(() => {
    const listener = (message: {
      type: string;
      payload?: { url: string; rowIndex?: number };
    }) => {
      if (message.type !== MSG.IMAGE_CAPTURED || !message.payload?.url) return;

      const url = message.payload.url;
      const storeRows = usePipelineStore.getState().state.rows;
      if (storeRows.length === 0) return;

      let targetIndex = message.payload.rowIndex;
      if (typeof targetIndex !== "number" || Number.isNaN(targetIndex)) {
        targetIndex = activeIndexRef.current;
      }
      targetIndex = clampRowIndex(targetIndex, storeRows.length);

      const row = storeRows[targetIndex];

      if (row?.imageUrl) {
        setPendingCapture({ index: targetIndex, url });
      } else {
        usePipelineStore.getState().updateRow(targetIndex, { imageUrl: url });
        advanceToNextEmpty(targetIndex);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [advanceToNextEmpty]);

  const handleConfirmReplace = () => {
    if (pendingCapture) {
      updateRow(pendingCapture.index, { imageUrl: pendingCapture.url });
      advanceToNextEmpty(pendingCapture.index);
      setPendingCapture(null);
    }
  };

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyName = useCallback(async (name: string, index: number) => {
    await navigator.clipboard.writeText(name);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }, []);

  const driveCount = rows.filter((r) => r.status === "done" && r.driveUrl).length;
  const filledCount = rows.filter((r) => r.imageUrl).length;
  const canProceed = filledCount > 0;

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Right-click any image on any webpage → "Use this image"
      </Text>

      <Group gap="xs">
        <Badge variant="light">
          {filledCount}/{rows.length} images selected
        </Badge>
        {driveCount > 0 && (
          <Badge variant="light" color="green">
            {driveCount} already on Drive
          </Badge>
        )}
      </Group>

      <ScrollArea h={350}>
        <Table striped highlightOnHover withTableBorder fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}>#</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Image URL</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row, i) => (
              <Table.Tr
                key={i}
                onClick={() => setActiveIndex(i)}
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    i === activeIndex
                      ? "var(--mantine-color-blue-1)"
                      : undefined,
                }}
              >
                <Table.Td>{i + 1}</Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Tooltip label={copiedIndex === i ? "Copied!" : "Copy"} withArrow position="left">
                      <ActionIcon
                        size="sm"
                        variant={copiedIndex === i ? "filled" : "light"}
                        color={copiedIndex === i ? "green" : "blue"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyName(row.name, i);
                        }}
                      >
                        <Text size="xs" lh={1}>{copiedIndex === i ? "✓" : "⎘"}</Text>
                      </ActionIcon>
                    </Tooltip>
                    <Text size="xs" style={{ flex: 1 }} truncate>{row.name}</Text>
                  </Group>
                </Table.Td>
                <Table.Td
                  style={{
                    maxWidth: 180,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.status === "done" && row.driveUrl ? (
                    <Badge size="xs" color="green" variant="light">Drive ✓</Badge>
                  ) : row.imageUrl ? (
                    <Text size="xs" c="green">
                      {row.imageUrl}
                    </Text>
                  ) : (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Button onClick={() => setStage(3)} disabled={!canProceed} fullWidth>
        Done & Next Step
      </Button>

      <ConfirmModal
        opened={pendingCapture !== null}
        title="Replace Image?"
        message={`Replace existing image for "${rows[pendingCapture?.index ?? 0]?.name}"?`}
        confirmLabel="Replace"
        confirmColor="orange"
        onConfirm={handleConfirmReplace}
        onCancel={() => setPendingCapture(null)}
      />
    </Stack>
  );
}
