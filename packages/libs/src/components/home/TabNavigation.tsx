"use client";

import { Wifi } from "lucide-react";

export function TabNavigation() {
	return (
		<nav className="bg-surface">
			<div className="max-w-7xl mx-auto px-3 sm:px-6">
				<div className="flex space-x-4 sm:space-x-8 -mb-px">
					<div className="flex items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-1 text-sm font-medium border-b-2 border-primary text-primary">
						<Wifi className="w-4 h-4" />
						<span>ストリーミング</span>
					</div>
				</div>
			</div>
		</nav>
	);
}
