import { Select, Button, Group, Text, Stack } from "@mantine/core";
import type { ParsedData } from "../../shared/types";

interface ConfigFormProps {
  data: ParsedData;
  urlColumn: string | null;
  nameColumn: string | null;
  selectedSheet: string | null;
  folderName: string | null;
  onUrlColumnChange: (value: string | null) => void;
  onNameColumnChange: (value: string | null) => void;
  onSheetChange: (value: string | null) => void;
  onSelectFolder: () => void;
  onStart: () => void;
  disabled?: boolean;
}

export function ConfigForm({
  data,
  urlColumn,
  nameColumn,
  selectedSheet,
  folderName,
  onUrlColumnChange,
  onNameColumnChange,
  onSheetChange,
  onSelectFolder,
  onStart,
  disabled,
}: ConfigFormProps) {
  const columnOptions = data.headers.map((h, i) => ({
    value: String(i),
    label: `${String.fromCharCode(65 + i)}: ${h}`,
  }));

  const sheetOptions = data.sheetNames?.map((name) => ({
    value: name,
    label: name,
  }));

  const canStart = urlColumn !== null && nameColumn !== null && folderName !== null;

  return (
    <Stack gap="sm">
      {sheetOptions && sheetOptions.length > 1 && (
        <Select
          label="Sheet"
          data={sheetOptions}
          value={selectedSheet}
          onChange={onSheetChange}
          disabled={disabled}
        />
      )}

      <Group grow>
        <Select
          label="Column for URL"
          placeholder="Select column"
          data={columnOptions}
          value={urlColumn}
          onChange={onUrlColumnChange}
          disabled={disabled}
        />
        <Select
          label="Column for filename"
          placeholder="Select column"
          data={columnOptions}
          value={nameColumn}
          onChange={onNameColumnChange}
          disabled={disabled}
        />
      </Group>

      <Group>
        <Button variant="light" onClick={onSelectFolder} disabled={disabled}>
          Select folder
        </Button>
        {folderName && (
          <Text size="sm" c="dimmed">
            {folderName}/Images_Single_Ingredient/
          </Text>
        )}
      </Group>

      <Button fullWidth onClick={onStart} disabled={!canStart || disabled}>
        Start Download
      </Button>
    </Stack>
  );
}
