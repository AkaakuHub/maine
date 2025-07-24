"use client";

interface HelpModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-overlay flex items-center justify-center z-[100000]">
			<div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-purple-500/30 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-text text-lg font-bold flex items-center gap-2">
						<span className="text-2xl">⌨️</span>
						キーボードショートカット
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-text-secondary hover:text-text transition-colors text-2xl leading-none"
					>
						×
					</button>
				</div>
				<div className="space-y-3 text-sm">
					<div className="grid grid-cols-2 gap-3">
						<div className="text-text-secondary">
							<kbd className="px-2 py-1 bg-surface-elevated rounded text-xs">
								Space
							</kbd>
							<span className="ml-2">再生/停止</span>
						</div>
						<div className="text-text-secondary">
							<kbd className="px-2 py-1 bg-surface-elevated rounded text-xs">
								←/→
							</kbd>
							<span className="ml-2">スキップ</span>
						</div>
						<div className="text-text-secondary">
							<kbd className="px-2 py-1 bg-surface-elevated rounded text-xs">
								↑/↓
							</kbd>
							<span className="ml-2">音量</span>
						</div>
						<div className="text-text-secondary">
							<kbd className="px-2 py-1 bg-surface-elevated rounded text-xs">
								F
							</kbd>
							<span className="ml-2">フルスクリーン</span>
						</div>
						<div className="text-text-secondary">
							<kbd className="px-2 py-1 bg-surface-elevated rounded text-xs">
								M
							</kbd>
							<span className="ml-2">ミュート</span>
						</div>
						<div className="text-text-secondary">
							<kbd className="px-2 py-1 bg-surface-elevated rounded text-xs">
								S
							</kbd>
							<span className="ml-2">スクリーンショット</span>
						</div>
						<div className="text-text-secondary">
							<kbd className="px-2 py-1 bg-surface-elevated rounded text-xs">
								?
							</kbd>
							<span className="ml-2">ヘルプ表示</span>
						</div>
						<div className="text-text-secondary">
							<kbd className="px-2 py-1 bg-surface-elevated rounded text-xs">
								Esc
							</kbd>
							<span className="ml-2">閉じる</span>
						</div>
					</div>
					<div className="mt-4 pt-3 border-t border-border-muted">
						<h4 className="text-primary font-semibold mb-2">マウス操作</h4>
						<div className="space-y-1 text-xs text-text-secondary">
							<div>• クリック: 再生/停止</div>
							<div>• ダブルクリック（左側）: 後退スキップ</div>
							<div>• ダブルクリック（右側）: 前進スキップ</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
