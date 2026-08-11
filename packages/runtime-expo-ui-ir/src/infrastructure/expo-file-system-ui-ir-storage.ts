import { Directory, File, Paths } from "expo-file-system";

import type { PersistentUiIrStoragePort } from "../ports/persistent-ui-ir-storage";

export class ExpoFileSystemUiIrStorage
  implements PersistentUiIrStoragePort
{
  private readonly root: Directory;

  constructor(directoryName = "onborn-builder-v2-ui-ir") {
    this.root = new Directory(Paths.document, directoryName);
    this.root.create({ idempotent: true, intermediates: true });
  }

  async ensureDirectory(path: string): Promise<void> {
    this.directory(path).create({ idempotent: true, intermediates: true });
  }

  async exists(path: string): Promise<boolean> {
    return Paths.info(this.pathUri(path)).exists;
  }

  async list(path: string): Promise<string[]> {
    const directory = this.directory(path);
    return directory.exists ? directory.list().map((entry) => entry.name) : [];
  }

  async move(sourcePath: string, destinationPath: string): Promise<void> {
    const sourceInfo = Paths.info(this.pathUri(sourcePath));
    if (!sourceInfo.exists) {
      throw new Error(`Missing UI IR storage source "${sourcePath}".`);
    }
    this.directory(parentPath(destinationPath)).create({
      idempotent: true,
      intermediates: true,
    });
    if (sourceInfo.isDirectory) {
      await this.directory(sourcePath).move(this.directory(destinationPath));
      return;
    }
    await this.file(sourcePath).move(this.file(destinationPath));
  }

  async readBytes(path: string): Promise<Uint8Array> {
    return (isFileUri(path) ? new File(path) : this.file(path)).bytes();
  }

  async readText(path: string): Promise<string> {
    return this.file(path).text();
  }

  async remove(path: string): Promise<void> {
    const info = Paths.info(this.pathUri(path));
    if (!info.exists) return;
    if (info.isDirectory) {
      this.directory(path).delete();
      return;
    }
    this.file(path).delete();
  }

  uri(path: string): string {
    return this.file(path).uri;
  }

  async writeBytes(path: string, bytes: Uint8Array): Promise<void> {
    this.prepareFile(path).write(bytes);
  }

  async writeText(path: string, value: string): Promise<void> {
    this.prepareFile(path).write(value);
  }

  private prepareFile(path: string): File {
    const file = this.file(path);
    file.parentDirectory.create({ idempotent: true, intermediates: true });
    file.create({ intermediates: true, overwrite: true });
    return file;
  }

  private directory(path: string): Directory {
    return new Directory(this.root, ...pathSegments(path));
  }

  private file(path: string): File {
    return new File(this.root, ...pathSegments(path));
  }

  private pathUri(path: string): string {
    return new File(this.root, ...pathSegments(path)).uri;
  }
}

function pathSegments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function parentPath(path: string): string {
  return pathSegments(path).slice(0, -1).join("/");
}

function isFileUri(value: string): boolean {
  return value.startsWith("file://");
}
