import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { prisma } from '@/libs/prisma'
import { normalizePath, isVideoFile, getFileName, getFileSize } from '@/libs/fileUtils'

interface VideoFile {
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

async function scanDirectory(dirPath: string): Promise<VideoFile[]> {
  const videos: VideoFile[] = []
  
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name)
      
      if (item.isDirectory()) {
        // 再帰的にサブディレクトリをスキャン
        const subVideos = await scanDirectory(fullPath)
        videos.push(...subVideos)
      } else if (item.isFile() && isVideoFile(item.name)) {
        try {
          const fileSize = await getFileSize(fullPath)
          const normalizedPath = normalizePath(fullPath)
          const fileName = getFileName(fullPath)
          
          // ファイル名から情報を抽出
          const titleMatch = fileName.match(/^(.+?)(?:\s*[\[\(].*[\]\)])?(?:\.\w+)?$/)
          const title = titleMatch ? titleMatch[1].trim() : fileName
          
          // エピソード番号を抽出
          const episodeMatch = fileName.match(/(?:ep?|episode|第)[\s]*(\d+)/i)
          const episode = episodeMatch ? Number.parseInt(episodeMatch[1], 10) : undefined
          
          // 年を抽出
          const yearMatch = fileName.match(/\b(19|20)\d{2}\b/)
          const year = yearMatch ? Number.parseInt(yearMatch[0], 10) : undefined
          
          videos.push({
            id: '', // Prismaが自動生成
            title,
            fileName,
            filePath: normalizedPath,
            fileSize: BigInt(fileSize),
            episode,
            year
          })
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

export async function GET() {
  try {
    const videoDirectory = process.env.VIDEO_DIRECTORY;
    
    if (!videoDirectory) {
      return NextResponse.json(
        { error: 'VIDEO_DIRECTORY environment variable not set' },
        { status: 500 }
      )
    }

    // ディレクトリの存在確認
    try {
      await fs.access(videoDirectory)
    } catch {
      return NextResponse.json(
        { error: `Video directory not found: ${videoDirectory}` },
        { status: 404 }
      )
    }

    console.log('Scanning directory:', videoDirectory)
    const videoFiles = await scanDirectory(videoDirectory)
    
    if (videoFiles.length === 0) {
      return NextResponse.json(
        { message: 'No video files found', count: 0 },
        { status: 200 }
      )
    }

    // データベースを更新
    let addedCount = 0
    let updatedCount = 0
    
    for (const video of videoFiles) {
      try {
        const existingAnime = await prisma.anime.findUnique({
          where: { filePath: video.filePath }
        })
        
        if (existingAnime) {
          // 既存のレコードを更新
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
          // 新しいレコードを作成
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

    const totalCount = await prisma.anime.count()
    
    return NextResponse.json({
      message: 'Database updated successfully',
      stats: {
        total: totalCount,
        added: addedCount,
        updated: updatedCount,
        deleted: deletedCount,
        scanned: videoFiles.length
      }
    })
    
  } catch (error) {
    console.error('Database update error:', error)
    return NextResponse.json(
      { error: 'Failed to update database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
