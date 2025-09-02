import { cn } from "@/libs/utils";
import type { VideoChapter } from "@/services/chapterService";

interface ChapterProgressBarProps {
	duration: number;
	currentTime: number;
	chapters: VideoChapter[];
	onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
	getSeekStep: () => number;
	className?: string;
}

export default function ChapterProgressBar({
	duration,
	currentTime,
	chapters,
	onSeek,
	getSeekStep,
	className = "",
}: ChapterProgressBarProps) {
	// 現在のチャプターを取得
	const getCurrentChapter = () => {
		return chapters.find(
			(chapter) =>
				currentTime >= chapter.startTime && currentTime <= chapter.endTime,
		);
	};

	// シークバーでの位置計算
	const getChapterPosition = (chapter: VideoChapter) => {
		return (chapter.startTime / duration) * 100;
	};

	// range input の onChange ハンドラー
	const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onSeek(e);
	};

	if (chapters.length === 0) {
		// チャプターがない場合は通常のシークバー
		return (
			<div className={cn("mb-3", className)}>
				<input
					type="range"
					min={0}
					max={duration || 0}
					step={getSeekStep()}
					value={currentTime}
					onChange={handleSeekChange}
					className="w-full h-2 bg-surface-hover rounded-lg appearance-none cursor-pointer slider progress-slider"
				/>
			</div>
		);
	}

	const currentChapter = getCurrentChapter();

	return (
		<div className={cn("mb-3", className)}>
			{/* チャプタータイトル表示 */}
			{currentChapter && (
				<div className="flex items-center justify-between mb-1 text-xs text-text-secondary">
					<span>{currentChapter.title}</span>
				</div>
			)}

			{/* チャプター対応シークバー */}
			<div className="relative w-full h-3 flex items-center">
				{/* 分割された背景バー */}
				{chapters.map((chapter, index) => {
					const isCurrentChapter =
						currentTime >= chapter.startTime && currentTime <= chapter.endTime;
					const width =
						((chapter.endTime - chapter.startTime) / duration) * 100;
					const left = getChapterPosition(chapter);

					return (
						<div
							key={`bg-${chapter.id}`}
							className={cn(
								"absolute bg-surface-hover",
								isCurrentChapter ? "h-3 top-0" : "h-2 top-0.5",
								index === 0 ? "rounded-l-lg" : "",
								index === chapters.length - 1 ? "rounded-r-lg" : "",
							)}
							style={{
								left: `${left}%`,
								width: `${width}%`,
							}}
						/>
					);
				})}

				{/* 分割されたプログレスバー */}
				{chapters.map((chapter, index) => {
					const isCurrentChapter =
						currentTime >= chapter.startTime && currentTime <= chapter.endTime;
					const chapterLeft = getChapterPosition(chapter);
					const chapterWidth =
						((chapter.endTime - chapter.startTime) / duration) * 100;

					let progressWidth = 0;
					if (currentTime >= chapter.endTime) {
						progressWidth = chapterWidth; // このチャプターは完全に再生済み
					} else if (currentTime > chapter.startTime) {
						const progressInChapter = currentTime - chapter.startTime;
						progressWidth =
							(progressInChapter / (chapter.endTime - chapter.startTime)) *
							chapterWidth;
					}

					if (progressWidth <= 0) return null;

					return (
						<div
							key={`progress-${chapter.id}`}
							className={cn(
								"absolute bg-primary",
								isCurrentChapter ? "h-3 top-0" : "h-2 top-0.5",
								index === 0 ? "rounded-l-lg" : "",
								index === chapters.length - 1 ? "rounded-r-lg" : "",
							)}
							style={{
								left: `${chapterLeft}%`,
								width: `${progressWidth}%`,
							}}
						/>
					);
				})}

				{/* チャプター区切り線 */}
				<div className="absolute inset-0 pointer-events-none z-20">
					{chapters.map((chapter) => {
						const isCurrentChapter =
							currentTime >= chapter.startTime &&
							currentTime <= chapter.endTime;
						return (
							<div
								key={`divider-${chapter.id}`}
								className={cn(
									"absolute w-0.5 bg-text-inverse/60 rounded-full",
									isCurrentChapter ? "h-3 top-0" : "h-2 top-0.5",
								)}
								style={{
									left: `${getChapterPosition(chapter)}%`,
									transform: "translateX(-50%)",
								}}
							/>
						);
					})}
				</div>

				{/* 透明なシークバー */}
				<input
					type="range"
					min={0}
					max={duration || 0}
					step={getSeekStep()}
					value={currentTime}
					onChange={handleSeekChange}
					className="absolute inset-0 w-full h-3 bg-transparent appearance-none cursor-pointer z-30 opacity-0"
				/>
			</div>
		</div>
	);
}
