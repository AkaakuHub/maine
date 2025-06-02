"use client";

import { cn } from "@/libs/utils";

interface LoadingStateProps {
  type?: "initial" | "search" | "refresh";
  message?: string;
  className?: string;
}

const LoadingSpinner = ({ className }: { className?: string }) => (
  <div className={cn("relative", className)}>
    <div className="w-16 h-16 border-4 border-slate-700 rounded-full animate-spin">
      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin" />
    </div>
    <div className="absolute top-2 left-2 w-12 h-12 border-4 border-transparent border-t-purple-400 rounded-full animate-spin animate-reverse" style={{ animationDuration: "1.5s" }} />
  </div>
);

const LoadingCard = ({ className }: { className?: string }) => (
  <div className={cn(
    "bg-slate-800/40 rounded-xl overflow-hidden border border-slate-700/50 animate-pulse",
    className
  )}>
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
  className 
}: LoadingStateProps) => {
  const getContent = () => {
    switch (type) {
      case "initial":
        return {
          showGrid: true,
          centerContent: (
            <div className="text-center mb-8">
              <LoadingSpinner className="mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-white mb-2">
                データベースを読み込み中...
              </h2>
              <p className="text-slate-400">
                {message || "動画ファイルを検索しています"}
              </p>
            </div>
          )
        };

      case "search":
        return {
          showGrid: false,
          centerContent: (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner className="mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  検索中...
                </h3>
                <p className="text-slate-400">
                  {message || "アニメを検索しています"}
                </p>
              </div>
            </div>
          )
        };

      case "refresh":
        return {
          showGrid: true,
          centerContent: (
            <div className="text-center mb-8">
              <LoadingSpinner className="mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-white mb-2">
                更新中...
              </h2>
              <p className="text-slate-400">
                {message || "新しいアニメを検索しています"}
              </p>
            </div>
          )
        };

      default:
        return {
          showGrid: false,
          centerContent: (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner />
            </div>
          )
        };
    }
  };

  const content = getContent();

  return (
    <div className={cn("min-h-screen", className)}>
      {content.centerContent}
      {content.showGrid && <LoadingGrid />}
    </div>
  );
};

export default LoadingState;
