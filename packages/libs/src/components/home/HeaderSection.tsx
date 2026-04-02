"use client";

import {
	FolderSearch,
	Grid,
	List,
	LogOut,
	Play,
	Settings,
	Shield,
	User,
	UserCog,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PWAInstallPrompt from "../../components/PWAInstallPrompt";
import { cn } from "../../libs/utils";
import type { ViewMode } from "../../stores/appStateStore";
import { useAuthStore } from "../../stores/auth-store";

interface HeaderSectionProps {
	viewMode: ViewMode;
	onShowSettings: () => void;
	onViewModeChange: (mode: ViewMode) => void;
	onScanNavigate: () => void;
	router?: { push: (path: string) => void }; // routerをpropsで受け取る
}

export function HeaderSection({
	viewMode,
	onShowSettings,
	onViewModeChange,
	onScanNavigate,
	router,
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
		<header className="sticky top-0 z-50 border-b border-border bg-surface/90 shadow-sm backdrop-blur-xl">
			<div className="mx-auto max-w-7xl">
				{/* Primary Header */}
				<div className="flex min-h-16 items-center justify-between px-3 py-2 sm:px-6">
					{/* Brand Section - Left */}
					<div className="mr-3 flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
						{/* Logo & Title */}
						<div className="flex shrink-0 items-center gap-2 sm:gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary shadow-sm shadow-primary/20 sm:h-10 sm:w-10">
								<Play className="h-4 w-4 text-text-inverse sm:h-5 sm:w-5" />
							</div>
							<div>
								<h1 className="whitespace-nowrap text-md font-semibold text-text lg:text-xl">
									Maine
								</h1>
								<p className="hidden text-xs text-text-secondary sm:block">
									ライブラリをすばやく再生
								</p>
							</div>
						</div>
					</div>

					{/* Actions Section - Right */}
					<div className="flex shrink-0 items-center gap-1 sm:gap-2">
						{/* View Mode Toggle */}
						<div className="hidden rounded-xl border border-border bg-surface-elevated/80 p-1 shadow-sm md:flex">
							<button
								type="button"
								onClick={() => onViewModeChange("grid")}
								className={cn(
									"flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all",
									viewMode === "grid"
										? "bg-primary text-text-inverse shadow-sm"
										: "text-text-secondary hover:bg-surface hover:text-text",
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
									"flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all",
									viewMode === "list"
										? "bg-primary text-text-inverse shadow-sm"
										: "text-text-secondary hover:bg-surface hover:text-text",
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
								className="rounded-xl border border-transparent p-1.5 text-text-secondary transition-all hover:border-border hover:bg-surface-elevated hover:text-text sm:p-2"
								aria-label="表示モード切り替え"
							>
								{viewMode === "grid" ? (
									<List className="w-4 h-4 sm:w-5 sm:h-5" />
								) : (
									<Grid className="w-4 h-4 sm:w-5 sm:h-5" />
								)}
							</button>
						</div>

						{/* Scan Button - Admin Only */}
						{user?.role === "ADMIN" && (
							<button
								type="button"
								onClick={onScanNavigate}
								className="rounded-xl border border-transparent p-1.5 text-text-secondary transition-all hover:border-border hover:bg-surface-elevated hover:text-text sm:p-2"
								aria-label="スキャン"
							>
								<FolderSearch className="w-4 h-4 sm:w-5 sm:h-5" />
							</button>
						)}

						{/* Permissions Button - Admin Only */}
						{user?.role === "ADMIN" && router && (
							<button
								type="button"
								onClick={() => router.push("/admin/permissions")}
								className="rounded-xl border border-transparent p-1.5 text-text-secondary transition-all hover:border-border hover:bg-surface-elevated hover:text-text sm:p-2"
								aria-label="権限管理"
							>
								<Shield className="w-4 h-4 sm:w-5 sm:h-5" />
							</button>
						)}

						{/* Settings Button */}
						<button
							type="button"
							onClick={onShowSettings}
							className="rounded-xl border border-transparent p-1.5 text-text-secondary transition-all hover:border-border hover:bg-surface-elevated hover:text-text sm:p-2"
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
									className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 text-text-secondary transition-all hover:border-border hover:bg-surface-elevated hover:text-text sm:p-2"
								>
									<User className="w-4 h-4 sm:w-5 sm:h-5" />
									<span className="hidden sm:block text-sm">
										{user.username}
									</span>
								</button>

								{/* Dropdown */}
								{isUserMenuOpen && (
									<div className="absolute right-0 top-full z-50 mt-2 min-w-56 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
										<div className="p-2">
											<div className="rounded-xl bg-surface-elevated px-3 py-3 text-sm text-text-secondary">
												<div className="font-medium text-text">
													{user.username}
												</div>
												<div className="text-xs">{user.email}</div>
												<div className="text-xs mt-1">役割: {user.role}</div>
											</div>
											<hr className="my-2 border-border" />
											<button
												type="button"
												onClick={() => {
													setIsUserMenuOpen(false);
													router?.push("/account");
												}}
												className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-elevated"
											>
												<UserCog className="w-4 h-4" />
												マイページ
											</button>
											<hr className="my-2 border-border" />
											<button
												type="button"
												onClick={() => {
													logout();
													setIsUserMenuOpen(false);
												}}
												className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-elevated"
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
