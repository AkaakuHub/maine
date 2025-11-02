// 再生進捗関連の型定義（現在の設計で使用）
export interface VideoProgressData {
	id: string;
	filePath: string;
	watchTime: number; // 視聴時間（秒）
	watchProgress: number; // 進捗率（0-100）
	isLiked: boolean;
	lastWatched: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

// 動画ファイル情報の型定義（リアルタイムスキャンで取得）
export interface VideoFileData {
	id: string;
	title: string;
	fileName: string;
	filePath: string;
	duration?: number;
	thumbnailPath?: string;
	fileSize: number;
	episode?: number;
	season?: string;
	genre?: string;
	year?: number;
	fileModifiedAt?: Date; // ファイル更新日時（ファイル名から日付が取得できない場合のフォールバック）
}

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
