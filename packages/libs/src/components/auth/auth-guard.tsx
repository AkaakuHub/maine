"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../../stores/auth-store";

interface AuthGuardProps {
	children: React.ReactNode;
	requireAuth?: boolean;
	redirectTo?: string;
	onRedirect?: (path?: string) => void;
}

export function AuthGuard({
	children,
	requireAuth = true,
	redirectTo = "/login",
	onRedirect,
}: AuthGuardProps) {
	const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
	const [isChecking, setIsChecking] = useState(true);
	const hasCheckedRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const verifyAuth = async () => {
			if (requireAuth && !isAuthenticated && !hasCheckedRef.current) {
				hasCheckedRef.current = true;
				await checkAuth();
			}
			setIsChecking(false);
		};

		verifyAuth();
	}, [isAuthenticated, requireAuth]);

	useEffect(() => {
		if (!isChecking) {
			if (requireAuth && !isAuthenticated && !isLoading) {
				onRedirect?.(redirectTo);
			} else if (!requireAuth && isAuthenticated) {
				onRedirect?.("/");
			}
		}
	}, [
		isChecking,
		isAuthenticated,
		isLoading,
		requireAuth,
		onRedirect,
		redirectTo,
	]);

	// ローディング中
	if (isLoading || isChecking) {
		return (
			<div className="min-h-screen bg-surface-variant flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
					<p className="text-muted-foreground">読み込み中...</p>
				</div>
			</div>
		);
	}

	// 認証が必要で未認証の場合
	if (requireAuth && !isAuthenticated) {
		return null; // リダイレクト中
	}

	// 認証が不要で認証済みの場合
	if (!requireAuth && isAuthenticated) {
		return null; // リダイレクト中
	}

	return <>{children}</>;
}
