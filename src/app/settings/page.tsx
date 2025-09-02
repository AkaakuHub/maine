"use client";

import { useState } from "react";
import ManualRefreshButton from "@/components/ManualRefreshButton";
import { useVideoUpdater } from "@/hooks/useVideoUpdater";
import { useChapterSkipSettings } from "@/components/ModernVideoPlayer/hooks/useChapterSkipSettings";
import {
	Settings,
	Database,
	SkipForward,
	Plus,
	Edit,
	Trash2,
	ChevronDown,
	ChevronUp,
	ArrowLeft,
	Check,
	X,
} from "lucide-react";
import { cn } from "@/libs/utils";
import type { ChapterSkipRule } from "@/components/ModernVideoPlayer/hooks/useChapterSkipSettings";

export default function SettingsPage() {
	const updateStatus = useVideoUpdater();
	const chapterSkipSettings = useChapterSkipSettings();
	const [expandedSection, setExpandedSection] = useState<string | null>(
		"system",
	);
	const [newPattern, setNewPattern] = useState("");
	const [editingRule, setEditingRule] = useState<ChapterSkipRule | null>(null);
	const [editPattern, setEditPattern] = useState("");

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

					{/* システム管理セクション */}
					<div className="bg-surface rounded-lg mb-6 overflow-hidden">
						<button
							type="button"
							onClick={() => toggleSection("system")}
							className="w-full flex items-center justify-between p-6 hover:bg-surface-hover transition-colors"
						>
							<div className="flex items-center gap-3">
								<Database className="h-5 w-5 text-primary" />
								<h2 className="text-xl font-semibold text-text">
									システム管理
								</h2>
							</div>
							{expandedSection === "system" ? (
								<ChevronUp className="h-5 w-5 text-text-secondary" />
							) : (
								<ChevronDown className="h-5 w-5 text-text-secondary" />
							)}
						</button>

						{expandedSection === "system" && (
							<div className="px-6 pb-6 border-t border-border">
								{/* 動画キャッシュ管理 */}
								<div className="mb-6">
									<h3 className="text-lg font-semibold text-text mb-4">
										動画キャッシュ管理
									</h3>
									<div className="space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<div className="bg-surface-elevated rounded-lg p-4">
												<div className="text-sm text-text-secondary mb-1">
													キャッシュ済みファイル数
												</div>
												<div className="text-2xl font-bold text-primary">
													{updateStatus.cacheSize?.toLocaleString() || 0}
												</div>
											</div>
											<div className="bg-surface-elevated rounded-lg p-4">
												<div className="text-sm text-text-secondary mb-1">
													最終更新
												</div>
												<div className="text-lg font-semibold text-text">
													{updateStatus.daysSince >= 0 &&
													updateStatus.lastScanDate
														? `${updateStatus.daysSince}日前`
														: updateStatus.daysSince === -1 &&
																updateStatus.isLoaded
															? "未スキャン"
															: "読み込み中..."}
												</div>
												{updateStatus.lastScanDate && (
													<div className="text-xs text-text-muted mt-1">
														{new Date(updateStatus.lastScanDate).toLocaleString(
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
														)}
													</div>
												)}
											</div>
											<div className="bg-surface-elevated rounded-lg p-4">
												<div className="text-sm text-text-secondary mb-1">
													更新状態
												</div>
												<div
													className={`text-lg font-semibold ${
														updateStatus.isUpdating
															? "text-primary"
															: updateStatus.needsUpdate
																? "text-warning"
																: "text-success"
													}`}
												>
													{updateStatus.isUpdating
														? "更新中..."
														: updateStatus.needsUpdate
															? "更新が必要"
															: "最新"}
												</div>
											</div>
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
												<span className="text-text-secondary">
													メモリ使用量
												</span>
												<span className="text-text font-mono">
													数KB (DB使用)
												</span>
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
							</div>
						)}
					</div>

					{/* チャプタースキップセクション */}
					<div className="bg-surface rounded-lg mb-6 overflow-hidden">
						<button
							type="button"
							onClick={() => toggleSection("chapter-skip")}
							className="w-full flex items-center justify-between p-6 hover:bg-surface-hover transition-colors"
						>
							<div className="flex items-center gap-3">
								<SkipForward className="h-5 w-5 text-primary" />
								<h2 className="text-xl font-semibold text-text">
									チャプタースキップ
								</h2>
								<div className="bg-primary/20 text-primary px-2 py-1 rounded text-xs">
									{chapterSkipSettings.rules.filter((r) => r.enabled).length}
									個有効
								</div>
							</div>
							{expandedSection === "chapter-skip" ? (
								<ChevronUp className="h-5 w-5 text-text-secondary" />
							) : (
								<ChevronDown className="h-5 w-5 text-text-secondary" />
							)}
						</button>

						{expandedSection === "chapter-skip" && (
							<div className="px-6 pb-6 border-t border-border">
								<div className="mb-4 text-sm text-text-secondary">
									特定の名前を持つチャプターを自動でスキップできます。「CM」「OP」「ED」などのパターンを設定してください。
								</div>

								{/* 新しいパターン追加 */}
								<div className="mb-6 p-4 bg-surface-elevated rounded-lg border border-primary/20">
									<label
										htmlFor="new-pattern-input"
										className="block text-sm font-medium text-text mb-2"
									>
										新しいスキップパターン
									</label>
									<div className="flex gap-2">
										<input
											id="new-pattern-input"
											type="text"
											value={newPattern}
											onChange={(e) => setNewPattern(e.target.value)}
											placeholder="CM、OP、EDなど"
											className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
											onKeyDown={(e) => {
												if (e.key === "Enter" && newPattern.trim()) {
													e.preventDefault();
													chapterSkipSettings
														.addRule(newPattern.trim())
														.then(() => {
															setNewPattern("");
														})
														.catch(() => {
															// エラーハンドリングは useChapterSkipSettings で管理
														});
												}
											}}
										/>
										<button
											type="button"
											onClick={async () => {
												if (newPattern.trim()) {
													try {
														await chapterSkipSettings.addRule(
															newPattern.trim(),
														);
														setNewPattern("");
													} catch (_error) {
														// エラーハンドリングは useChapterSkipSettings で管理
													}
												}
											}}
											disabled={
												!newPattern.trim() || chapterSkipSettings.isLoading
											}
											className="px-4 py-2 bg-primary text-text-inverse text-sm rounded-lg hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
										>
											<Plus className="h-4 w-4" />
											追加
										</button>
									</div>
								</div>

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
												<div
													key={rule.id}
													className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg border border-border"
												>
													{editingRule?.id === rule.id ? (
														<>
															<input
																type="text"
																value={editPattern}
																onChange={(e) => setEditPattern(e.target.value)}
																className="flex-1 px-2 py-1 text-sm bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary"
																onKeyDown={(e) => {
																	if (e.key === "Enter") {
																		e.preventDefault();
																		if (editPattern.trim()) {
																			chapterSkipSettings.updateRule(rule.id, {
																				pattern: editPattern.trim(),
																			});
																			setEditingRule(null);
																			setEditPattern("");
																		}
																	} else if (e.key === "Escape") {
																		setEditingRule(null);
																		setEditPattern("");
																	}
																}}
															/>
															<button
																type="button"
																onClick={async () => {
																	if (editPattern.trim()) {
																		try {
																			await chapterSkipSettings.updateRule(
																				rule.id,
																				{ pattern: editPattern.trim() },
																			);
																			setEditingRule(null);
																			setEditPattern("");
																		} catch (_error) {
																			// エラーハンドリングは useChapterSkipSettings で管理
																		}
																	}
																}}
																className="text-primary hover:text-primary/80 transition-colors"
																title="保存"
															>
																<Check className="w-4 h-4" />
															</button>
															<button
																type="button"
																onClick={() => {
																	setEditingRule(null);
																	setEditPattern("");
																}}
																className="text-text-secondary hover:text-text transition-colors"
																title="キャンセル"
															>
																<X className="w-4 h-4" />
															</button>
														</>
													) : (
														<>
															<button
																type="button"
																onClick={() =>
																	chapterSkipSettings.toggleRule(rule.id)
																}
																className={cn(
																	"w-5 h-5 rounded border-2 transition-colors flex items-center justify-center",
																	rule.enabled
																		? "bg-primary border-primary text-text-inverse"
																		: "border-text-secondary hover:border-primary",
																)}
																title={
																	rule.enabled ? "無効にする" : "有効にする"
																}
															>
																{rule.enabled && <Check className="w-3 h-3" />}
															</button>
															<span
																className={cn(
																	"flex-1 text-sm",
																	rule.enabled
																		? "text-text"
																		: "text-text-secondary line-through",
																)}
															>
																{rule.pattern}
															</span>
															<button
																type="button"
																onClick={() => {
																	setEditingRule(rule);
																	setEditPattern(rule.pattern);
																}}
																className="text-text-secondary hover:text-primary transition-colors p-1"
																title="編集"
															>
																<Edit className="h-4 w-4" />
															</button>
															<button
																type="button"
																onClick={() =>
																	chapterSkipSettings.deleteRule(rule.id)
																}
																className="text-text-secondary hover:text-error transition-colors p-1"
																title="削除"
															>
																<Trash2 className="h-4 w-4" />
															</button>
														</>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	);
}
