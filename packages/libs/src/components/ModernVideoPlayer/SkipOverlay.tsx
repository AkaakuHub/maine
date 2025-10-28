import { SkipBack, SkipForward } from "lucide-react";

interface SkipOverlayProps {
	predictedTime: number | null;
	skipQueue: number;
	show: boolean;
}

export default function SkipOverlay({
	predictedTime,
	skipQueue,
	show,
}: SkipOverlayProps) {
	if (!show || predictedTime === null || skipQueue === 0) {
		return null;
	}

	const isForward = skipQueue > 0;
	const containerAlignment = isForward
		? "justify-end pr-6 sm:pr-24"
		: "justify-start pl-6 sm:pl-24";

	return (
		<div className="absolute inset-0 pointer-events-none z-40">
			<div className={`flex h-full w-full ${containerAlignment} items-center`}>
				<div className="relative">
					<div className="relative flex h-16 sm:h-24 w-24 items-center justify-center">
						<span className="absolute inline-flex h-12 w-12 sm:h-18 sm:w-18 rounded-full bg-primary/25 animate-ping" />
						<span className="absolute inline-flex h-12 w-12 sm:h-18 sm:w-18 rounded-full bg-primary/45" />
						<span className="relative inline-flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center text-white drop-shadow">
							{isForward ? (
								<SkipForward
									className="h-6 w-6 sm:h-9 sm:w-9"
									fill="currentColor"
								/>
							) : (
								<SkipBack
									className="h-6 w-6 sm:h-9 sm:w-9"
									fill="currentColor"
								/>
							)}
						</span>
					</div>
					<div className="absolute left-1/2 top-full -translate-x-1/2 text-center text-primary drop-shadow-lg">
						<div className="text-sm font-semibold leading-tight whitespace-nowrap">
							{skipQueue > 0 ? "+" : ""}
							{skipQueue}
							<span className="ml-1">秒</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
