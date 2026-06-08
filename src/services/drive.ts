import { googleFetch } from "./google-api";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export function parseFolderUrl(url: string): string {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (!match?.[1]) {
    throw new Error("Invalid Google Drive folder URL");
  }
  return match[1];
}

export async function validateFolder(folderId: string): Promise<string> {
  const response = await googleFetch(
    `${DRIVE_API}/files/${folderId}?fields=id,name,mimeType`
  );
  const data = await response.json();
  if (data.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("URL does not point to a folder");
  }
  return data.name;
}

export async function uploadFile(
  folderId: string,
  fileName: string,
  blob: Blob
): Promise<string> {
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", blob);

  const response = await googleFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`,
    { method: "POST", body: form }
  );

  const data = await response.json();
  return data.id;
}

export async function setPublicPermission(fileId: string): Promise<void> {
  await googleFetch(`${DRIVE_API}/files/${fileId}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

export function getViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export async function uploadAndShare(
  folderId: string,
  fileName: string,
  blob: Blob,
  retry = true
): Promise<string> {
  try {
    const fileId = await uploadFile(folderId, fileName, blob);
    await setPublicPermission(fileId);
    return getViewUrl(fileId);
  } catch (err) {
    if (retry) {
      // Retry once
      return uploadAndShare(folderId, fileName, blob, false);
    }
    throw err;
  }
}
