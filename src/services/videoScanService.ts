import path from 'node:path'
import { promises as fs } from 'node:fs'
import { prisma } from '@/libs/prisma'
import { normalizePath, isVideoFile, getFileName, getFileSize } from '@/libs/fileUtils'

export interface VideoFileInfo {
  id: string
  title: string
  fileName: string
  filePath: string
  duration?: number
  fileSize: bigint
  episode?: number
  season?: string
  genre?: string
  year?: number
}

export interface DatabaseUpdateStats {
  total: number
  added: number
  updated: number
  deleted: number
  scanned: number
}

export interface DatabaseUpdateResult {
  success: boolean
  message: string
  stats?: DatabaseUpdateStats
  error?: string
}

export class VideoScanService {
  /**
   * 指定されたディレクトリから動画ファイルを再帰的にスキャン
   */
  static async scanDirectory(dirPath: string): Promise<VideoFileInfo[]> {
    const videos: VideoFileInfo[] = []
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name)
        
        if (item.isDirectory()) {
          const subVideos = await this.scanDirectory(fullPath)
          videos.push(...subVideos)
        } else if (item.isFile() && isVideoFile(item.name)) {
          try {
            const videoInfo = await this.extractVideoInfo(fullPath)
            videos.push(videoInfo)
          } catch (error) {
            console.warn(`Failed to process file ${fullPath}:`, error)
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${dirPath}:`, error)
      throw new Error(`Directory scan failed: ${error}`)
    }
    
    return videos
  }

  /**
   * 動画ファイルから情報を抽出
   */
  private static async extractVideoInfo(fullPath: string): Promise<VideoFileInfo> {
    const fileSize = await getFileSize(fullPath)
    const normalizedPath = normalizePath(fullPath)
    const fileName = getFileName(fullPath)
    
    // ファイル名から情報を抽出
    const title = this.extractTitle(fileName)
    const episode = this.extractEpisode(fileName)
    const year = this.extractYear(fileName)
    
    return {
      id: '', // Prismaが自動生成
      title,
      fileName,
      filePath: normalizedPath,
      fileSize: BigInt(fileSize),
      episode,
      year
    }
  }

  /**
   * ファイル名からタイトルを抽出
   */
  private static extractTitle(fileName: string): string {
    const titleMatch = fileName.match(/^(.+?)(?:\s*[\[\(].*[\]\)])?(?:\.\w+)?$/)
    return titleMatch ? titleMatch[1].trim() : fileName
  }

  /**
   * ファイル名からエピソード番号を抽出
   */
  private static extractEpisode(fileName: string): number | undefined {
    const episodeMatch = fileName.match(/(?:ep?|episode|第)[\s]*(\d+)/i)
    return episodeMatch ? Number.parseInt(episodeMatch[1], 10) : undefined
  }

  /**
   * ファイル名から年を抽出
   */
  private static extractYear(fileName: string): number | undefined {
    const yearMatch = fileName.match(/\b(19|20)\d{2}\b/)
    return yearMatch ? Number.parseInt(yearMatch[0], 10) : undefined
  }

  /**
   * データベースを更新
   */
  static async updateDatabase(): Promise<DatabaseUpdateResult> {
    try {
      const videoDirectory = process.env.VIDEO_DIRECTORY

      if (!videoDirectory) {
        return {
          success: false,
          message: 'VIDEO_DIRECTORY environment variable not set',
          error: 'Configuration error'
        }
      }

      // ディレクトリの存在確認
      try {
        await fs.access(videoDirectory)
      } catch {
        return {
          success: false,
          message: `Video directory not found: ${videoDirectory}`,
          error: 'Directory not found'
        }
      }

      console.log('Scanning directory:', videoDirectory)
      const videoFiles = await this.scanDirectory(videoDirectory)

      if (videoFiles.length === 0) {
        return {
          success: true,
          message: 'No video files found',
          stats: {
            total: 0,
            added: 0,
            updated: 0,
            deleted: 0,
            scanned: 0
          }
        }
      }

      const stats = await this.syncWithDatabase(videoFiles)

      return {
        success: true,
        message: 'Database updated successfully',
        stats
      }
    } catch (error) {
      console.error('Database update error:', error)
      return {
        success: false,
        message: 'Failed to update database',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * データベースと動画ファイルを同期
   */
  private static async syncWithDatabase(videoFiles: VideoFileInfo[]): Promise<DatabaseUpdateStats> {
    let addedCount = 0
    let updatedCount = 0

    // 動画ファイルを処理
    for (const video of videoFiles) {
      try {
        const existingAnime = await prisma.anime.findUnique({
          where: { filePath: video.filePath }
        })

        if (existingAnime) {
          await prisma.anime.update({
            where: { id: existingAnime.id },
            data: {
              title: video.title,
              fileName: video.fileName,
              fileSize: video.fileSize,
              episode: video.episode,
              year: video.year,
              updatedAt: new Date()
            }
          })
          updatedCount++
        } else {
          await prisma.anime.create({
            data: {
              title: video.title,
              fileName: video.fileName,
              filePath: video.filePath,
              fileSize: video.fileSize,
              episode: video.episode,
              year: video.year
            }
          })
          addedCount++
        }
      } catch (error) {
        console.error(`Failed to save video ${video.fileName}:`, error)
      }
    }

    // 存在しなくなったファイルを削除
    const deletedCount = await this.cleanupMissingFiles(videoFiles)
    const totalCount = await prisma.anime.count()

    return {
      total: totalCount,
      added: addedCount,
      updated: updatedCount,
      deleted: deletedCount,
      scanned: videoFiles.length
    }
  }

  /**
   * 存在しなくなったファイルをデータベースから削除
   */
  private static async cleanupMissingFiles(videoFiles: VideoFileInfo[]): Promise<number> {
    const allDbAnimes = await prisma.anime.findMany()
    const currentFilePaths = new Set(videoFiles.map(v => v.filePath))
    let deletedCount = 0

    for (const dbAnime of allDbAnimes) {
      if (!currentFilePaths.has(dbAnime.filePath)) {
        await prisma.anime.delete({
          where: { id: dbAnime.id }
        })
        deletedCount++
      }
    }

    return deletedCount
  }
} 