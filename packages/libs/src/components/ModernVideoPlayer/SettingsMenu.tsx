import {
	Camera,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Download,
	Edit,
	Play,
	Plus,
	Settings,
	SkipForward,
	Trash2,
} from "lucide-react";
import {
	useEffect,
	useRef,
	useState,
	type ComponentType,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from "react";
import { cn } from "../../libs/utils";
import { useChapterSkipStore } from "../../stores/chapterSkipStore";
import type { ChapterSkipRule } from "../../types/Settings";
import type { SettingsView } from "./types";

interface SettingsMenuProps {
	show: boolean;
	isOpen: boolean;
	settingsView: SettingsView;
	setSettingsView: (view: SettingsView) => void;
	skipSeconds: number;
	skipOptions: number[];
	playbackRate: number;
	autoDownloadScreenshot: boolean;
	isPlaylistAutoplayEnabled: boolean;
	onSkipSecondsChange: (seconds: number) => void;
	onPlaybackRateChange: (rate: number) => void;
	onScreenshotSettingChange: (enabled: boolean) => void;
	onPlaylistAutoplayChange: (enabled: boolean) => void;
	onClose: () => void;
	settingsRef: React.RefObject<HTMLDivElement | null>;
}

interface MenuRowProps {
	icon: ComponentType<{ className?: string }>;
	label: string;
	value?: string;
	valueTone?: "default" | "primary" | "warning";
	onClick: () => void;
	trailing?: ReactNode;
}

interface OptionButtonProps {
	label: string;
	selected: boolean;
	onClick: () => void;
	icon?: ComponentType<{ className?: string }>;
}

function SheetHeader({
	icon: Icon,
	title,
	onDragStart,
}: {
	icon: ComponentType<{ className?: string }>;
	title: string;
	onDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
	return (
		<div className="px-4 pb-2 pt-3">
			<div className="mb-3 flex justify-center">
				<button
					type="button"
					aria-label="シートをドラッグ"
					className="flex w-full cursor-grab touch-none justify-center py-1 active:cursor-grabbing"
					onPointerDown={onDragStart}
				>
					<div className="h-1.5 w-12 rounded-full bg-text-muted" />
				</button>
			</div>
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-text ring-1 ring-border/60">
					<Icon className="h-5 w-5" />
				</div>
				<div className="text-lg font-semibold tracking-tight text-text">
					{title}
				</div>
			</div>
		</div>
	);
}

function BackButton({
	onClick,
}: {
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text"
		>
			<ChevronLeft className="h-5 w-5" />
		</button>
	);
}

function MenuRow({
	icon: Icon,
	label,
	value,
	valueTone = "default",
	onClick,
	trailing,
}: MenuRowProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-surface-elevated"
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-text-secondary ring-1 ring-border/60 transition-colors group-hover:bg-surface-pressed">
				<Icon className="h-5 w-5" />
			</div>
			<div className="min-w-0 flex-1 text-base font-medium text-text">
				{label}
			</div>
			{trailing ?? (
				<div className="flex items-center gap-2">
					{value ? (
						<span
							className={cn(
								"text-sm font-medium",
								valueTone === "warning" && "text-warning",
								valueTone === "primary" && "text-primary",
								valueTone === "default" && "text-text-secondary",
							)}
						>
							{value}
						</span>
					) : null}
					<ChevronRight className="h-5 w-5 text-text-secondary" />
				</div>
			)}
		</button>
	);
}

function OptionButton({
	label,
	selected,
	onClick,
	icon: Icon,
}: OptionButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors",
				selected ? "bg-surface-elevated" : "hover:bg-surface-elevated",
			)}
		>
			<div
				className={cn(
					"flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 transition-colors",
					selected
						? "bg-primary/16 text-primary ring-primary/20"
						: "bg-surface text-text-secondary ring-border/60",
				)}
			>
				{Icon ? <Icon className="h-4 w-4" /> : <Check className="h-4 w-4" />}
			</div>
			<div
				className={cn(
					"min-w-0 flex-1 text-base font-medium",
					selected ? "text-text" : "text-text-secondary",
				)}
			>
				{label}
			</div>
			<div
				className={cn(
					"flex h-5 w-5 items-center justify-center rounded-full border",
					selected
						? "border-primary bg-primary text-text-inverse"
						: "border-border bg-transparent",
				)}
			>
				{selected ? <Check className="h-3 w-3" /> : null}
			</div>
		</button>
	);
}

function SheetSection({
	children,
}: {
	children: ReactNode;
}) {
	return <div className="space-y-1 px-2 pb-3">{children}</div>;
}

