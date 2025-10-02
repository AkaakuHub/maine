"use client";

import { Heart, List, Share2, Download } from "lucide-react";

interface ActionButtonsProps {
	isLiked: boolean;
	isInWatchlist: boolean;
	onToggleLike: () => void;
	onToggleWatchlist: () => void;
	onShare: () => void;
	onDownload?: () => void;
}

export default function ActionButtons({
	isLiked,
	isInWatchlist,
	onToggleLike,
	onToggleWatchlist,
	onShare,
	onDownload,
}: ActionButtonsProps) {
	return (
		<div className="flex items-center gap-3 mb-4 flex-wrap">
			<button
				type="button"
				onClick={onToggleLike}
				className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
					isLiked
						? "bg-error text-text-inverse shadow-lg"
						: "bg-surface-elevated/50 text-text-secondary hover:bg-error/20 hover:text-primary border border-border"
				}`}
			>
				<Heart size={16} className={isLiked ? "fill-current" : ""} />
				<span className="text-sm">いいね</span>
			</button>

			<button
				type="button"
				onClick={onToggleWatchlist}
				className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
					isInWatchlist
						? "bg-primary text-text-inverse shadow-lg"
						: "bg-surface-elevated/50 text-text-secondary hover:bg-primary/20 hover:text-primary border border-border"
				}`}
			>
				<List size={16} />
				<span className="text-sm">リスト追加</span>
			</button>

			<button
				type="button"
				onClick={onShare}
				className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-surface-elevated/50 text-text-secondary hover:bg-success/20 hover:text-success border border-border"
			>
				<Share2 size={16} />
				<span className="text-sm">共有</span>
			</button>

			{onDownload && (
				<button
					type="button"
					onClick={() => {
						onDownload();
					}}
					className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-surface-elevated/50 text-text-secondary hover:bg-primary/20 hover:text-primary border border-border"
				>
					<Download size={16} />
					<span className="text-sm">ダウンロード</span>
				</button>
			)}
		</div>
	);
}
