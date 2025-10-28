"use client";

import { Heart, List, Share2, Download } from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useState } from "react";
import type { VideoInfoType } from "../../types/VideoInfo";

interface ActionButtonsProps {
	isLiked: boolean;
	isInWatchlist: boolean;
	video: VideoInfoType;
	onToggleLike: () => void;
	onToggleWatchlist: () => void;
	onShare: () => void;
	onDownload: () => void;
}

export default function ActionButtons({
	isLiked,
	isInWatchlist,
	video,
	onToggleLike,
	onToggleWatchlist,
	onShare,
	onDownload,
}: ActionButtonsProps) {
	const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
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

			{video && (
				<button
					type="button"
					onClick={() => {
						setShowDownloadConfirm(true);
					}}
					className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-surface-elevated/50 text-text-secondary hover:bg-primary/20 hover:text-primary border border-border"
				>
					<Download size={16} />
					<span className="text-sm">ダウンロード</span>
				</button>
			)}

			{/* ダウンロード確認ダイアログ */}
			<ConfirmDialog
				isOpen={showDownloadConfirm}
				onClose={() => setShowDownloadConfirm(false)}
				title="動画をダウンロード"
				message={
					<div>
						<p className="text-text-secondary mb-2">
							この動画をダウンロードしますか？
						</p>
						<div className="bg-surface-elevated/50 rounded-lg p-3 mb-2">
							<div className="text-sm text-text mb-1">
								<strong>ファイル名:</strong> {video.fullTitle}
							</div>
						</div>
					</div>
				}
				actions={[
					{
						label: "ダウンロード",
						onClick: () => {
							setShowDownloadConfirm(false);
							onDownload();
						},
						variant: "primary",
						icon: Download,
					},
				]}
				icon={Download}
				iconColor="text-primary"
			/>
		</div>
	);
}
