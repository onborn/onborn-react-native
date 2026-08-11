export interface PersistentUiIrStoragePort {
  ensureDirectory(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  list(path: string): Promise<string[]>;
  move(sourcePath: string, destinationPath: string): Promise<void>;
  readBytes(path: string): Promise<Uint8Array>;
  readText(path: string): Promise<string>;
  remove(path: string): Promise<void>;
  uri(path: string): string;
  writeBytes(path: string, bytes: Uint8Array): Promise<void>;
  writeText(path: string, value: string): Promise<void>;
}
