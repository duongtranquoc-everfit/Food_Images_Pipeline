import { Group, Button } from "@mantine/core";
import type { JobStatus } from "../../shared/types";

interface JobControlsProps {
  status: JobStatus;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNewJob: () => void;
}

export function JobControls({
  status,
  onPause,
  onResume,
  onStop,
  onNewJob,
}: JobControlsProps) {
  if (status === "completed" || status === "stopped") {
    return (
      <Group mb="xs">
        <Button size="xs" onClick={onNewJob}>
          New Job
        </Button>
      </Group>
    );
  }

  if (status === "paused") {
    return (
      <Group mb="xs">
        <Button size="xs" color="blue" onClick={onResume}>
          Resume
        </Button>
        <Button size="xs" color="red" variant="light" onClick={onStop}>
          Stop
        </Button>
      </Group>
    );
  }

  if (status === "running") {
    return (
      <Group mb="xs">
        <Button size="xs" color="yellow" variant="light" onClick={onPause}>
          Pause
        </Button>
        <Button size="xs" color="red" variant="light" onClick={onStop}>
          Stop
        </Button>
      </Group>
    );
  }

  return null;
}