export default function SettingsMenu({
	show,
	isOpen,
	settingsView,
	setSettingsView,
	skipSeconds,
	skipOptions,
	playbackRate,
	autoDownloadScreenshot,
	isPlaylistAutoplayEnabled,
	onSkipSecondsChange,
	onPlaybackRateChange,
	onScreenshotSettingChange,
	onPlaylistAutoplayChange,
	onClose,
	settingsRef,
}: SettingsMenuProps) {
	const chapterSkipStore = useChapterSkipStore();
	const [newPattern, setNewPattern] = useState("");
	const [editingRule, setEditingRule] = useState<ChapterSkipRule | null>(null);
	const [editPattern, setEditPattern] = useState("");
	const [isVisible, setIsVisible] = useState(false);
	const [dragOffsetY, setDragOffsetY] = useState(0);
	const dragStartYRef = useRef<number | null>(null);
	const isDraggingRef = useRef(false);

	useEffect(() => {
		if (!show) {
			return;
		}
		if (isOpen) {
			const animationFrameId = window.requestAnimationFrame(() => {
				setIsVisible(true);
			});
			return () => {
				window.cancelAnimationFrame(animationFrameId);
			};
		}
		setIsVisible(false);
	}, [show, isOpen]);

	useEffect(() => {
		const handlePointerMove = (event: PointerEvent) => {
			handleDragMove(event.clientY);
		};
		const handlePointerEnd = () => {
			handleDragEnd();
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerEnd);
		window.addEventListener("pointercancel", handlePointerEnd);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerEnd);
			window.removeEventListener("pointercancel", handlePointerEnd);
		};
	});

	if (!show) {
		return null;
	}

	const closeSheet = () => {
		setDragOffsetY(0);
		onClose();
	};

	const handleDragStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
		event.preventDefault();
		dragStartYRef.current = event.clientY;
		isDraggingRef.current = true;
	};

	const handleDragMove = (clientY: number) => {
		if (!isDraggingRef.current || dragStartYRef.current === null) {
			return;
		}
		const nextOffset = Math.max(0, clientY - dragStartYRef.current);
		setDragOffsetY(nextOffset);
	};

	const handleDragEnd = () => {
		if (!isDraggingRef.current) {
			return;
		}
		isDraggingRef.current = false;
		dragStartYRef.current = null;
		if (dragOffsetY > 120) {
			closeSheet();
			return;
		}
		setDragOffsetY(0);
	};

	return (
		<div
			className={cn(
				"fixed inset-0 z-[99999] flex items-end transition-all duration-200",
				isVisible
					? "bg-overlay/80 backdrop-blur-[2px]"
					: "bg-transparent backdrop-blur-0",
			)}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					closeSheet();
				}
			}}
		>
			<div
				ref={settingsRef}
				className={cn(
					"mx-auto mb-0 w-full max-w-[40rem] rounded-t-[28px] border border-b-0 border-border bg-surface-variant pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] shadow-2xl transition-transform duration-200 ease-out will-change-transform",
					!isDraggingRef.current &&
						(isVisible ? "translate-y-0" : "translate-y-full"),
				)}
				style={{
					transform: `translateY(${dragOffsetY}px)`,
				}}
			>
				{settingsView === "main" && (
					<>
						<SheetHeader
							icon={Settings}
							title="設定"
							onDragStart={handleDragStart}
						/>
						<SheetSection>
							<MenuRow
								icon={Clock}
								label="スキップ秒数"
								value={`${skipSeconds}秒`}
								valueTone="warning"
								onClick={() => setSettingsView("skip")}
							/>
							<MenuRow
								icon={Play}
								label="再生速度"
								value={`${playbackRate}x`}
								valueTone="primary"
								onClick={() => setSettingsView("playback")}
							/>
							<MenuRow
								icon={Camera}
								label="スクリーンショット"
								value={autoDownloadScreenshot ? "自動DL" : "コピーのみ"}
								valueTone="primary"
								onClick={() => setSettingsView("screenshot")}
							/>
							<MenuRow
								icon={SkipForward}
								label="チャプタースキップ"
								value={`${chapterSkipStore.rules.filter((r) => r.enabled).length}個`}
								valueTone="primary"
								onClick={() => setSettingsView("chapter-skip")}
							/>
							<MenuRow
								icon={Play}
								label="プレイリスト自動再生"
								onClick={() =>
									onPlaylistAutoplayChange(!isPlaylistAutoplayEnabled)
								}
								trailing={
									<div className="flex items-center gap-3">
										<span
											className={cn(
												"text-sm font-medium",
												isPlaylistAutoplayEnabled
													? "text-primary"
													: "text-text-secondary",
											)}
										>
											{isPlaylistAutoplayEnabled ? "オン" : "オフ"}
										</span>
										<div
											className={cn(
												"flex h-6 w-10 items-center rounded-full border px-1 transition-colors",
												isPlaylistAutoplayEnabled
													? "justify-end border-primary/30 bg-primary/20"
													: "justify-start border-border bg-surface",
											)}
										>
											<div
												className={cn(
													"h-4 w-4 rounded-full",
													isPlaylistAutoplayEnabled
														? "bg-primary"
														: "bg-text-muted",
												)}
											/>
										</div>
									</div>
								}
							/>
						</SheetSection>
					</>
				)}

				{settingsView === "skip" && (
					<>
						<div className="flex items-center gap-3 px-4 pb-2 pt-3">
							<BackButton onClick={() => setSettingsView("main")} />
							<div className="flex items-center gap-2 text-base font-semibold text-text">
								<Clock className="h-5 w-5 text-warning" />
								スキップ秒数
							</div>
						</div>
						<SheetSection>
							{skipOptions.map((seconds) => (
								<OptionButton
									key={seconds}
									label={`${seconds}秒`}
									selected={skipSeconds === seconds}
									onClick={() => onSkipSecondsChange(seconds)}
									icon={Clock}
								/>
							))}
						</SheetSection>
					</>
				)}

				{settingsView === "playback" && (
					<>
						<div className="flex items-center gap-3 px-4 pb-2 pt-3">
							<BackButton onClick={() => setSettingsView("main")} />
							<div className="flex items-center gap-2 text-base font-semibold text-text">
								<Play className="h-5 w-5 text-primary" />
								再生速度
							</div>
						</div>
						<SheetSection>
							{[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
								<OptionButton
									key={rate}
									label={`${rate}x`}
									selected={playbackRate === rate}
									onClick={() => {
										onPlaybackRateChange(rate);
										setSettingsView("main");
									}}
									icon={Play}
								/>
							))}
						</SheetSection>
					</>
				)}

				{settingsView === "screenshot" && (
					<>
						<div className="flex items-center gap-3 px-4 pb-2 pt-3">
							<BackButton onClick={() => setSettingsView("main")} />
							<div className="flex items-center gap-2 text-base font-semibold text-text">
								<Camera className="h-5 w-5 text-primary" />
								スクリーンショット
							</div>
						</div>
						<SheetSection>
							<OptionButton
								label="クリップボードにコピーのみ"
								selected={!autoDownloadScreenshot}
								onClick={() => onScreenshotSettingChange(false)}
								icon={Camera}
							/>
							<OptionButton
								label="クリップボード + 自動ダウンロード"
								selected={autoDownloadScreenshot}
								onClick={() => onScreenshotSettingChange(true)}
								icon={Download}
							/>
						</SheetSection>
					</>
				)}

				{settingsView === "chapter-skip" && (
					<>
						<div className="flex items-center gap-3 px-4 pb-2 pt-3">
							<BackButton onClick={() => setSettingsView("main")} />
							<div className="flex items-center gap-2 text-base font-semibold text-text">
								<SkipForward className="h-5 w-5 text-primary" />
								チャプタースキップ
							</div>
						</div>
						<div className="px-4 pb-3">
							<div className="flex gap-2 rounded-2xl bg-surface p-2 ring-1 ring-border/60">
								<input
									id="new-pattern-input"
									type="text"
									value={newPattern}
									onChange={(e) => setNewPattern(e.target.value)}
									placeholder="CM、OP、EDなど"
									className="flex-1 rounded-xl bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none"
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
									className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-text-inverse transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
								>
									<Plus className="h-4 w-4" />
								</button>
							</div>
						</div>

						{chapterSkipStore.error && (
							<div className="px-4 pb-3 text-sm text-error">
								{chapterSkipStore.error}
							</div>
						)}

						<div className="max-h-64 space-y-2 overflow-y-auto px-4 pb-3">
							{chapterSkipStore.isLoading ? (
								<div className="py-6 text-center text-sm text-text-secondary">
									読み込み中...
								</div>
							) : chapterSkipStore.rules.length === 0 ? (
								<div className="py-6 text-center text-sm text-text-secondary">
									スキップパターンがありません
								</div>
							) : (
								chapterSkipStore.rules.map((rule) => (
									<div
										key={rule.id}
										className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-3 ring-1 ring-border/60"
									>
										{editingRule?.id === rule.id ? (
											<>
												<input
													type="text"
													value={editPattern}
													onChange={(e) => setEditPattern(e.target.value)}
													className="flex-1 rounded-xl bg-transparent px-2 py-2 text-sm text-text focus:outline-none"
													onKeyDown={(e) => {
														if (e.key === "Enter" && editPattern.trim()) {
															e.preventDefault();
															void chapterSkipStore.updateRule(rule.id, {
																pattern: editPattern.trim(),
															});
															setEditingRule(null);
															setEditPattern("");
														}
														if (e.key === "Escape") {
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
													className="text-primary transition-colors hover:text-primary/80"
												>
													<Check className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => {
														setEditingRule(null);
														setEditPattern("");
													}}
													className="text-text-secondary transition-colors hover:text-text"
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
														"flex h-5 w-5 items-center justify-center rounded-md border",
														rule.enabled
															? "border-primary bg-primary"
															: "border-border bg-transparent",
													)}
												>
													{rule.enabled ? (
														<Check className="h-3 w-3 text-text-inverse" />
													) : null}
												</button>
												<span
													className={cn(
														"flex-1 text-sm",
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
													className="text-text-secondary transition-colors hover:text-primary"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => chapterSkipStore.deleteRule(rule.id)}
													className="text-text-secondary transition-colors hover:text-error"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</>
										)}
									</div>
								))
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
