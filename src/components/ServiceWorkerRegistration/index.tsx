"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/sw.js")
				.then((registration) => {
					console.log("Service Worker 登録成功:", registration.scope);
				})
				.catch((error) => {
					console.log("Service Worker 登録失敗:", error);
				});
		}
	}, []);

	return null;
}
