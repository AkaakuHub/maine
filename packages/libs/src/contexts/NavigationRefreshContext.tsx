"use client";

import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useState,
} from "react";

interface NavigationRefreshContextType {
	triggerVideoRefresh: () => void;
	shouldRefreshVideos: boolean;
	consumeRefresh: () => void;
}

const NavigationRefreshContext = createContext<
	NavigationRefreshContextType | undefined
>(undefined);

interface NavigationRefreshProviderProps {
	children: ReactNode;
}

export function NavigationRefreshProvider({
	children,
}: NavigationRefreshProviderProps) {
	const [shouldRefreshVideos, setShouldRefreshVideos] = useState(false);

	const triggerVideoRefresh = useCallback(() => {
		setShouldRefreshVideos(true);
	}, []);

	const consumeRefresh = useCallback(() => {
		setShouldRefreshVideos(false);
	}, []);

	const value = {
		triggerVideoRefresh,
		shouldRefreshVideos,
		consumeRefresh,
	};

	return (
		<NavigationRefreshContext.Provider value={value}>
			{children}
		</NavigationRefreshContext.Provider>
	);
}

export function useNavigationRefresh() {
	const context = useContext(NavigationRefreshContext);
	if (context === undefined) {
		throw new Error(
			"useNavigationRefresh must be used within a NavigationRefreshProvider",
		);
	}
	return context;
}
