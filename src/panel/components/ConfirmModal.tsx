import { Modal, Text, Group, Button } from "@mantine/core";

interface ConfirmModalProps {
  opened: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  opened,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "red",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal opened={opened} onClose={onCancel} title={title} centered size="sm">
      <Text size="sm" mb="lg">
        {message}
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button color={confirmColor} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}
