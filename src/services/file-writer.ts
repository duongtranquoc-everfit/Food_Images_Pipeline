import { OUTPUT_FOLDER_NAME } from "../shared/constants";

const INVALID_CHARS = /[/\\:*?"<>|]/g;

function sanitizeFilename(name: string): string {
  return name.replace(INVALID_CHARS, "_").trim();
}

export class FileWriter {
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private outputDir: FileSystemDirectoryHandle | null = null;
  private usedNames = new Set<string>();

  async selectFolder(): Promise<string> {
    this.dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
    return this.dirHandle!.name;
  }

  async initOutputFolder(): Promise<void> {
    if (!this.dirHandle) {
      throw new Error("No folder selected. Call selectFolder() first.");
    }
    this.outputDir = await this.dirHandle.getDirectoryHandle(
      OUTPUT_FOLDER_NAME,
      { create: true }
    );
    this.usedNames.clear();
  }

  private getUniqueFilename(baseName: string, ext: string): string {
    let candidate = `${baseName}${ext}`;
    if (!this.usedNames.has(candidate.toLowerCase())) {
      this.usedNames.add(candidate.toLowerCase());
      return candidate;
    }

    let counter = 2;
    while (true) {
      candidate = `${baseName} (${counter})${ext}`;
      if (!this.usedNames.has(candidate.toLowerCase())) {
        this.usedNames.add(candidate.toLowerCase());
        return candidate;
      }
      counter++;
    }
  }

  async writeFile(name: string, data: Buffer | Uint8Array): Promise<string> {
    if (!this.outputDir) {
      throw new Error("Output folder not initialized. Call initOutputFolder() first.");
    }

    const sanitized = sanitizeFilename(name);
    const filename = this.getUniqueFilename(sanitized, ".jpg");

    const fileHandle = await this.outputDir.getFileHandle(filename, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();

    return filename;
  }

  reset(): void {
    this.outputDir = null;
    this.usedNames.clear();
  }
}
