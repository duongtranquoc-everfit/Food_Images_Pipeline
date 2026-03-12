import { ScrollArea, Text, Group, ThemeIcon } from "@mantine/core";
import type { FileTask } from "../../shared/types";

interface FileProgressProps {
  files: FileTask[];
}

const STATUS_ICON: Record<string, { icon: string; color: string }> = {
  queued: { icon: "...", color: "gray" },
  downloading: { icon: "↓", color: "blue" },
  resizing: { icon: "⟲", color: "cyan" },
  saving: { icon: "↑", color: "indigo" },
  done: { icon: "✓", color: "green" },
  failed: { icon: "✗", color: "red" },
};

export function FileProgress({ files }: FileProgressProps) {
  if (files.length === 0) return null;

  return (
    <ScrollArea h={200} mt="xs">
      {files.map((file, i) => {
        const info = STATUS_ICON[file.status] ?? STATUS_ICON.queued!;
        return (
          <Group key={i} gap="xs" mb={4}>
            <ThemeIcon size="xs" color={info.color} variant="light" radius="xl">
              <Text size="xs" lh={1}>
                {info.icon}
              </Text>
            </ThemeIcon>
            <Text size="xs" style={{ flex: 1 }} truncate>
              {file.name}
            </Text>
            <Text size="xs" c="dimmed">
              {file.status}
            </Text>
            {file.error && (
              <Text size="xs" c="red" truncate maw={120}>
                {file.error}
              </Text>
            )}
          </Group>
        );
      })}
    </ScrollArea>
  );
}
