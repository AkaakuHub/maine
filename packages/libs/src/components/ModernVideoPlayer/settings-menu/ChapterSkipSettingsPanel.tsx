import { Plus, SkipForward } from "lucide-react";
import { useState } from "react";
import { useChapterSkipStore } from "../../../stores/chapterSkipStore";
import type { ChapterSkipRule } from "../../../types/Settings";
import { ChapterSkipRuleList } from "./ChapterSkipRuleList";
import { SectionHeader } from "./ui";

interface ChapterSkipSettingsPanelProps {
	onBack: () => void;
}

export function ChapterSkipSettingsPanel({
	onBack,
}: ChapterSkipSettingsPanelProps) {
	const chapterSkipStore = useChapterSkipStore();
	const [newPattern, setNewPattern] = useState("");
	const [editingRule, setEditingRule] = useState<ChapterSkipRule | null>(null);
	const [editPattern, setEditPattern] = useState("");

	const resetEditingState = () => {
		setEditingRule(null);
		setEditPattern("");
	};

	const handleConfirmEdit = async (ruleId: string) => {
		if (!editPattern.trim()) {
			return;
		}
		try {
			await chapterSkipStore.updateRule(ruleId, {
				pattern: editPattern.trim(),
			});
			resetEditingState();
		} catch {
			// エラーハンドリングはストアで管理
		}
	};

	return (
		<>
			<SectionHeader
				icon={SkipForward}
				title="チャプタースキップ"
				onBack={onBack}
				iconClassName="text-primary"
			/>
			<div className="px-4 pb-3">
				<div className="flex gap-2 rounded-2xl bg-surface p-2 ring-1 ring-border/60">
					<input
						id="new-pattern-input"
						type="text"
						value={newPattern}
						onChange={(e) => setNewPattern(e.target.value)}
						placeholder="CM、OP、EDなど"
						className="flex-1 rounded-xl bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none"
					/>
					<button
						type="button"
						onClick={async () => {
							if (newPattern.trim()) {
								try {
									await chapterSkipStore.addRule(newPattern.trim());
									setNewPattern("");
								} catch {
									// エラーハンドリングはストアで管理
								}
							}
						}}
						disabled={!newPattern.trim() || chapterSkipStore.isLoading}
						className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-text-inverse transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Plus className="h-4 w-4" />
					</button>
				</div>
			</div>

			<ChapterSkipRuleList
				rules={chapterSkipStore.rules}
				isLoading={chapterSkipStore.isLoading}
				error={chapterSkipStore.error}
				editingRuleId={editingRule?.id ?? null}
				editPattern={editPattern}
				onEditPatternChange={setEditPattern}
				onStartEdit={(rule) => {
					setEditingRule(rule);
					setEditPattern(rule.pattern);
				}}
				onCancelEdit={resetEditingState}
				onConfirmEdit={handleConfirmEdit}
				onToggle={(ruleId) => chapterSkipStore.toggleRule(ruleId)}
				onDelete={(ruleId) => chapterSkipStore.deleteRule(ruleId)}
			/>
		</>
	);
}
