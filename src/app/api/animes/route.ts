import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/libs/prisma'
import type { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const genre = searchParams.get('genre') || ''
    const year = searchParams.get('year') || ''
    const sortBy = searchParams.get('sortBy') || 'title'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const page = Number.parseInt(searchParams.get('page') || '1', 10)
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10)

    // フィルター条件を構築
    const where: Prisma.AnimeWhereInput = {}
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { fileName: { contains: search } }
      ]
    }
    
    if (genre) {
      where.genre = { contains: genre }
    }
    
    if (year) {
      where.year = Number.parseInt(year, 10)
    }

    // ソート条件を構築
    const orderBy: Prisma.AnimeOrderByWithRelationInput = {}
    if (sortBy === 'title') {
      orderBy.title = sortOrder as Prisma.SortOrder
    } else if (sortBy === 'year') {
      orderBy.year = sortOrder as Prisma.SortOrder
    } else if (sortBy === 'episode') {
      orderBy.episode = sortOrder as Prisma.SortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder as Prisma.SortOrder
    } else if (sortBy === 'lastWatched') {
      orderBy.lastWatched = sortOrder as Prisma.SortOrder
    } else {
      orderBy.title = 'asc'
    }

    // データを取得
    const [animes, totalCount] = await Promise.all([
      prisma.anime.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          fileName: true,
          filePath: true,
          duration: true,
          fileSize: true,
          thumbnail: true,
          episode: true,
          season: true,
          genre: true,
          year: true,
          rating: true,
          lastWatched: true,
          watchTime: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.anime.count({ where })
    ])

    // ファイルサイズをstringに変換（JSONシリアライゼーション対応）
    const serializedAnimes = animes.map(anime => ({
      ...anime,
      fileSize: anime.fileSize?.toString() || '0'
    }))

    return NextResponse.json({
      animes: serializedAnimes,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Get animes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch animes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
