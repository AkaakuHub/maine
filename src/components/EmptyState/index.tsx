"use client";

import { Film, Search, FolderOpen, RefreshCw } from "lucide-react";
import { cn } from "@/libs/utils";

interface EmptyStateProps {
	type: "no-animes" | "no-search-results" | "loading-error";
	searchTerm?: string;
	onRetry?: () => void;
	className?: string;
}

const EmptyState = ({
	type,
	searchTerm,
	onRetry,
	className,
}: EmptyStateProps) => {
	const getContent = () => {
		switch (type) {
			case "no-animes":
				return {
					icon: <FolderOpen className="h-20 w-20 text-slate-400" />,
					title: "アニメが見つかりません",
					description: (
						<div className="space-y-2">
							<p>動画フォルダにアニメファイルがありません。</p>
							<p className="text-sm">対応形式: .mp4, .mkv, .avi, .mov</p>
						</div>
					),
					action: onRetry ? (
						<button
							type="button"
							onClick={onRetry}
							className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
						>
							<RefreshCw className="h-4 w-4" />
							データベースを更新
						</button>
					) : null,
				};

			case "no-search-results":
				return {
					icon: <Search className="h-20 w-20 text-slate-400" />,
					title: "検索結果が見つかりません",
					description: (
						<div className="space-y-2">
							<p>
								「<span className="font-semibold text-white">{searchTerm}</span>
								」に一致するアニメはありません。
							</p>
							<p className="text-sm">別のキーワードで検索してみてください。</p>
						</div>
					),
					action: null,
				};

			case "loading-error":
				return {
					icon: <Film className="h-20 w-20 text-red-400" />,
					title: "読み込みエラー",
					description: (
						<div className="space-y-2">
							<p>アニメデータの読み込み中にエラーが発生しました。</p>
							<p className="text-sm">
								ネットワーク接続を確認して、再試行してください。
							</p>
						</div>
					),
					action: onRetry ? (
						<button
							type="button"
							onClick={onRetry}
							className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
						>
							<RefreshCw className="h-4 w-4" />
							再試行
						</button>
					) : null,
				};

			default:
				return {
					icon: <Film className="h-20 w-20 text-slate-400" />,
					title: "データなし",
					description: <p>表示するコンテンツがありません。</p>,
					action: null,
				};
		}
	};

	const content = getContent();

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center py-20 px-4 text-center",
				className,
			)}
		>
			<div className="mb-6">{content.icon}</div>

			<h3 className="text-2xl font-semibold text-white mb-4">
				{content.title}
			</h3>

			<div className="text-slate-400 mb-8 max-w-md">{content.description}</div>

			{content.action}
		</div>
	);
};

export default EmptyState;
