"use client";

import { AlertTriangle, Download, Wifi, X } from "lucide-react";

interface StreamingWarningDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onContinueStreaming: () => void;
	onUseOffline: () => void;
	videoTitle: string;
}

const StreamingWarningDialog = ({
	isOpen,
	onClose,
	onContinueStreaming,
	onUseOffline,
	videoTitle,
}: StreamingWarningDialogProps) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
			onClick={onClose}
		>
			<div
				className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-600 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				{/* ヘッダー */}
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className="bg-amber-500/20 p-2 rounded-lg">
							<AlertTriangle className="h-5 w-5 text-amber-400" />
						</div>
						<h3 className="text-lg font-semibold text-white">
							オフライン版が利用可能
						</h3>
					</div>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-white transition-colors p-1"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* メッセージ */}
				<div className="mb-6">
					<p className="text-slate-300 mb-3">
						<span className="font-medium text-white">「{videoTitle}」</span>
						は既にオフラインで保存されています。
					</p>
					<p className="text-sm text-slate-400">
						ストリーミング再生よりもオフライン再生の方が高速で、インターネット接続も不要です。
					</p>
				</div>

				{/* アクション */}
				<div className="space-y-3">
					{/* オフライン再生（推奨） */}
					<button
						onClick={onUseOffline}
						className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-colors"
					>
						<Download className="h-5 w-5" />
						<div className="text-left">
							<div className="font-medium">オフライン再生（推奨）</div>
							<div className="text-xs opacity-80">高速・安定再生</div>
						</div>
					</button>

					{/* ストリーミング再生 */}
					<button
						onClick={onContinueStreaming}
						className="w-full flex items-center gap-3 p-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
					>
						<Wifi className="h-5 w-5" />
						<div className="text-left">
							<div className="font-medium">ストリーミング再生</div>
							<div className="text-xs opacity-80">インターネット接続が必要</div>
						</div>
					</button>

					{/* キャンセル */}
					<button
						onClick={onClose}
						className="w-full p-2 text-slate-400 hover:text-white transition-colors text-center"
					>
						キャンセル
					</button>
				</div>
			</div>
		</div>
	);
};

export default StreamingWarningDialog;
