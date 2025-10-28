"use client";

import {
	Play,
	Grid,
	List,
	Settings,
	FolderSearch,
	LogOut,
	User,
} from "lucide-react";
import { cn } from "../../libs/utils";
import type { ViewMode } from "../../stores/appStateStore";
import PWAInstallPrompt from "../../components/PWAInstallPrompt";
import { useAuthStore } from "../../stores/auth-store";
import { useState, useRef, useEffect } from "react";

interface HeaderSectionProps {
	viewMode: ViewMode;
	onShowSettings: () => void;
	onViewModeChange: (mode: ViewMode) => void;
	onScanNavigate: () => void;
}

export function HeaderSection({
	viewMode,
	onShowSettings,
	onViewModeChange,
	onScanNavigate,
}: HeaderSectionProps) {
	const { user, logout } = useAuthStore();
	const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
	const userMenuRef = useRef<HTMLDivElement>(null);

	// 外側クリックでメニューを閉じる
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				userMenuRef.current &&
				!userMenuRef.current.contains(event.target as Node)
			) {
				setIsUserMenuOpen(false);
			}
		};

		if (isUserMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isUserMenuOpen]);
	return (
		<header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-border">
			<div className="max-w-7xl mx-auto">
				{/* Primary Header */}
				<div className="flex items-center justify-between min-h-16 px-3 sm:px-6 py-2">
					{/* Brand Section - Left */}
					<div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-3">
						{/* Logo & Title */}
						<div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
							<div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
								<Play className="w-4 h-4 sm:w-5 sm:h-5 text-text-inverse" />
							</div>
							<div>
								<h1 className="text-md lg:text-xl font-semibold text-text whitespace-nowrap">
									Maine
								</h1>
							</div>
						</div>
					</div>

					{/* Actions Section - Right */}
					<div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
						{/* View Mode Toggle */}
						<div className="hidden md:flex bg-surface-elevated rounded-lg p-0.5">
							<button
								type="button"
								onClick={() => onViewModeChange("grid")}
								className={cn(
									"flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
									viewMode === "grid"
										? "bg-primary text-text-inverse"
										: "text-text-secondary hover:text-text hover:bg-surface-elevated",
								)}
								aria-pressed={viewMode === "grid"}
							>
								<Grid className="w-4 h-4" />
								<span>グリッド</span>
							</button>
							<button
								type="button"
								onClick={() => onViewModeChange("list")}
								className={cn(
									"flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
									viewMode === "list"
										? "bg-primary text-text-inverse"
										: "text-text-secondary hover:text-text hover:bg-surface-elevated",
								)}
								aria-pressed={viewMode === "list"}
							>
								<List className="w-4 h-4" />
								<span>リスト</span>
							</button>
						</div>

						{/* Mobile View Mode Toggle */}
						<div className="md:hidden">
							<button
								type="button"
								onClick={() =>
									onViewModeChange(viewMode === "grid" ? "list" : "grid")
								}
								className="p-1.5 sm:p-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors"
								aria-label="表示モード切り替え"
							>
								{viewMode === "grid" ? (
									<List className="w-4 h-4 sm:w-5 sm:h-5" />
								) : (
									<Grid className="w-4 h-4 sm:w-5 sm:h-5" />
								)}
							</button>
						</div>

						{/* Scan Button */}
						<button
							type="button"
							onClick={onScanNavigate}
							className="p-1.5 sm:p-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors"
							aria-label="スキャン"
						>
							<FolderSearch className="w-4 h-4 sm:w-5 sm:h-5" />
						</button>

						{/* Settings Button */}
						<button
							type="button"
							onClick={onShowSettings}
							className="p-1.5 sm:p-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors"
							aria-label="設定"
						>
							<Settings className="w-4 h-4 sm:w-5 sm:h-5" />
						</button>

						{/* PWA Install */}
						<PWAInstallPrompt />

						{/* User Menu */}
						{user && (
							<div className="relative" ref={userMenuRef}>
								<button
									type="button"
									onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
									className="flex items-center gap-2 p-1.5 sm:p-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors"
								>
									<User className="w-4 h-4 sm:w-5 sm:h-5" />
									<span className="hidden sm:block text-sm">
										{user.username}
									</span>
								</button>

								{/* Dropdown */}
								{isUserMenuOpen && (
									<div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 min-w-48">
										<div className="p-2">
											<div className="px-3 py-2 text-sm text-text-secondary">
												<div className="font-medium text-text">
													{user.username}
												</div>
												<div className="text-xs">{user.email}</div>
												<div className="text-xs mt-1">役割: {user.role}</div>
											</div>
											<hr className="my-1 border-border" />
											<button
												type="button"
												onClick={() => {
													logout();
													setIsUserMenuOpen(false);
												}}
												className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-elevated rounded-md transition-colors"
											>
												<LogOut className="w-4 h-4" />
												ログアウト
											</button>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
