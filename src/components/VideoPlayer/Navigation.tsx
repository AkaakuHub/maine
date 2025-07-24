"use client";

import { ArrowLeft, Home, Share2, MoreVertical } from "lucide-react";

interface NavigationProps {
	onGoBack: () => void;
	onGoHome: () => void;
	onShare: () => void;
}

export default function Navigation({
	onGoBack,
	onGoHome,
	onShare,
}: NavigationProps) {
	return (
		<nav className="relative z-50 bg-gradient-to-r from-slate-900/95 via-purple-900/20 to-blue-900/20 backdrop-blur-sm border-b border-purple-500/20 h-16 flex-shrink-0">
			<div className="container mx-auto px-4 h-full">
				<div className="flex items-center justify-between h-full">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onGoBack}
							className="flex items-center gap-2 text-text hover:text-primary transition-all duration-200 p-2 rounded-lg hover:bg-primary/10 active:scale-95"
						>
							<ArrowLeft size={18} />
							<span className="hidden sm:inline">戻る</span>
						</button>

						<button
							type="button"
							onClick={onGoHome}
							className="flex items-center gap-2 text-text hover:text-primary transition-all duration-200 p-2 rounded-lg hover:bg-primary/10 active:scale-95"
						>
							<Home size={18} />
							<span className="hidden sm:inline">ホーム</span>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onShare}
							className="p-2 text-text hover:text-success hover:bg-success/10 rounded-lg transition-all duration-200 active:scale-95"
							aria-label="共有"
						>
							<Share2 size={18} />
						</button>
						<button
							type="button"
							className="p-2 text-text hover:text-text-secondary hover:bg-surface-hover rounded-lg transition-all duration-200 active:scale-95"
							aria-label="その他のオプション"
						>
							<MoreVertical size={18} />
						</button>
					</div>
				</div>
			</div>
		</nav>
	);
}
