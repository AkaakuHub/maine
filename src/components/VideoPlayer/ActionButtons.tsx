"use client";

import { Heart, List, Share2 } from "lucide-react";

interface ActionButtonsProps {
	isLiked: boolean;
	isInWatchlist: boolean;
	onToggleLike: () => void;
	onToggleWatchlist: () => void;
	onShare: () => void;
}

export default function ActionButtons({
	isLiked,
	isInWatchlist,
	onToggleLike,
	onToggleWatchlist,
	onShare,
}: ActionButtonsProps) {
	return (
		<div className="flex items-center gap-3 mb-4">
			<button
				type="button"
				onClick={onToggleLike}
				className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
					isLiked
						? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg shadow-pink-500/25"
						: "bg-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-red-500/20 hover:text-pink-300 border border-slate-600"
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
						? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
						: "bg-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-cyan-500/20 hover:text-blue-300 border border-slate-600"
				}`}
			>
				<List size={16} />
				<span className="text-sm">リスト追加</span>
			</button>

			<button
				type="button"
				onClick={onShare}
				className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-slate-700/50 text-slate-300 hover:bg-gradient-to-r hover:from-green-500/20 hover:to-emerald-500/20 hover:text-green-300 border border-slate-600"
			>
				<Share2 size={16} />
				<span className="text-sm">共有</span>
			</button>
		</div>
	);
}
