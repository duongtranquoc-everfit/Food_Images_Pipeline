import { useState, useCallback, useRef } from "react";
import { Container, Stack, Title, Alert, Loader } from "@mantine/core";
import { useFileParser } from "./hooks/useFileParser";
import { useJobRunner } from "./hooks/useJobRunner";
import { useJobStore } from "./store/job-store";
import { FileUpload } from "./components/FileUpload";
import { DataPreview } from "./components/DataPreview";
import { ConfigForm } from "./components/ConfigForm";
import { JobCard } from "./components/JobCard";
import { ConfirmModal } from "./components/ConfirmModal";

export function App() {
  const job = useJobStore((s) => s.job);
  const resetJobStore = useJobStore((s) => s.resetJob);

  const {
    parsedData,
    error: parseError,
    loading,
    handleFile,
    handleSheetChange,
    reset: resetParser,
  } = useFileParser();

  const jobRunner = useJobRunner();

  const [urlColumn, setUrlColumn] = useState<string | null>(null);
  const [nameColumn, setNameColumn] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<"stop" | "newjob" | null>(
    null
  );

  const fileRef = useRef<File | null>(null);
  const isJobActive = job.status === "running" || job.status === "paused";

  const handleFileSelected = useCallback(
    async (file: File) => {
      fileRef.current = file;
      setUrlColumn(null);
      setNameColumn(null);
      setSelectedSheet(null);
      await handleFile(file);
    },
    [handleFile]
  );

  const handleSheetSelected = useCallback(
    async (sheetName: string | null) => {
      if (!sheetName || !fileRef.current) return;
      setSelectedSheet(sheetName);
      setUrlColumn(null);
      setNameColumn(null);
      await handleSheetChange(fileRef.current, sheetName);
    },
    [handleSheetChange]
  );

  const handleSelectFolder = useCallback(async () => {
    try {
      const name = await jobRunner.selectFolder();
      setFolderName(name);
    } catch {
      // User cancelled picker
    }
  }, [jobRunner]);

  const startJob = useCallback(async () => {
    if (!parsedData || urlColumn === null || nameColumn === null) return;

    const urlIdx = parseInt(urlColumn, 10);
    const nameIdx = parseInt(nameColumn, 10);

    const files = parsedData.rows
      .map((row) => ({
        name: row[nameIdx] ?? "",
        url: row[urlIdx] ?? "",
      }))
      .filter((f) => f.name && f.url);

    if (files.length === 0) return;

    await jobRunner.start(files);
  }, [parsedData, urlColumn, nameColumn, jobRunner]);

  const handleStart = useCallback(() => {
    if (isJobActive) {
      setConfirmModal("newjob");
    } else {
      startJob();
    }
  }, [isJobActive, startJob]);

  const handleNewJob = useCallback(() => {
    if (isJobActive) {
      setConfirmModal("newjob");
    } else {
      jobRunner.reset();
      resetJobStore();
      resetParser();
      setUrlColumn(null);
      setNameColumn(null);
      setSelectedSheet(null);
      setFolderName(null);
      fileRef.current = null;
    }
  }, [isJobActive, jobRunner, resetJobStore, resetParser]);

  const handleConfirm = useCallback(() => {
    if (confirmModal === "stop") {
      jobRunner.stop();
    } else if (confirmModal === "newjob") {
      jobRunner.stop();
      jobRunner.reset();
      resetJobStore();
    }
    setConfirmModal(null);
  }, [confirmModal, jobRunner, resetJobStore]);

  return (
    <Container size="sm" p="md">
      <Title order={3} mb="md">
        Sheet Image Downloader
      </Title>

      <Stack gap="md">
        <FileUpload
          onFileSelected={handleFileSelected}
          disabled={isJobActive}
        />

        {loading && <Loader size="sm" />}

        {parseError && (
          <Alert color="red" title="Parse Error">
            {parseError}
          </Alert>
        )}

        {parsedData && (
          <>
            <ConfigForm
              data={parsedData}
              urlColumn={urlColumn}
              nameColumn={nameColumn}
              selectedSheet={selectedSheet}
              folderName={folderName}
              onUrlColumnChange={setUrlColumn}
              onNameColumnChange={setNameColumn}
              onSheetChange={handleSheetSelected}
              onSelectFolder={handleSelectFolder}
              onStart={handleStart}
              disabled={isJobActive}
            />

            <DataPreview
              data={parsedData}
              urlColumn={urlColumn !== null ? parseInt(urlColumn, 10) : null}
              nameColumn={
                nameColumn !== null ? parseInt(nameColumn, 10) : null
              }
            />
          </>
        )}

        {job.status !== "idle" && (
          <JobCard
            job={job}
            onPause={() => jobRunner.pause()}
            onResume={() => jobRunner.resume()}
            onStop={() => setConfirmModal("stop")}
            onNewJob={handleNewJob}
          />
        )}
      </Stack>

      <ConfirmModal
        opened={confirmModal === "stop"}
        title="Stop Job?"
        message="Stop current job? Files already saved will remain on disk."
        confirmLabel="Stop"
        confirmColor="red"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmModal(null)}
      />

      <ConfirmModal
        opened={confirmModal === "newjob"}
        title="Start New Job?"
        message="A job is in progress. Stop it and start a new one?"
        confirmLabel="Stop & Start New"
        confirmColor="orange"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    </Container>
  );
}
