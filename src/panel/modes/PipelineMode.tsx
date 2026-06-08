import { useEffect, useState } from "react";
import { Stack, Stepper, Card, Text, Group, Button } from "@mantine/core";
import { usePipelineStore } from "../store/pipeline-store";
import {
  loadPipelineState,
  clearPipelineState,
} from "../../services/pipeline-state";
import { getAuthToken } from "../../services/google-auth";
import { GoogleSignIn } from "../components/pipeline/GoogleSignIn";
import { SheetConfig } from "../components/pipeline/SheetConfig";
import { ImageSelectionTable } from "../components/pipeline/ImageSelectionTable";
import { ProcessingStage } from "../components/pipeline/ProcessingStage";
import { DriveUploadStage } from "../components/pipeline/DriveUploadStage";
import { WritebackStage } from "../components/pipeline/WritebackStage";

export function PipelineMode() {
  const pState = usePipelineStore((s) => s.state);
  const authenticated = usePipelineStore((s) => s.authenticated);
  const setAuthenticated = usePipelineStore((s) => s.setAuthenticated);
  const loadState = usePipelineStore((s) => s.loadState);
  const reset = usePipelineStore((s) => s.reset);

  const [showResume, setShowResume] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Check auth and saved state on mount
  useEffect(() => {
    const init = async () => {
      // Check if already authenticated
      try {
        await getAuthToken(false);
        setAuthenticated(true);
      } catch {
        // Not authenticated
      }

      // Check for saved state
      const saved = await loadPipelineState();
      if (saved && saved.rows.length > 0) {
        setShowResume(true);
        // Store for potential resume
        (window as any).__savedPipelineState = saved;
      }

      setLoaded(true);
    };
    init();
  }, [setAuthenticated]);

  const handleResume = () => {
    const saved = (window as any).__savedPipelineState;
    if (saved) loadState(saved);
    setShowResume(false);
  };

  const handleStartNew = async () => {
    await clearPipelineState();
    reset();
    setShowResume(false);
  };

  if (!loaded) return null;

  // Resume prompt
  if (showResume) {
    return (
      <Card withBorder p="lg">
        <Stack gap="md" align="center">
          <Text fw={500}>Continue previous session?</Text>
          <Text size="sm" c="dimmed">
            Found saved progress from a previous pipeline run.
          </Text>
          <Group>
            <Button onClick={handleResume}>Resume</Button>
            <Button variant="light" color="gray" onClick={handleStartNew}>
              Start New
            </Button>
          </Group>
        </Stack>
      </Card>
    );
  }

  // Auth gate
  if (!authenticated) {
    return (
      <Stack gap="md" align="center" mt="xl">
        <Text>Sign in to access Google Sheets & Drive</Text>
        <GoogleSignIn />
      </Stack>
    );
  }

  const activeStep = pState.stage - 1; // Stepper is 0-based

  return (
    <Stack gap="md">
      <GoogleSignIn />

      <Stepper
        active={activeStep}
        size="xs"
        onStepClick={(step) => {
          // Allow navigating back to any completed step
          if (step < activeStep) {
            usePipelineStore.getState().setStage((step + 1) as any);
          }
        }}
      >
        <Stepper.Step label="Sheet" description="Connect">
          <SheetConfig />
        </Stepper.Step>

        <Stepper.Step label="Select" description="Find images">
          <ImageSelectionTable />
        </Stepper.Step>

        <Stepper.Step label="Process" description="Resize & BG">
          <ProcessingStage />
        </Stepper.Step>

        <Stepper.Step label="Upload" description="Google Drive">
          <DriveUploadStage />
        </Stepper.Step>

        <Stepper.Step label="Write" description="URLs to Sheet">
          <WritebackStage />
        </Stepper.Step>
      </Stepper>
    </Stack>
  );
}
