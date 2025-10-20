import {
	Settings,
	Clock,
	Play,
	Camera,
	ChevronRight,
	ChevronLeft,
	Download,
	SkipForward,
	Plus,
	Trash2,
	Edit,
	Check,
} from "lucide-react";
import { cn } from "@/libs/utils";
import type { SettingsView } from "./types";
import { useChapterSkipStore } from "@/stores/chapterSkipStore";
import { useState } from "react";
import type { ChapterSkipRule } from "@/types/Settings";

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
	const chapterSkipStore = useChapterSkipStore();
	const [newPattern, setNewPattern] = useState("");
	const [editingRule, setEditingRule] = useState<ChapterSkipRule | null>(null);
	const [editPattern, setEditPattern] = useState("");

	if (!show) {
		return null;
	}

	return (
		<div
			ref={settingsRef}
			className="absolute bottom-8 right-0 bg-surface-variant border border-primary/30 backdrop-blur-md rounded-lg p-3 min-w-48 shadow-2xl z-[99999]"
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
					<button
						type="button"
						onClick={() => setSettingsView("chapter-skip")}
						className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-secondary hover:bg-primary/20 hover:text-primary rounded transition-colors mb-2"
					>
						<div className="flex items-center gap-2 min-w-32">
							<SkipForward className="h-4 w-4" />
							<span className="text-start">チャプタースキップ</span>
						</div>
						<div className="flex items-center gap-1">
							<span className="text-xs text-primary w-8">
								{chapterSkipStore.rules.filter((r) => r.enabled).length}個
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
			{settingsView === "chapter-skip" && (
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
							<SkipForward className="h-4 w-4" />
							チャプタースキップ
						</div>
					</div>

					{/* 新しいパターン追加 */}
					<div className="mb-4 p-3 bg-surface/50 rounded border border-primary/20">
						<label
							htmlFor="new-pattern-input"
							className="block text-xs text-text-secondary mb-2"
						>
							新しいスキップパターン
						</label>
						<div className="flex gap-2">
							<input
								id="new-pattern-input"
								type="text"
								value={newPattern}
								onChange={(e) => setNewPattern(e.target.value)}
								placeholder="CM、OP、EDなど"
								className="flex-1 px-2 py-1 text-xs bg-surface border border-primary/30 rounded focus:outline-none focus:border-primary"
							/>
							<button
								type="button"
								onClick={async () => {
									if (newPattern.trim()) {
										try {
											await chapterSkipStore.addRule(newPattern.trim());
											setNewPattern("");
										} catch (_error) {
											// エラーハンドリングはストアで管理
										}
									}
								}}
								disabled={!newPattern.trim() || chapterSkipStore.isLoading}
								className="px-2 py-1 bg-primary text-text-inverse text-xs rounded hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Plus className="h-3 w-3" />
							</button>
						</div>
					</div>

					{/* エラー表示 */}
					{chapterSkipStore.error && (
						<div className="mb-3 p-2 bg-error/20 border border-error/50 rounded text-xs text-error">
							{chapterSkipStore.error}
						</div>
					)}

					{/* 既存ルール一覧 */}
					<div className="max-h-48 overflow-y-auto">
						{chapterSkipStore.isLoading ? (
							<div className="text-center text-text-secondary text-xs py-4">
								読み込み中...
							</div>
						) : chapterSkipStore.rules.length === 0 ? (
							<div className="text-center text-text-secondary text-xs py-4">
								スキップパターンがありません
							</div>
						) : (
							chapterSkipStore.rules.map((rule) => (
								<div
									key={rule.id}
									className="flex items-center gap-2 p-2 mb-1 bg-surface/30 rounded border border-surface-hover"
								>
									{editingRule?.id === rule.id ? (
										<>
											<input
												type="text"
												value={editPattern}
												onChange={(e) => setEditPattern(e.target.value)}
												className="flex-1 px-2 py-1 text-xs bg-surface border border-primary/30 rounded focus:outline-none focus:border-primary"
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														if (editPattern.trim()) {
															chapterSkipStore.updateRule(rule.id, {
																pattern: editPattern.trim(),
															});
															setEditingRule(null);
															setEditPattern("");
														}
													} else if (e.key === "Escape") {
														setEditingRule(null);
														setEditPattern("");
													}
												}}
											/>
											<button
												type="button"
												onClick={async () => {
													if (editPattern.trim()) {
														try {
															await chapterSkipStore.updateRule(rule.id, {
																pattern: editPattern.trim(),
															});
															setEditingRule(null);
															setEditPattern("");
														} catch (_error) {
															// エラーハンドリングはストアで管理
														}
													}
												}}
												className="text-primary hover:text-primary/80 transition-colors"
												title="保存"
											>
												<Check className="w-4 h-4" />
											</button>
											<button
												type="button"
												onClick={() => {
													setEditingRule(null);
													setEditPattern("");
												}}
												className="text-text-secondary hover:text-text transition-colors"
												title="キャンセル"
											>
												✕
											</button>
										</>
									) : (
										<>
											<button
												type="button"
												onClick={() => chapterSkipStore.toggleRule(rule.id)}
												className={cn(
													"w-3 h-3 rounded-sm border transition-colors",
													rule.enabled
														? "bg-primary border-primary"
														: "border-text-secondary",
												)}
											>
												{rule.enabled && (
													<Check className="w-3 h-3 text-text-inverse" />
												)}
											</button>
											<span
												className={cn(
													"flex-1 text-xs",
													rule.enabled
														? "text-text"
														: "text-text-secondary line-through",
												)}
											>
												{rule.pattern}
											</span>
											<button
												type="button"
												onClick={() => {
													setEditingRule(rule);
													setEditPattern(rule.pattern);
												}}
												className="text-text-secondary hover:text-primary transition-colors"
												title="編集"
											>
												<Edit className="h-3 w-3" />
											</button>
											<button
												type="button"
												onClick={() => chapterSkipStore.deleteRule(rule.id)}
												className="text-text-secondary hover:text-error transition-colors"
												title="削除"
											>
												<Trash2 className="h-3 w-3" />
											</button>
										</>
									)}
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
