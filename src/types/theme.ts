export type ThemeMode = "light" | "dark" | "system";

export interface UseThemeReturn {
	theme: ThemeMode;
	resolvedTheme: "light" | "dark";
	setTheme: (theme: ThemeMode) => void;
}
