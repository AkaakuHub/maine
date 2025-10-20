"use client";

import { useState, useRef, useEffect } from "react";
import { X, Settings, SkipForward, Palette } from "lucide-react";
import { useChapterSkipStore } from "../../stores/chapterSkipStore";
import { SettingsSection } from "../../components/settings/SettingsSection";
import { SkipRuleForm } from "../../components/settings/SkipRuleForm";
import { SkipRuleItem } from "../../components/settings/SkipRuleItem";
import { ToggleButton } from "../../components/ui/RadioGroup";
import { useTheme } from "../../hooks/useTheme";
import { THEME } from "../../utils/constants";
import type { ThemeMode } from "../../types/theme";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
	const chapterSkipStore = useChapterSkipStore();
	const { theme, setTheme } = useTheme();
	const [expandedSection, setExpandedSection] = useState<string | null>(
		"appearance",
	);
	const modalRef = useRef<HTMLDivElement>(null);

	const toggleSection = (section: string) => {
		setExpandedSection(expandedSection === section ? null : section);
	};

	// ESCキーでモーダルを閉じる
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "unset";
		};
	}, [isOpen, onClose]);

	// 背景クリックでモーダルを閉じる
	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<dialog
			open={isOpen}
			className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-overlay border-none max-w-none max-h-none w-full h-full"
			onClick={handleBackdropClick}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					onClose();
				}
			}}
		>
			<div
				ref={modalRef}
				className="w-full max-w-4xl max-h-[90vh] bg-surface-variant rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col"
			>
				{/* ヘッダー */}
				<div className="flex items-center justify-between p-6 border-b border-border bg-surface-elevated">
					<div className="flex items-center gap-3">
						<Settings className="h-6 w-6 text-primary" />
						<h1 className="text-xl font-bold text-text">設定</h1>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-text-secondary hover:text-text hover:bg-surface-hover rounded-lg transition-all duration-200"
						aria-label="閉じる"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* コンテンツ */}
				<div className="flex-1 overflow-y-auto p-6">
					<div className="space-y-6">
						<SettingsSection
							icon={Palette}
							title="外観"
							isExpanded={expandedSection === "appearance"}
							onToggle={() => toggleSection("appearance")}
						>
							<div className="mb-4 text-sm text-text-secondary">
								アプリの表示テーマを選択できます。システムの設定に従うか、ライト・ダークテーマを手動で選択できます。
							</div>

							<div className="space-y-3">
								{[
									{
										value: THEME.MODES.SYSTEM,
										label: "システムの設定に従う",
										description: "OSの設定に従ってテーマが自動で切り替わります",
									},
									{
										value: THEME.MODES.LIGHT,
										label: "ライトテーマ",
										description: "明るい背景色でUIを表示します",
									},
									{
										value: THEME.MODES.DARK,
										label: "ダークテーマ",
										description: "暗い背景色でUIを表示します",
									},
								].map((option) => (
									<div
										key={option.value}
										className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
										onClick={() => setTheme(option.value as ThemeMode)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												setTheme(option.value as ThemeMode);
											}
										}}
									>
										<ToggleButton
											checked={theme === option.value}
											onToggle={() => setTheme(option.value as ThemeMode)}
											variant="radio"
											className="mt-1"
										/>
										<div>
											<div className="text-text font-medium">
												{option.label}
											</div>
											<div className="text-text-secondary text-sm">
												{option.description}
											</div>
										</div>
									</div>
								))}
							</div>
						</SettingsSection>

						<SettingsSection
							icon={SkipForward}
							title="チャプタースキップ"
							badge={`${chapterSkipStore.rules.filter((r) => r.enabled).length}個有効`}
							isExpanded={expandedSection === "chapter-skip"}
							onToggle={() => toggleSection("chapter-skip")}
						>
							<div className="mb-4 text-sm text-text-secondary">
								特定の名前を持つチャプターを自動でスキップできます。「CM」「OP」「ED」などのパターンを設定してください。
							</div>

							<SkipRuleForm
								onAdd={chapterSkipStore.addRule}
								isLoading={chapterSkipStore.isLoading}
							/>

							{/* エラー表示 */}
							{chapterSkipStore.error && (
								<div className="mb-4 p-3 bg-error/20 border border-error/50 rounded-lg text-sm text-error">
									{chapterSkipStore.error}
								</div>
							)}

							{/* 既存ルール一覧 */}
							<div>
								<h3 className="text-sm font-medium text-text mb-3">
									スキップパターン一覧
								</h3>
								{chapterSkipStore.isLoading ? (
									<div className="text-center text-text-secondary text-sm py-8">
										読み込み中...
									</div>
								) : chapterSkipStore.rules.length === 0 ? (
									<div className="text-center text-text-secondary text-sm py-8">
										スキップパターンがありません
									</div>
								) : (
									<div className="space-y-2">
										{chapterSkipStore.rules.map((rule) => (
											<SkipRuleItem
												key={rule.id}
												rule={rule}
												onToggle={chapterSkipStore.toggleRule}
												onUpdate={chapterSkipStore.updateRule}
												onDelete={chapterSkipStore.deleteRule}
											/>
										))}
									</div>
								)}
							</div>
						</SettingsSection>
					</div>
				</div>
			</div>
		</dialog>
	);
}
