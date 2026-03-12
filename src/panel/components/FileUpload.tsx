import { Group, Text, rem } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_MIME = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export function FileUpload({ onFileSelected, disabled }: FileUploadProps) {
  return (
    <Dropzone
      onDrop={(files) => {
        if (files[0]) onFileSelected(files[0]);
      }}
      accept={ACCEPTED_MIME}
      maxFiles={1}
      disabled={disabled}
      styles={{
        root: {
          minHeight: rem(120),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      <Group justify="center" gap="sm" style={{ pointerEvents: "none" }}>
        <div>
          <Text size="lg" inline ta="center">
            Drop CSV or XLSX file here
          </Text>
          <Text size="sm" c="dimmed" inline mt={7} ta="center">
            or click to browse
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
}
