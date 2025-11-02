"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeMode, UseThemeReturn } from "../types/theme";
import { THEME } from "../utils/constants";

export function useTheme(): UseThemeReturn {
	const [theme, setThemeState] = useState<ThemeMode>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(THEME.STORAGE_KEY) as ThemeMode;
			return saved && Object.values(THEME.MODES).includes(saved)
				? saved
				: (THEME.DEFAULT_MODE as ThemeMode);
		}
		return THEME.DEFAULT_MODE as ThemeMode;
	});

	const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
		// SSRとの整合性を保つため、初期状態をダークに設定
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(THEME.STORAGE_KEY) as ThemeMode;
			const currentTheme =
				saved && Object.values(THEME.MODES).includes(saved)
					? saved
					: (THEME.DEFAULT_MODE as ThemeMode);

			if (currentTheme === "system") {
				return window.matchMedia("(prefers-color-scheme: dark)").matches
					? "dark"
					: "light";
			}
			return currentTheme;
		}
		return "dark";
	});

	const updateResolvedTheme = useCallback((currentTheme: ThemeMode) => {
		if (currentTheme === "system") {
			const systemPrefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			setResolvedTheme(systemPrefersDark ? "dark" : "light");
		} else {
			setResolvedTheme(currentTheme);
		}
	}, []);

	const applyTheme = useCallback((resolved: "light" | "dark") => {
		const root = document.documentElement;
		if (resolved === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
	}, []);

	const setTheme = useCallback(
		(newTheme: ThemeMode) => {
			setThemeState(newTheme);
			localStorage.setItem(THEME.STORAGE_KEY, newTheme);
			updateResolvedTheme(newTheme);
		},
		[updateResolvedTheme],
	);

	useEffect(() => {
		updateResolvedTheme(theme);
	}, [theme, updateResolvedTheme]);

	useEffect(() => {
		applyTheme(resolvedTheme);
	}, [resolvedTheme, applyTheme]);

	useEffect(() => {
		if (theme === "system") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

			const handleChange = () => {
				updateResolvedTheme("system");
			};

			mediaQuery.addEventListener("change", handleChange);
			return () => mediaQuery.removeEventListener("change", handleChange);
		}
	}, [theme, updateResolvedTheme]);

	return {
		theme,
		resolvedTheme,
		setTheme,
	};
}
