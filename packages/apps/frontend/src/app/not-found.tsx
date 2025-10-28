import Link from "next/link";
import { Compass, Home, FolderSearch } from "lucide-react";

type QuickLink = {
	href: string;
	label: string;
	description: string;
	icon: typeof Home;
};

const quickLinks: QuickLink[] = [
	{
		href: "/",
		label: "ホームに戻る",
		description:
			"動画ライブラリに戻り、最近追加したコンテンツをチェックしましょう。",
		icon: Home,
	},
	{
		href: "/scan",
		label: "ライブラリをスキャン",
		description:
			"メディアフォルダを再スキャンしてデータベースを最新状態に更新します。",
		icon: FolderSearch,
	},
];

export default function NotFound() {
	return (
		<main className="min-h-screen bg-surface-variant py-16 px-6">
			<div className="container mx-auto max-w-4xl">
				<div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
					<div className="absolute inset-x-0 -top-32 h-56 bg-gradient-to-br from-primary/30 via-primary/5 to-transparent blur-3xl" />
					<div className="relative px-8 py-12 sm:px-12 sm:py-16 space-y-12">
						<header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-4">
								<div className="flex h-16 w-16 aspect-square items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner">
									<Compass className="h-9 w-9" aria-hidden="true" />
								</div>
								<div className="space-y-2">
									<div>
										<h1 className="text-3xl font-bold text-text sm:text-4xl">
											お探しのページが見つかりません
										</h1>
										<p className="mt-2 text-base text-text-secondary leading-relaxed">
											URLが変更されたか、入力されたアドレスに誤りがある可能性があります。
											以下のリンクから次のアクションを選んでください。
										</p>
									</div>
								</div>
							</div>
						</header>

						<section className="grid gap-4 md:grid-cols-2">
							{quickLinks.map(({ href, label, description, icon: Icon }) => (
								<Link
									key={href}
									href={href}
									className="group relative flex items-start gap-4 rounded-2xl border border-border bg-surface-elevated/40 p-5 transition-all duration-200 hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
								>
									<div className="flex h-12 w-12 aspect-square flex-none items-center justify-center rounded-xl bg-surface-elevated text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-text-inverse">
										<Icon
											className="h-6 w-6 aspect-square"
											aria-hidden="true"
										/>
									</div>
									<div className="space-y-1">
										<h2 className="text-lg font-semibold text-text">{label}</h2>
										<p className="text-sm text-text-secondary leading-relaxed">
											{description}
										</p>
									</div>
									<div className="pointer-events-none absolute right-5 top-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
										<span className="text-xs font-medium uppercase tracking-wider text-primary">
											詳しく見る →
										</span>
									</div>
								</Link>
							))}
						</section>
					</div>
				</div>
			</div>
		</main>
	);
}
