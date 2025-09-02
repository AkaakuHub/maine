import {
	Settings,
	Clock,
	Play,
	Camera,
	ChevronRight,
	ChevronLeft,
	Download,
} from "lucide-react";
import { cn } from "@/libs/utils";
import type { SettingsView } from "./types";

interface SettingsMenuProps {
	show: boolean;
	settingsView: SettingsView;
	setSettingsView: (view: SettingsView) => void;
	skipSeconds: number;
	skipOptions: number[];
	playbackRate: number;
	autoDownloadScreenshot: boolean;
	onSkipSecondsChange: (seconds: number) => void;
	onPlaybackRateChange: (rate: number) => void;
	onScreenshotSettingChange: (enabled: boolean) => void;
	settingsRef: React.RefObject<HTMLDivElement | null>;
}

export default function SettingsMenu({
	show,
	settingsView,
	setSettingsView,
	skipSeconds,
	skipOptions,
	playbackRate,
	autoDownloadScreenshot,
	onSkipSecondsChange,
	onPlaybackRateChange,
	onScreenshotSettingChange,
	settingsRef,
}: SettingsMenuProps) {
	if (!show) {
		return null;
	}

	return (
		<div
			ref={settingsRef}
			className="absolute bottom-8 right-0 bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-primary/30 backdrop-blur-md rounded-lg p-3 min-w-48 shadow-2xl z-[99999]"
		>
			{settingsView === "main" && (
				<div>
					<div className="text-text text-sm mb-3 font-semibold flex items-center gap-2">
						<Settings className="h-4 w-4" />
						設定
					</div>
					{/* メインメニュー */}
					<button
						type="button"
						onClick={() => setSettingsView("skip")}
						className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-secondary hover:bg-primary/20 hover:text-primary rounded transition-colors mb-2"
					>
						<div className="flex items-center gap-2 w-30">
							<Clock className="h-4 w-4" />
							<span className="text-start">スキップ秒数</span>
						</div>
						<div className="flex items-center gap-1">
							<span className="text-xs text-warning w-8">{skipSeconds}秒</span>
							<ChevronRight className="h-4 w-4" />
						</div>
					</button>{" "}
					<button
						type="button"
						onClick={() => setSettingsView("playback")}
						className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-secondary hover:bg-primary/20 hover:text-primary rounded transition-colors mb-2"
					>
						<div className="flex items-center gap-2 w-30">
							<Play className="h-4 w-4" />
							<span className="text-start">再生速度</span>
						</div>
						<div className="flex items-center gap-1">
							<span className="text-xs text-primary w-8">{playbackRate}x</span>
							<ChevronRight className="h-4 w-4" />
						</div>{" "}
					</button>
					<button
						type="button"
						onClick={() => setSettingsView("screenshot")}
						className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-secondary hover:bg-primary/20 hover:text-primary rounded transition-colors mb-2"
					>
						<div className="flex items-center gap-2 min-w-32">
							<Camera className="h-4 w-4" />
							<span className="text-start">スクリーンショット</span>
						</div>
						<div className="flex items-center gap-1">
							<span className="text-xs text-primary w-16">
								{autoDownloadScreenshot ? "自動DL" : "コピーのみ"}
							</span>
							<ChevronRight className="h-4 w-4" />
						</div>
					</button>
				</div>
			)}
			{settingsView === "skip" && (
				<div>
					<div className="flex items-center gap-2 mb-3">
						<button
							type="button"
							onClick={() => setSettingsView("main")}
							className="text-text-secondary hover:text-text transition-colors w-8"
						>
							<ChevronLeft className="h-6 w-6" />
						</button>
						<div className="text-warning text-sm font-semibold flex items-center gap-2">
							<Clock className="h-4 w-4" />
							スキップ秒数
						</div>
					</div>

					{skipOptions.map((seconds) => (
						<button
							key={seconds}
							type="button"
							onClick={() => {
								onSkipSecondsChange(seconds);
							}}
							className={cn(
								"block w-full text-left px-3 py-2 text-sm rounded transition-colors mb-1",
								skipSeconds === seconds
									? "bg-primary text-text-inverse"
									: "text-text-secondary hover:bg-primary/20",
							)}
						>
							{seconds}秒
						</button>
					))}
				</div>
			)}{" "}
			{settingsView === "playback" && (
				<div>
					<div className="flex items-center gap-2 mb-3">
						<button
							type="button"
							onClick={() => setSettingsView("main")}
							className="text-text-secondary hover:text-text transition-colors w-8"
						>
							<ChevronLeft className="h-6 w-6" />
						</button>
						<div className="text-primary text-sm font-semibold flex items-center gap-2">
							<Play className="h-4 w-4" />
							再生速度
						</div>
					</div>

					{[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
						<button
							key={rate}
							type="button"
							onClick={() => {
								onPlaybackRateChange(rate);
								setSettingsView("main");
							}}
							className={cn(
								"block w-full text-left px-3 py-2 text-sm rounded transition-colors mb-1",
								playbackRate === rate
									? "bg-primary text-text-inverse"
									: "text-text-secondary hover:bg-primary/20",
							)}
						>
							{rate}x
						</button>
					))}
				</div>
			)}
			{settingsView === "screenshot" && (
				<div>
					<div className="flex items-center gap-2 mb-3">
						<button
							type="button"
							onClick={() => setSettingsView("main")}
							className="text-text-secondary hover:text-text transition-colors w-8"
						>
							<ChevronLeft className="h-6 w-6" />
						</button>
						<div className="text-primary text-sm font-semibold flex items-center gap-2">
							<Camera className="h-4 w-4" />
							<span>スクリーンショット設定</span>
						</div>
					</div>

					<button
						type="button"
						onClick={() => onScreenshotSettingChange(false)}
						className={cn(
							"flex w-full px-3 py-2 text-sm rounded transition-colors mb-1 justify-start items-center",
							!autoDownloadScreenshot
								? "bg-primary text-text-inverse"
								: "text-text-secondary hover:bg-primary/20",
						)}
						style={{ textAlign: "left" }}
					>
						<span className="text-left">クリップボードにコピーのみ</span>
					</button>
					<button
						type="button"
						onClick={() => onScreenshotSettingChange(true)}
						className={cn(
							"flex w-full px-3 py-2 text-sm rounded transition-colors mb-1 justify-start items-center",
							autoDownloadScreenshot
								? "bg-primary text-text-inverse"
								: "text-text-secondary hover:bg-primary/20",
						)}
						style={{ textAlign: "left" }}
					>
						<div className="flex items-center gap-2 text-left">
							<Download className="h-4 w-4" />
							<span className="text-left">
								クリップボード + 自動ダウンロード
							</span>
						</div>
					</button>
				</div>
			)}
		</div>
	);
}
