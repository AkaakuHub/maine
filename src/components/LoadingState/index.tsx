"use client";

import { cn } from "@/libs/utils";

interface LoadingStateProps {
	type?: "initial" | "search" | "refresh";
	message?: string;
	className?: string;
}

const LoadingSpinner = ({
	className,
	size = "lg",
}: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) => {
	const sizeClasses = {
		sm: "w-8 h-8",
		md: "w-12 h-12",
		lg: "w-16 h-16",
		xl: "w-24 h-24",
	};

	const dotSizeClasses = {
		sm: "w-1 h-1",
		md: "w-1.5 h-1.5",
		lg: "w-2 h-2",
		xl: "w-3 h-3",
	};

	return (
		<div className={cn("relative flex items-center justify-center", className)}>
			{/* メインリング */}
			<div className={cn("relative", sizeClasses[size])}>
				{/* 背景リング */}
				<div className="absolute inset-0 border-4 border-slate-800/40 rounded-full" />

				{/* 動画ーションリング1 */}
				<div
					className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-400 rounded-full animate-spin"
					style={{ animationDuration: "1s" }}
				/>

				{/* 動画ーションリング2 */}
				<div
					className="absolute inset-2 border-2 border-transparent border-t-purple-500 border-l-purple-400 rounded-full animate-spin"
					style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
				/>

				{/* 中心のパルス */}
				<div
					className={cn(
						"absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400",
						dotSizeClasses[size],
					)}
				/>
			</div>

			{/* 周りの装飾ドット */}
			<div className="absolute">
				{Array.from({ length: 6 }, (_, i) => (
					<div
						key={`decoration-dot-${Date.now()}-${i}`}
						className={cn(
							"absolute rounded-full bg-gradient-to-r from-blue-400/60 to-purple-400/60",
							size === "xl"
								? "w-2 h-2"
								: size === "lg"
									? "w-1.5 h-1.5"
									: "w-1 h-1",
						)}
						style={{
							transform: `rotate(${i * 60}deg) translateY(-${size === "xl" ? "20px" : size === "lg" ? "16px" : "12px"})`,
							animation: `pulse 2s infinite ${i * 0.2}s`,
						}}
					/>
				))}
			</div>
		</div>
	);
};

const LoadingCard = ({ className }: { className?: string }) => (
	<div
		className={cn(
			"bg-slate-800/40 rounded-xl overflow-hidden border border-slate-700/50 animate-pulse",
			className,
		)}
	>
		<div className="aspect-video bg-slate-700/50" />
		<div className="p-4 space-y-3">
			<div className="h-4 bg-slate-700/50 rounded w-3/4" />
			<div className="h-3 bg-slate-700/50 rounded w-1/2" />
			<div className="h-3 bg-slate-700/50 rounded w-1/3" />
		</div>
	</div>
);

const LoadingGrid = ({ count = 12 }: { count?: number }) => (
	<div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
		{Array.from({ length: count }, (_, i) => (
			<LoadingCard key={`loading-${Date.now()}-${i}`} />
		))}
	</div>
);

const LoadingState = ({
	type = "initial",
	message,
	className,
}: LoadingStateProps) => {
	const getContent = () => {
		switch (type) {
			case "initial":
				return {
					showGrid: true,
					centerContent: (
						<div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
							<LoadingSpinner size="xl" className="mb-8" />
							<h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
								データベースを読み込み中
							</h2>
							<p className="text-slate-400 text-lg max-w-md">
								{message ||
									"動画ファイルを検索して動画ライブラリを構築しています..."}
							</p>
							<div className="mt-6 flex space-x-2">
								{Array.from({ length: 3 }, (_, i) => (
									<div
										key={`progress-dot-${Date.now()}-${i}`}
										className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
										style={{ animationDelay: `${i * 0.2}s` }}
									/>
								))}
							</div>
						</div>
					),
				};

			case "search":
				return {
					showGrid: false,
					centerContent: (
						<div className="flex items-center justify-center py-20">
							<LoadingSpinner size="lg" className="mr-6" />
							<div>
								<h3 className="text-xl font-semibold text-white mb-2">
									検索中...
								</h3>
								<p className="text-slate-400">
									{message || "動画を検索しています"}
								</p>
							</div>
						</div>
					),
				};

			case "refresh":
				return {
					showGrid: true,
					centerContent: (
						<div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
							<LoadingSpinner size="lg" className="mb-6" />
							<h2 className="text-2xl font-semibold text-white mb-2">
								更新中...
							</h2>
							<p className="text-slate-400">
								{message || "新しい動画を検索しています"}
							</p>
						</div>
					),
				};

			default:
				return {
					showGrid: false,
					centerContent: (
						<div className="flex items-center justify-center py-20">
							<LoadingSpinner size="lg" />
						</div>
					),
				};
		}
	};

	const content = getContent();

	return (
		<div className={cn("min-h-screen bg-slate-900", className)}>
			<div className="container mx-auto px-4">
				{content.centerContent}
				{content.showGrid && (
					<div className="pb-12">
						<LoadingGrid />
					</div>
				)}
			</div>
		</div>
	);
};

export default LoadingState;
