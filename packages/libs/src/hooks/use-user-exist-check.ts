"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore } from "../stores/auth-store";

export function useUserExistCheck() {
	const { isAuthenticated, user, userExists, checkUserExists, logout } =
		useAuthStore();

	// ユーザー存在チェックを実行する関数
	const performUserExistCheck = useCallback(async () => {
		if (isAuthenticated && user && userExists === null) {
			try {
				await checkUserExists();
			} catch (_error) {
				// エラーの場合はログアウト
				logout();
			}
		}
	}, [isAuthenticated, user, userExists, checkUserExists, logout]);

	// ユーザーが存在しない場合の処理
	const handleUserNotExists = useCallback(() => {
		if (userExists === false) {
			logout();
		}
	}, [userExists, logout]);

	// ユーザー存在チェックをトリガーするuseEffect
	useEffect(() => {
		performUserExistCheck();
	}, [performUserExistCheck]);

	// ユーザーが存在しない場合の処理をトリガーするuseEffect
	useEffect(() => {
		handleUserNotExists();
	}, [handleUserNotExists]);

	return {
		isCheckingUserExists: isAuthenticated && user && userExists === null,
		userExists,
	};
}
