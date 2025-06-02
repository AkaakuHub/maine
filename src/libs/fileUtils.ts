import path from 'node:path'
import { promises as fs } from 'node:fs'

/**
 * クロスプラットフォーム対応のファイルパス正規化
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/')
}

/**
 * ファイルパスからファイル名を取得
 */
export function getFileName(filePath: string): string {
  return path.basename(filePath)
}

/**
 * ファイルパスから拡張子を取得
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase()
}

/**
 * 動画ファイルの拡張子かチェック
 */
export function isVideoFile(filePath: string): boolean {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v']
  return videoExtensions.includes(getFileExtension(filePath))
}

/**
 * ディレクトリの存在確認
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath)
    return stats.isDirectory()
  } catch {
    return false
  }
}

/**
 * ファイルの存在確認
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath)
    return stats.isFile()
  } catch {
    return false
  }
}

/**
 * ファイルサイズを取得
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath)
    return stats.size
  } catch {
    return 0
  }
}

/**
 * 相対パスを安全に処理（ディレクトリトラバーサル攻撃防止）
 */
export function sanitizePath(userPath: string, basePath: string): string | null {
  const resolvedPath = path.resolve(basePath, userPath)
  const normalizedBasePath = path.resolve(basePath)
  
  // ベースパス外へのアクセスを防ぐ
  if (!resolvedPath.startsWith(normalizedBasePath)) {
    return null
  }
  
  return resolvedPath
}

/**
 * セキュアなファイルパス検証結果の型
 */
export interface FilePathValidation {
  isValid: boolean;
  fullPath: string;
  exists: boolean;
  error?: string;
}

/**
 * セキュアなファイルパス検証
 */
export async function validateSecureFilePath(filePath: string): Promise<FilePathValidation> {
  const videoDirectory = process.env.VIDEO_DIRECTORY || "";
  
  if (!videoDirectory) {
    return {
      isValid: false,
      fullPath: "",
      exists: false,
      error: "Video directory not configured"
    };
  }
  
  // セキュリティチェック: パストラバーサル攻撃を防ぐ
  const fullPath = sanitizePath(filePath, videoDirectory);
  
  if (!fullPath) {
    return {
      isValid: false,
      fullPath: "",
      exists: false,
      error: "Invalid path: security violation detected"
    };
  }

  // ファイルの存在確認
  const exists = await fileExists(fullPath);
  
  return {
    isValid: true,
    fullPath,
    exists,
    error: exists ? undefined : "File not found"
  };
}
