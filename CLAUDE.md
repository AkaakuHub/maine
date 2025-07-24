# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

My-Video-Storage is a Progressive Web App (PWA) for managing and playing video files with offline support. Built with Next.js, it provides a modern interface for browsing, searching, and watching video content.

## Development Commands

### Setup & Development
```bash
pnpm dev         # Start development server (includes db setup)
pnpm dev:force   # Start dev server without db setup
pnpm build       # Build for production (includes db setup)
pnpm start       # Start production server
```

### Code Quality
```bash
pnpm lint        # Run Biome linter on src/
pnpm format      # Format code with Biome
pnpm knip        # Remove unused dependencies/exports
```

### Database Management
```bash
pnpm db:setup    # Generate Prisma client and deploy migrations
pnpm db:migrate  # Create and apply new migration
pnpm db:studio   # Open Prisma Studio
pnpm db:reset    # Reset database (force)
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM, SQLite
- **PWA**: Service Workers, IndexedDB (idb), Cache API
- **Tools**: Biome (linting/formatting), pnpm, Lefthook (git hooks)

### Core Structure

**Frontend Components:**
- `src/app/page.tsx` - Main homepage with video grid/list, search, tabs
- `src/app/play/[filePath]/page.tsx` - Video player page
- `src/components/` - Reusable UI components (VideoCard, VideoPlayer, etc.)
- `src/hooks/` - Custom React hooks (useVideos, useOfflineStorage, etc.)

**Backend Services:**
- `src/services/videoScanService.ts` - Scans filesystem for video files
- `src/services/offlineStorageService.ts` - Manages offline video storage
- `src/app/api/` - API routes for videos, progress tracking

**Database:**
- `prisma/schema.prisma` - Single VideoProgress model for watch progress, likes, watchlist
- SQLite database for lightweight local storage

### Key Features

1. **Video Management**: Real-time filesystem scanning, metadata extraction from filenames
2. **PWA Offline Support**: IndexedDB for offline video storage, Service Workers for caching
3. **Progress Tracking**: Watch progress, favorites, watchlist stored in SQLite
4. **Search & Filters**: Title/filename search, sorting by title/year/episode/date
5. **Responsive UI**: Grid/list view modes, mobile-optimized interface

### File Organization

**Video Scanning Logic:**
- Environment variable `VIDEO_DIRECTORY` defines scan paths
- `src/utils/videoFileNameParser.ts` - Parses Japanese TV show metadata from filenames
- `src/libs/fileUtils.ts` - File system utilities for cross-platform compatibility

**State Management:**
- React hooks pattern with custom hooks in `src/hooks/`
- No external state management library
- Local state with React Context where needed

**Styling:**
- Tailwind CSS with custom gradient backgrounds
- Dark theme throughout
- Responsive design with mobile-first approach

## Development Notes

### Package Manager
Use `pnpm` instead of `npm` for package management.

### Code Style
- Biome configuration in `biome.json`
- Tab indentation, double quotes
- Auto-fix for unused variables/imports

### Database Schema
The database only stores user interaction data (progress, likes, watchlist). Video metadata is extracted dynamically from the filesystem to avoid sync issues.

### PWA Features
- Service Worker registration in `src/components/ServiceWorkerRegistration/`
- Offline detection with `src/hooks/useNetworkStatus.ts`
- IndexedDB wrapper in `src/services/offlineStorageService.ts`

### Video File Processing
- Supports common video formats (mp4, mkv, avi, etc.)
- Extracts title, episode, year from Japanese filename patterns
- Handles filesystem encoding issues with iconv-lite

### Environment Setup
Set `VIDEO_DIRECTORY` environment variable to specify video file locations. Multiple directories can be specified separated by platform-specific delimiters.