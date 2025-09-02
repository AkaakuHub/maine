"use client";

import { useState } from "react";
import ManualRefreshButton from "@/components/ManualRefreshButton";
import { useVideoUpdater } from "@/hooks/useVideoUpdater";
import { useChapterSkipSettings } from "@/components/ModernVideoPlayer/hooks/useChapterSkipSettings";
import { Settings, Database, SkipForward, ArrowLeft } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { CacheStatsCard } from "@/components/settings/CacheStatsCard";
import { SkipRuleForm } from "@/components/settings/SkipRuleForm";
import { SkipRuleItem } from "@/components/settings/SkipRuleItem";

export default function SettingsPage() {
	const updateStatus = useVideoUpdater();
	const chapterSkipSettings = useChapterSkipSettings();
	const [expandedSection, setExpandedSection] = useState<string | null>(
		"system",
	);

	const toggleSection = (section: string) => {
		setExpandedSection(expandedSection === section ? null : section);
	};

	return (
		<main className="min-h-screen bg-surface-variant">
			<div className="container mx-auto px-6 py-8">
				<div className="max-w-4xl mx-auto">
					{/* ナビゲーション */}
					<div className="flex items-center gap-4 mb-6">
						<a
							href="/"
							className="flex items-center gap-2 px-3 py-2 bg-surface-elevated hover:bg-surface border border-border rounded-lg text-text-secondary hover:text-text transition-all duration-200"
							title="メインページに戻る"
						>
							<ArrowLeft className="h-4 w-4" />
							<span className="text-sm">戻る</span>
						</a>
					</div>

					<div className="flex items-center gap-3 mb-8">
						<Settings className="h-8 w-8 text-primary" />
						<h1 className="text-3xl font-bold text-text">設定</h1>
					</div>

					<SettingsSection
						icon={Database}
						title="システム管理"
						isExpanded={expandedSection === "system"}
						onToggle={() => toggleSection("system")}
					>
						{/* 動画キャッシュ管理 */}
						<div className="mb-6">
							<h3 className="text-lg font-semibold text-text mb-4">
								動画キャッシュ管理
							</h3>
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<CacheStatsCard
										title="キャッシュ済みファイル数"
										value={updateStatus.cacheSize?.toLocaleString() || 0}
										className="text-2xl text-primary"
									/>
									<CacheStatsCard
										title="最終更新"
										value={
											updateStatus.daysSince >= 0 && updateStatus.lastScanDate
												? `${updateStatus.daysSince}日前`
												: updateStatus.daysSince === -1 && updateStatus.isLoaded
													? "未スキャン"
													: "読み込み中..."
										}
										className="text-lg font-semibold text-text"
										description={
											updateStatus.lastScanDate
												? new Date(updateStatus.lastScanDate).toLocaleString(
														"ja-JP",
														{
															year: "numeric",
															month: "2-digit",
															day: "2-digit",
															hour: "2-digit",
															minute: "2-digit",
															second: "2-digit",
															timeZone: "Asia/Tokyo",
														},
													)
												: undefined
										}
									/>
									<CacheStatsCard
										title="更新状態"
										value={
											updateStatus.isUpdating
												? "更新中..."
												: updateStatus.needsUpdate
													? "更新が必要"
													: "最新"
										}
										className={`text-lg font-semibold ${
											updateStatus.isUpdating
												? "text-primary"
												: updateStatus.needsUpdate
													? "text-warning"
													: "text-success"
										}`}
									/>
								</div>

								{updateStatus.isUpdating && (
									<div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
										<div className="flex items-center gap-3 mb-2">
											<div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
											<span className="font-medium text-primary">
												キャッシュ更新中...
											</span>
										</div>
										<div className="bg-primary/20 rounded-full h-2">
											<div
												className="bg-primary h-2 rounded-full transition-all duration-300"
												style={{ width: `${updateStatus.progress}%` }}
											/>
										</div>
										<div className="text-sm text-primary mt-1">
											{updateStatus.progress}% 完了
										</div>
									</div>
								)}

								<div className="flex gap-4">
									<ManualRefreshButton />
									<button
										type="button"
										onClick={() => window.location.reload()}
										className="px-4 py-2 bg-surface-elevated hover:bg-surface border border-border rounded-lg text-text transition-colors"
									>
										ページを更新
									</button>
								</div>
							</div>
						</div>

						{/* システム情報 */}
						<div>
							<h3 className="text-lg font-semibold text-text mb-4">
								システム情報
							</h3>
							<div className="bg-surface-elevated rounded-lg p-4">
								<div className="space-y-3 text-sm">
									<div className="flex justify-between py-2 border-b border-border">
										<span className="text-text-secondary">メモリ使用量</span>
										<span className="text-text font-mono">数KB (DB使用)</span>
									</div>
									<div className="flex justify-between py-2 border-b border-border">
										<span className="text-text-secondary">
											ストレージタイプ
										</span>
										<span className="text-text font-mono">
											SQLite + DBベース
										</span>
									</div>
									<div className="flex justify-between py-2 border-b border-border">
										<span className="text-text-secondary">HDD最適化</span>
										<span className="text-success font-mono">有効</span>
									</div>
									<div className="flex justify-between py-2">
										<span className="text-text-secondary">自動更新</span>
										<span className="text-text font-mono">
											週1回 (日曜 3:00 AM)
										</span>
									</div>
								</div>
							</div>
						</div>
					</SettingsSection>

					<SettingsSection
						icon={SkipForward}
						title="チャプタースキップ"
						badge={`${chapterSkipSettings.rules.filter((r) => r.enabled).length}個有効`}
						isExpanded={expandedSection === "chapter-skip"}
						onToggle={() => toggleSection("chapter-skip")}
					>
						<div className="mb-4 text-sm text-text-secondary">
							特定の名前を持つチャプターを自動でスキップできます。「CM」「OP」「ED」などのパターンを設定してください。
						</div>

						<SkipRuleForm
							onAdd={chapterSkipSettings.addRule}
							isLoading={chapterSkipSettings.isLoading}
						/>

						{/* エラー表示 */}
						{chapterSkipSettings.error && (
							<div className="mb-4 p-3 bg-error/20 border border-error/50 rounded-lg text-sm text-error">
								{chapterSkipSettings.error}
							</div>
						)}

						{/* 既存ルール一覧 */}
						<div>
							<h3 className="text-sm font-medium text-text mb-3">
								スキップパターン一覧
							</h3>
							{chapterSkipSettings.isLoading ? (
								<div className="text-center text-text-secondary text-sm py-8">
									読み込み中...
								</div>
							) : chapterSkipSettings.rules.length === 0 ? (
								<div className="text-center text-text-secondary text-sm py-8">
									スキップパターンがありません
								</div>
							) : (
								<div className="space-y-2">
									{chapterSkipSettings.rules.map((rule) => (
										<SkipRuleItem
											key={rule.id}
											rule={rule}
											onToggle={chapterSkipSettings.toggleRule}
											onUpdate={chapterSkipSettings.updateRule}
											onDelete={chapterSkipSettings.deleteRule}
										/>
									))}
								</div>
							)}
						</div>
					</SettingsSection>
				</div>
			</div>
		</main>
	);
}
