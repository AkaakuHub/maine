"use client";

import { ArrowLeft, Home, Settings, Share2 } from "lucide-react";

interface NavigationProps {
	onGoBack: () => void;
	onGoHome: () => void;
	onShare: () => void;
	onOpenSettings: () => void;
}

export function Navigation({
	onGoBack,
	onGoHome,
	onShare,
	onOpenSettings,
}: NavigationProps) {
	return (
		<nav className="relative z-50 bg-surface/95 backdrop-blur-sm border-b border-border h-16 flex-shrink-0">
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
							onClick={onOpenSettings}
							className="p-2 text-text hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 active:scale-95"
							aria-label="設定"
						>
							<Settings size={18} />
						</button>
					</div>
				</div>
			</div>
		</nav>
	);
}
