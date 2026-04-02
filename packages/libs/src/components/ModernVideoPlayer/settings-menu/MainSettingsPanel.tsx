import { Camera, Clock, Play, Settings, SkipForward } from "lucide-react";
import type { PointerEventHandler } from "react";
import type { SettingsView } from "../types";
import { MenuRow, SheetHeader, SheetSection } from "./ui";

interface MainSettingsPanelProps {
	skipSeconds: number;
	playbackRate: number;
	autoDownloadScreenshot: boolean;
	isPlaylistAutoplayEnabled: boolean;
	enabledChapterSkipCount: number;
	onDragStart: PointerEventHandler<HTMLButtonElement>;
	onOpenView: (view: SettingsView) => void;
	onPlaylistAutoplayChange: (enabled: boolean) => void;
}

export function MainSettingsPanel({
	skipSeconds,
	playbackRate,
	autoDownloadScreenshot,
	isPlaylistAutoplayEnabled,
	enabledChapterSkipCount,
	onDragStart,
	onOpenView,
	onPlaylistAutoplayChange,
}: MainSettingsPanelProps) {
	return (
		<>
			<SheetHeader icon={Settings} title="設定" onDragStart={onDragStart} />
			<SheetSection>
				<MenuRow
					icon={Clock}
					label="スキップ秒数"
					value={`${skipSeconds}秒`}
					valueTone="warning"
					onClick={() => onOpenView("skip")}
				/>
				<MenuRow
					icon={Play}
					label="再生速度"
					value={`${playbackRate}x`}
					valueTone="primary"
					onClick={() => onOpenView("playback")}
				/>
				<MenuRow
					icon={Camera}
					label="スクリーンショット"
					value={autoDownloadScreenshot ? "自動DL" : "コピーのみ"}
					valueTone="primary"
					onClick={() => onOpenView("screenshot")}
				/>
				<MenuRow
					icon={SkipForward}
					label="チャプタースキップ"
					value={`${enabledChapterSkipCount}個`}
					valueTone="primary"
					onClick={() => onOpenView("chapter-skip")}
				/>
				<MenuRow
					icon={Play}
					label="プレイリスト自動再生"
					onClick={() => onPlaylistAutoplayChange(!isPlaylistAutoplayEnabled)}
					trailing={
						<div className="flex items-center gap-3">
							<span
								className={
									isPlaylistAutoplayEnabled
										? "text-sm font-medium text-primary"
										: "text-sm font-medium text-text-secondary"
								}
							>
								{isPlaylistAutoplayEnabled ? "オン" : "オフ"}
							</span>
							<div
								className={
									isPlaylistAutoplayEnabled
										? "flex h-6 w-10 items-center justify-end rounded-full border border-primary/30 bg-primary/20 px-1 transition-colors"
										: "flex h-6 w-10 items-center justify-start rounded-full border border-border bg-surface px-1 transition-colors"
								}
							>
								<div
									className={
										isPlaylistAutoplayEnabled
											? "h-4 w-4 rounded-full bg-primary"
											: "h-4 w-4 rounded-full bg-text-muted"
									}
								/>
							</div>
						</div>
					}
				/>
			</SheetSection>
		</>
	);
}
