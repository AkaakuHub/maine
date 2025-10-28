"use client";

import { useEffect, useState } from "react";

/**
 * 最新ブラウザに対応したモバイル判定関数。
 * 可能なら navigator.userAgentData.mobile を使用。
 * フォールバックとして UA 判定とタッチサポートを併用。
 */
function isMobileEnvironment(): boolean {
	if (typeof window === "undefined") return false;

	const nav = window.navigator as Navigator & {
		userAgentData?: { mobile?: boolean };
		maxTouchPoints?: number;
	};

	const userAgent = nav.userAgent || "";
	const userAgentDataMobile = nav.userAgentData?.mobile;
	const maxTouchPoints = nav.maxTouchPoints ?? 0;
	const hasTouchStart = "ontouchstart" in window;
	const platform = nav.platform || "";

	// 1. iOSの場合は最優先で判定（userAgentData.mobileがfalseでも）
	const isIOS =
		/iPhone|iPad|iPod/.test(userAgent) ||
		(/Mac/.test(platform) && maxTouchPoints > 0);
	if (isIOS) {
		return true;
	}

	// 2. userAgentData があれば使用（iOS以外）
	if (typeof userAgentDataMobile === "boolean") {
		return userAgentDataMobile;
	}

	// 3. タッチサポートを確認（PCの一部も該当するが補助条件）
	if (hasTouchStart || maxTouchPoints > 1) {
		return true;
	}

	// 4. UA文字列のフォールバック（旧ブラウザ用）
	const isMobileByUA = /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
		userAgent,
	);
	return isMobileByUA;
}

/**
 * React Hook版: isMobileの状態を返す
 * リサイズやorientationの監視は不要。UA変更はブラウザ再起動時のみ。
 */
export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState<boolean>(() =>
		isMobileEnvironment(),
	);

	useEffect(() => {
		// userAgentDataが動的更新されるケースに対応
		const nav = window.navigator as Navigator & {
			userAgentData?: {
				mobile?: boolean;
				addEventListener?: (
					type: string,
					listener: EventListenerOrEventListenerObject,
					options?: boolean | AddEventListenerOptions,
				) => void;
				removeEventListener?: (
					type: string,
					listener: EventListenerOrEventListenerObject,
					options?: boolean | EventListenerOptions,
				) => void;
			};
		};

		const update = () => setIsMobile(isMobileEnvironment());

		// 一部ブラウザでは userAgentData.change イベントをサポート
		if (nav.userAgentData?.addEventListener) {
			nav.userAgentData.addEventListener("change", update);
			return () => nav.userAgentData?.removeEventListener?.("change", update);
		}

		// それ以外では1回のみ判定（リスナー不要）
		update();
	}, []);

	return isMobile;
}
