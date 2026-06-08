import { useState, useCallback } from "react";
import {
  Stack,
  TextInput,
  Button,
  Progress,
  Text,
  Group,
  ScrollArea,
  Badge,
  Alert,
} from "@mantine/core";
import { usePipelineStore } from "../../store/pipeline-store";
import { parseFolderUrl, validateFolder, uploadAndShare } from "../../../services/drive";

export function DriveUploadStage() {
  const pState = usePipelineStore((s) => s.state);
  const updateRow = usePipelineStore((s) => s.updateRow);
  const setDriveFolderId = usePipelineStore((s) => s.setDriveFolderId);
  const setStage = usePipelineStore((s) => s.setStage);

  const [folderUrl, setFolderUrl] = useState("");
  const [folderName, setFolderName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processedRows = pState.rows.filter(
    (r) => r.status === "done" && r.processedBlob
  );

  const handleValidateFolder = async () => {
    setError(null);
    try {
      const folderId = parseFolderUrl(folderUrl);
      const name = await validateFolder(folderId);
      setFolderName(name);
      setDriveFolderId(folderId);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Track used filenames to handle duplicates
  const getUniqueFilename = (() => {
    const used = new Map<string, number>();
    return (name: string): string => {
      const base = name;
      const count = used.get(base.toLowerCase()) ?? 0;
      used.set(base.toLowerCase(), count + 1);
      if (count === 0) return `${base}.jpg`;
      return `${base} (${count + 1}).jpg`;
    };
  })();

  const handleUpload = useCallback(async () => {
    if (!pState.driveFolderId) return;
    setUploading(true);
    setError(null);

    for (let i = 0; i < pState.rows.length; i++) {
      const row = pState.rows[i]!;
      if (row.status !== "done" || !row.processedBlob) continue;

      updateRow(i, { status: "uploading" });

      try {
        const fileName = getUniqueFilename(row.name);
        const driveUrl = await uploadAndShare(
          pState.driveFolderId,
          fileName,
          row.processedBlob
        );
        updateRow(i, { status: "done", driveUrl });
      } catch (err) {
        updateRow(i, {
          status: "failed",
          error: `Upload failed: ${(err as Error).message}`,
        });
      }
    }

    setUploading(false);
    setDone(true);
  }, [pState.driveFolderId, pState.rows, updateRow]);

  const uploadedCount = pState.rows.filter((r) => r.driveUrl).length;
  const percent =
    processedRows.length > 0
      ? Math.round((uploadedCount / processedRows.length) * 100)
      : 0;

  return (
    <Stack gap="sm">
      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      {!uploading && !done && (
        <>
          <TextInput
            label="Google Drive Folder URL"
            placeholder="https://drive.google.com/drive/folders/..."
            value={folderUrl}
            onChange={(e) => setFolderUrl(e.currentTarget.value)}
          />

          {!folderName ? (
            <Button onClick={handleValidateFolder} disabled={!folderUrl}>
              Validate Folder
            </Button>
          ) : (
            <>
              <Text size="sm" c="green">
                Folder: {folderName}
              </Text>
              <Button onClick={handleUpload} fullWidth>
                Start Upload ({processedRows.length} images)
              </Button>
            </>
          )}
        </>
      )}

      {(uploading || done) && (
        <>
          <Progress value={percent} animated={uploading} />
          <Text size="sm">
            {uploadedCount}/{processedRows.length} uploaded
          </Text>

          <ScrollArea h={200}>
            {pState.rows
              .filter((r) => r.processedBlob || r.driveUrl)
              .map((row, i) => (
                <Group key={i} gap="xs" mb={4}>
                  <Text size="xs" style={{ flex: 1 }} truncate>
                    {row.name}
                  </Text>
                  <Badge
                    size="xs"
                    color={row.driveUrl ? "green" : row.status === "failed" ? "red" : "blue"}
                    variant="light"
                  >
                    {row.driveUrl ? "uploaded" : row.status}
                  </Badge>
                </Group>
              ))}
          </ScrollArea>

          {done && (
            <Button onClick={() => setStage(5)} fullWidth>
              Next: Write URLs to Sheet
            </Button>
          )}
        </>
      )}
    </Stack>
  );
}
