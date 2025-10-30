"use client";

import { cn } from "../../libs/utils";
import { Film, Search, FolderOpen, RefreshCw, Download } from "lucide-react";
import Button from "../ui/Button";

interface EmptyStateProps {
	type:
		| "no-videos"
		| "no-search-results"
		| "loading-error"
		| "no-offline-videos"
		| "video-not-found";
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
			case "no-videos":
				return {
					icon: <FolderOpen className="h-20 w-20 text-text-secondary" />,
					title: "動画が見つかりません",
					description: (
						<div className="space-y-2">
							<p>動画フォルダに動画ファイルがありません。</p>
						</div>
					),
					action: onRetry ? (
						<button
							type="button"
							onClick={onRetry}
							className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary text-text rounded-lg transition-colors"
						>
							<RefreshCw className="h-4 w-4" />
							データベースを更新
						</button>
					) : null,
				};

			case "no-search-results":
				return {
					icon: <Search className="h-20 w-20 text-text-secondary" />,
					title: "検索結果が見つかりません",
					description: (
						<div className="space-y-2">
							<p>
								「<span className="font-semibold text-text">{searchTerm}</span>
								」に一致する動画はありません。
							</p>
							<p className="text-sm">別のキーワードで検索してみてください。</p>
						</div>
					),
					action: null,
				};

			case "loading-error":
				return {
					icon: <Film className="h-20 w-20 text-error" />,
					title: "読み込みエラー",
					description: (
						<div className="space-y-2">
							<p>動画データの読み込み中にエラーが発生しました。</p>
							<p className="text-sm">
								ネットワーク接続を確認して、再試行してください。
							</p>
						</div>
					),
					action: onRetry ? (
						<button
							type="button"
							onClick={onRetry}
							className="flex items-center gap-2 px-6 py-3 bg-error hover:bg-error text-text rounded-lg transition-colors"
						>
							<RefreshCw className="h-4 w-4" />
							再試行
						</button>
					) : null,
				};

			case "no-offline-videos":
				return {
					icon: <Download className="h-20 w-20 text-text-secondary" />,
					title: "オフライン動画がありません",
					description: (
						<div className="space-y-2">
							<p>まだオフライン用に保存された動画がありません。</p>
							<p className="text-sm">
								ストリーミングタブから動画をダウンロードしてオフラインで楽しめます。
							</p>
						</div>
					),
					action: null,
				};

			case "video-not-found":
				return {
					icon: <Film className="h-20 w-20 text-warning" />,
					title: "動画が見つかりません",
					description: (
						<div className="space-y-2">
							<p>お探しの動画は見つかりませんでした。</p>
							<p className="text-sm">
								動画が削除されたか、URLが変更されている可能性があります。
							</p>
						</div>
					),
					action: onRetry ? (
						<Button
							type="button"
							onClick={onRetry}
							className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary text-text rounded-lg transition-colors"
						>
							<RefreshCw className="h-4 w-4" />
							ホームに戻る
						</Button>
					) : null,
				};

			default:
				return {
					icon: <Film className="h-20 w-20 text-text-secondary" />,
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

			<h3 className="text-2xl font-semibold text-text mb-4">{content.title}</h3>

			<div className="text-text-secondary mb-8 max-w-md">
				{content.description}
			</div>

			{content.action}
		</div>
	);
};

export { EmptyState };
