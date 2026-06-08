import { useState, useCallback, useRef } from "react";
import {
  Stack,
  Button,
  Text,
  Timeline,
  ThemeIcon,
  Code,
  Image,
  Group,
  FileButton,
  Textarea,
  Collapse,
} from "@mantine/core";

type StepStatus = "idle" | "running" | "done" | "failed";

interface Step {
  label: string;
  status: StepStatus;
  detail?: string;
}

export function RemoveBgTest() {
  const [file, setFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [debugReport, setDebugReport] = useState<string | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const resetRef = useRef<() => void>(null);

  const handleFileSelect = useCallback((f: File | null) => {
    if (!f) return;
    setFile(f);
    setResultPreview(null);
    setSteps([]);
    // Preview original
    const url = URL.createObjectURL(f);
    setOriginalPreview(url);
  }, []);

  const updateStep = (index: number, updates: Partial<Step>) => {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...updates };
      return next;
    });
  };

  const runTest = useCallback(async () => {
    if (!file) return;

    setRunning(true);
    setResultPreview(null);
    setSteps([
      { label: "Read local file", status: "idle" },
      { label: "Convert to base64", status: "idle" },
      { label: "Open remove.bg tab", status: "idle" },
      { label: "Inject content script", status: "idle" },
      { label: "Upload to remove.bg", status: "idle" },
      { label: "Wait for result", status: "idle" },
      { label: "Download result", status: "idle" },
    ]);

    try {
      // Step 0: Read file
      updateStep(0, { status: "running" });
      const arrayBuffer = await file.arrayBuffer();
      updateStep(0, {
        status: "done",
        detail: `${file.name} — ${(arrayBuffer.byteLength / 1024).toFixed(0)}KB`,
      });

      // Step 1: Convert to base64
      updateStep(1, { status: "running" });
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
      }
      const imageBase64 = btoa(binary);
      updateStep(1, {
        status: "done",
        detail: `${(imageBase64.length / 1024).toFixed(0)}KB base64`,
      });

      // Steps 2-6: Service Worker handles open tab → inject → upload → wait → download
      updateStep(2, { status: "running" });

      const response = await Promise.race([
        chrome.runtime.sendMessage({
          type: "REMOVEBG_TEST",
          imageBase64,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timed out after 120s")), 120000)
        ),
      ]);

      // Map SW step results to UI steps (SW steps 0-5 → UI steps 2-6)
      if (response?.steps) {
        for (const [idx, step] of Object.entries(response.steps) as [
          string,
          { ok: boolean; detail: string },
        ][]) {
          const uiIdx = Number(idx) + 2;
          if (uiIdx <= 6) {
            updateStep(uiIdx, {
              status: step.ok ? "done" : "failed",
              detail: step.detail,
            });
          }
        }
      }

      if (response?.ok && response?.data) {
        setResultPreview(`data:image/png;base64,${response.data}`);
        // Mark any remaining idle steps as done
        setSteps((prev) =>
          prev.map((s) => (s.status === "idle" ? { ...s, status: "done" as StepStatus } : s))
        );
      } else {
        const errorMsg = response?.error ?? "Unknown error";
        setSteps((prev) =>
          prev.map((s) =>
            s.status === "running" || s.status === "idle"
              ? { ...s, status: s.status === "running" ? ("failed" as StepStatus) : s.status, detail: s.status === "running" ? errorMsg : s.detail }
              : s
          )
        );
      }
    } catch (err) {
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "running"
            ? { ...s, status: "failed" as StepStatus, detail: (err as Error).message }
            : s
        )
      );
    }

    setRunning(false);
  }, [file]);

  const statusColor = (s: StepStatus) =>
    ({ done: "green", failed: "red", running: "blue", idle: "gray" })[s];

  const statusIcon = (s: StepStatus) =>
    ({ done: "✓", failed: "✗", running: "⟳", idle: "·" })[s];

  const runDebug = useCallback(async () => {
    setDebugLoading(true);
    setDebugReport(null);
    try {
      const resp = await chrome.runtime.sendMessage({ type: "REMOVEBG_DEBUG" });
      setDebugReport(resp?.ok ? resp.report : `Error: ${resp?.error}`);
    } catch (err) {
      setDebugReport(`Exception: ${(err as Error).message}`);
    }
    setDebugLoading(false);
  }, []);

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Chọn ảnh từ máy → đẩy qua remove.bg → xem kết quả
      </Text>

      {/* File picker */}
      <Group>
        <FileButton onChange={handleFileSelect} accept="image/*" resetRef={resetRef}>
          {(props) => (
            <Button variant="light" {...props}>
              {file ? file.name : "Chọn ảnh từ máy"}
            </Button>
          )}
        </FileButton>
        {file && (
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            onClick={() => {
              setFile(null);
              setOriginalPreview(null);
              setResultPreview(null);
              setSteps([]);
              resetRef.current?.();
            }}
          >
            Clear
          </Button>
        )}
      </Group>

      {/* Original preview */}
      {originalPreview && (
        <Image
          src={originalPreview}
          maw={200}
          mah={200}
          fit="contain"
          radius="sm"
          style={{ border: "1px solid #ddd" }}
        />
      )}

      {/* Run button */}
      <Button
        onClick={runTest}
        loading={running}
        disabled={!file}
        fullWidth
      >
        {running ? "Đang xử lý..." : "Test remove.bg"}
      </Button>

      {/* Step timeline */}
      {steps.length > 0 && (
        <Timeline
          active={steps.filter((s) => s.status === "done").length - 1}
          bulletSize={24}
          lineWidth={2}
        >
          {steps.map((step, i) => (
            <Timeline.Item
              key={i}
              bullet={
                <ThemeIcon
                  size={24}
                  radius="xl"
                  color={statusColor(step.status)}
                  variant={step.status === "idle" ? "light" : "filled"}
                >
                  <Text size="xs" lh={1}>
                    {statusIcon(step.status)}
                  </Text>
                </ThemeIcon>
              }
              title={
                <Text size="sm" fw={step.status === "running" ? 700 : 400}>
                  {step.label}
                </Text>
              }
            >
              {step.detail && (
                <Code
                  block={step.status === "failed"}
                  color={statusColor(step.status)}
                  style={{ fontSize: 11 }}
                >
                  {step.detail}
                </Code>
              )}
            </Timeline.Item>
          ))}
        </Timeline>
      )}

      {/* Before / After */}
      {resultPreview && (
        <Stack gap="xs">
          <Text fw={600} size="sm">Result:</Text>
          <Group align="flex-start">
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed">Original</Text>
              <Image
                src={originalPreview!}
                w={150}
                h={150}
                fit="contain"
                radius="sm"
                style={{ border: "1px solid #ddd" }}
              />
            </Stack>
            <Text size="xl" mt={70}>→</Text>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed">BG Removed</Text>
              <Image
                src={resultPreview}
                w={150}
                h={150}
                fit="contain"
                radius="sm"
                style={{ border: "1px solid #ddd", background: "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 16px 16px" }}
              />
            </Stack>
          </Group>
        </Stack>
      )}

      {/* Debug section */}
      <Button
        variant="subtle"
        color="gray"
        size="xs"
        onClick={runDebug}
        loading={debugLoading}
      >
        Debug: Inspect remove.bg page DOM
      </Button>
      {debugReport && (
        <Textarea
          value={debugReport}
          readOnly
          autosize
          minRows={8}
          maxRows={20}
          styles={{ input: { fontFamily: "monospace", fontSize: 11 } }}
        />
      )}
    </Stack>
  );
}
