// Prisma Anime model types
export interface AnimeData {
  id: string
  title: string
  fileName: string
  filePath: string
  duration?: number | null
  fileSize: string // BigInt serialized as string
  thumbnail?: string | null
  episode?: number | null
  season?: string | null
  genre?: string | null
  year?: number | null
  rating?: number | null
  lastWatched?: Date | null
  watchTime?: number | null
  createdAt: Date
  updatedAt: Date
}

export interface AnimeResponse {
  animes: AnimeData[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DatabaseUpdateResponse {
  message: string
  stats: {
    total: number
    added: number
    updated: number
    deleted: number
    scanned: number
  }
}

// Legacy types for backward compatibility
export type DatabaseJsonType = {
  newDatabase: Record<string, string[]>;
};

export type VideoFile = {
  name: string;
  path: string;
  size?: number;
  duration?: number;
  thumbnail?: string;
};

export type AnimeCollection = {
  title: string;
  episodes: VideoFile[];
  thumbnail?: string;
  description?: string;
};

export type VideoPlayerProps = {
  src: string;
  title?: string;
  onEnded?: () => void;
  autoPlay?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
};

export type VideoControlProps = {
  onPlayPause: React.MouseEventHandler<HTMLDivElement>;
  isPlaying: boolean;
  onRewind: () => void;
  onForward: () => void;
  played: number;
  onSeek: (e: Event, value: number | number[], activeThumb: number) => void;
  onSeekMouseUp: (
    e: Event | React.SyntheticEvent<Element, Event>,
    value: number | number[],
  ) => void;
  volume: number;
  onVolumeChange: (
    e: Event,
    value: number | number[],
    activeThumb: number,
  ) => void;
  onVolumeSeekUp: (
    e: Event | React.SyntheticEvent<Element, Event>,
    value: number | number[],
  ) => void;
  isMuted: boolean;
  onMute: React.MouseEventHandler<HTMLDivElement>;
  duration: string;
  currentTime: string;
  controlRef: React.RefObject<HTMLDivElement>;
  onToggleFullscreen: React.MouseEventHandler<HTMLDivElement>;
  onTogglePictureInPicture: React.MouseEventHandler<HTMLDivElement>;
  onChangePlaybackRate: (rate: number) => void;
  isFullScreen: boolean;
};
