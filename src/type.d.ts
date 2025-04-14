export type DatabaseJsonType = Record<string, string[]>;

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
