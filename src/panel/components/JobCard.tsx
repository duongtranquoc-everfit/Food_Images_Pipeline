import { Card, Progress, Text, Group, Badge } from "@mantine/core";
import type { JobState } from "../../shared/types";
import { JobControls } from "./JobControls";
import { FileProgress } from "./FileProgress";

interface JobCardProps {
  job: JobState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNewJob: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  running: "blue",
  paused: "yellow",
  stopped: "red",
  completed: "green",
};

export function JobCard({ job, onPause, onResume, onStop, onNewJob }: JobCardProps) {
  const percent =
    job.totalFiles > 0
      ? Math.round((job.completedFiles / job.totalFiles) * 100)
      : 0;

  return (
    <Card withBorder shadow="sm" radius="md">
      <Group justify="space-between" mb="xs">
        <Text fw={500}>Current Job</Text>
        <Badge color={STATUS_COLORS[job.status] ?? "gray"}>
          {job.status}
        </Badge>
      </Group>

      <Progress value={percent} mb="xs" animated={job.status === "running"} />

      <Group justify="space-between" mb="xs">
        <Text size="sm">
          {job.completedFiles}/{job.totalFiles} files
          {job.failedFiles > 0 && (
            <Text span c="red" size="sm">
              {" "}({job.failedFiles} failed)
            </Text>
          )}
        </Text>
        <Text size="sm" c="dimmed">
          {percent}%
        </Text>
      </Group>

      {job.currentFile && (
        <Text size="xs" c="dimmed" mb="xs">
          Processing: {job.currentFile}
        </Text>
      )}

      <JobControls
        status={job.status}
        onPause={onPause}
        onResume={onResume}
        onStop={onStop}
        onNewJob={onNewJob}
      />

      <FileProgress files={job.files} />
    </Card>
  );
}
