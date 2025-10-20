"use client";

export default function LoadingScreen() {
	return (
		<div className="min-h-screen bg-surface-variant flex items-center justify-center">
			<div className="text-center">
				<div className="relative w-20 h-20 mx-auto mb-6">
					<div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
					<div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
				</div>
				<h2 className="text-2xl font-semibold text-text mb-2">
					動画を読み込み中...
				</h2>
				<p className="text-text-secondary">少々お待ちください</p>
			</div>
		</div>
	);
}
