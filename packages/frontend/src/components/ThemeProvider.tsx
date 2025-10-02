"use client";

import { useTheme } from "@/hooks/useTheme";

interface ThemeProviderProps {
	children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
	useTheme();

	return <>{children}</>;
}
