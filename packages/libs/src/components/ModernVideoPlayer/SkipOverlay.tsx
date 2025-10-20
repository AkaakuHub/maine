import { SkipBack, SkipForward } from "lucide-react";
import { formatDuration } from "../../libs/utils";

interface SkipOverlayProps {
	predictedTime: number | null;
	skipQueue: number;
	show: boolean;
}

export default function SkipOverlay({
	predictedTime,
	skipQueue,
	show,
}: SkipOverlayProps) {
	if (!show || predictedTime === null || skipQueue === 0) {
		return null;
	}

	return (
		<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
			<div className="bg-overlay backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center gap-4 border border-primary/30">
				{/* YouTube風の半円アイコン */}
				<div className="relative">
					<div className="w-12 h-12 flex items-center justify-center">
						{/* 半円の背景 */}
						<div className="absolute w-12 h-12 border-4 border-primary/30 rounded-full" />
						{/* ビデオーションする半円 */}
						<div
							className="absolute w-12 h-12 border-4 border-transparent border-t-primary rounded-full animate-spin"
							style={{ animationDuration: "0.8s" }}
						/>
						{/* 中央のアイコン */}
						{skipQueue > 0 ? (
							<SkipForward className="h-5 w-5 text-primary" />
						) : (
							<SkipBack className="h-5 w-5 text-primary" />
						)}
					</div>
				</div>

				{/* スキップ秒数とプレビュー時間 */}
				<div className="text-text">
					{/* 数字部分を固定幅にして「秒」の位置を安定させる */}
					<div className="text-lg font-bold text-primary flex items-center justify-center">
						<div className="flex items-baseline">
							<span className="font-mono text-right w-12 tabular-nums">
								{skipQueue > 0 ? "+" : ""}
								{skipQueue}
							</span>
							<span className="text-base ml-1">秒</span>
						</div>
					</div>
					<div className="text-sm text-text-secondary font-mono text-center">
						{formatDuration(predictedTime)}
					</div>
				</div>
			</div>
		</div>
	);
}
