"use client";

import { Heart, List, Share2 } from "lucide-react";
import type { AnimeInfo } from "@/types/AnimeInfo";

interface VideoInfoProps {
	animeInfo: AnimeInfo;
	isLiked: boolean;
	isInWatchlist: boolean;
	showDescription: boolean;
	onToggleLike: () => void;
	onToggleWatchlist: () => void;
	onShare: () => void;
	onToggleDescription: () => void;
}

export default function VideoInfo({
	animeInfo,
	isLiked,
	isInWatchlist,
	showDescription,
	onToggleLike,
	onToggleWatchlist,
	onShare,
	onToggleDescription,
}: VideoInfoProps) {
	return (
		<div className="p-4 border-b border-purple-500/20">
			<h1 className="text-xl font-bold text-white mb-2 leading-tight">
				{animeInfo.title}
			</h1>
			<p className="text-purple-300 mb-3 font-medium">{animeInfo.episode}</p>

			<div className="flex flex-wrap items-center gap-3 text-sm text-slate-300 mb-4">
				<span className="px-2 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white font-medium">
					{animeInfo.genre}
				</span>
				<span>{animeInfo.year}</span>
				<span>•</span>
				<span>{animeInfo.duration}</span>
			</div>

			{/* アクションボタン */}
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

			{/* 概要 */}
			<div>
				<button
					type="button"
					onClick={onToggleDescription}
					className="text-left w-full mb-3"
				>
					<h3 className="text-white font-semibold flex items-center justify-between">
						概要
						<span className="text-purple-300 text-sm font-medium">
							{showDescription ? "簡潔に表示" : "もっと見る"}
						</span>
					</h3>
				</button>

				<p
					className={`text-slate-300 text-sm leading-relaxed transition-all duration-300 ${
						showDescription ? "" : "overflow-hidden text-ellipsis"
					}`}
					style={
						!showDescription
							? {
									display: "-webkit-box",
									WebkitLineClamp: 3,
									WebkitBoxOrient: "vertical",
									overflow: "hidden",
								}
							: {}
					}
				>
					{animeInfo.description}
				</p>
			</div>
		</div>
	);
}
