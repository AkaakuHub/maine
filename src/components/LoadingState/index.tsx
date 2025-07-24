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
			<div
				className={cn(
					"relative",
					sizeClasses[size],
					"flex",
					"items-center",
					"justify-center",
				)}
			>
				{/* 中心のパルス */}
				<div
					className={cn(
						"relative left-[3px] top-[2px] rounded-full animate-pulse bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400",
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
			"bg-surface/40 rounded-xl overflow-hidden border border-border-muted/50 animate-pulse",
			className,
		)}
	>
		<div className="aspect-video bg-surface-elevated/50" />
		<div className="p-4 space-y-3">
			<div className="h-4 bg-surface-elevated/50 rounded w-3/4" />
			<div className="h-3 bg-surface-elevated/50 rounded w-1/2" />
			<div className="h-3 bg-surface-elevated/50 rounded w-1/3" />
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
							<p className="text-text-secondary text-lg max-w-md">
								{message ||
									"動画ファイルを検索して動画ライブラリを構築しています..."}
							</p>
							<div className="mt-6 flex space-x-2">
								{Array.from({ length: 3 }, (_, i) => (
									<div
										key={`progress-dot-${Date.now()}-${i}`}
										className="w-2 h-2 bg-primary rounded-full animate-bounce"
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
								<h3 className="text-xl font-semibold text-text mb-2">
									検索中...
								</h3>
								<p className="text-text-secondary">
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
							<h2 className="text-2xl font-semibold text-text mb-2">
								更新中...
							</h2>
							<p className="text-text-secondary">
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
		<div className={cn("min-h-screen", className)}>
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
