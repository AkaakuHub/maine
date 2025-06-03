"use client";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-blue-400/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">動画を読み込み中...</h2>
        <p className="text-gray-400">少々お待ちください</p>
      </div>
    </div>
  );
}
