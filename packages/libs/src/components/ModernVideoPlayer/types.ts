import { PlaylistVideo } from "../../types/Playlist";

// フルスクリーン用の型定義
export interface HTMLVideoElementWithFullscreen extends HTMLVideoElement {
	webkitRequestFullscreen?: () => Promise<void>;
	webkitEnterFullscreen?: () => Promise<void>; // iOS Safari用
	mozRequestFullScreen?: () => Promise<void>;
	msRequestFullscreen?: () => Promise<void>;
}

export interface HTMLElementWithFullscreen extends HTMLElement {
	webkitRequestFullscreen?: () => Promise<void>;
	mozRequestFullScreen?: () => Promise<void>;
	msRequestFullscreen?: () => Promise<void>;
}

export interface DocumentWithFullscreen extends Document {
	webkitFullscreenElement?: Element | null;
	mozFullScreenElement?: Element | null;
	msFullscreenElement?: Element | null;
	webkitExitFullscreen?: () => Promise<void>;
	mozCancelFullScreen?: () => Promise<void>;
	msExitFullscreen?: () => Promise<void>;
}

export interface ModernVideoPlayerProps {
	src: string;
	title?: string;
	thumbnailPath?: string;
	onBack?: () => void;
	onTimeUpdate?: (currentTime: number, duration: number) => void;
	initialTime?: number;
	className?: string;
	onShowHelp?: () => void;
	onError?: (error: string) => void;
	onVideoEnd?: () => void;
	playlistVideos?: PlaylistVideo[];
	onVideoSelect?: (video: PlaylistVideo) => void;
	id?: string;
}

export type SettingsView =
	| "main"
	| "playback"
	| "skip"
	| "screenshot"
	| "chapter-skip";
