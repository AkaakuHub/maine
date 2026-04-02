import { Check, Edit, Trash2, X } from "lucide-react";
import { cn } from "../../../libs/utils";
import type { ChapterSkipRule } from "../../../types/Settings";

interface ChapterSkipRuleListProps {
	rules: ChapterSkipRule[];
	isLoading: boolean;
	error: string | null;
	editingRuleId: string | null;
	editPattern: string;
	onEditPatternChange: (value: string) => void;
	onStartEdit: (rule: ChapterSkipRule) => void;
	onCancelEdit: () => void;
	onConfirmEdit: (ruleId: string) => Promise<void>;
	onToggle: (ruleId: string) => void;
	onDelete: (ruleId: string) => void;
}

export function ChapterSkipRuleList({
	rules,
	isLoading,
	error,
	editingRuleId,
	editPattern,
	onEditPatternChange,
	onStartEdit,
	onCancelEdit,
	onConfirmEdit,
	onToggle,
	onDelete,
}: ChapterSkipRuleListProps) {
	if (error) {
		return <div className="px-4 pb-3 text-sm text-error">{error}</div>;
	}

	return (
		<div className="max-h-64 space-y-2 overflow-y-auto px-4 pb-3">
			{isLoading ? (
				<div className="py-6 text-center text-sm text-text-secondary">
					読み込み中...
				</div>
			) : rules.length === 0 ? (
				<div className="py-6 text-center text-sm text-text-secondary">
					スキップパターンがありません
				</div>
			) : (
				rules.map((rule) => (
					<ChapterSkipRuleRow
						key={rule.id}
						rule={rule}
						isEditing={editingRuleId === rule.id}
						editPattern={editPattern}
						onEditPatternChange={onEditPatternChange}
						onStartEdit={onStartEdit}
						onCancelEdit={onCancelEdit}
						onConfirmEdit={onConfirmEdit}
						onToggle={onToggle}
						onDelete={onDelete}
					/>
				))
			)}
		</div>
	);
}

interface ChapterSkipRuleRowProps {
	rule: ChapterSkipRule;
	isEditing: boolean;
	editPattern: string;
	onEditPatternChange: (value: string) => void;
	onStartEdit: (rule: ChapterSkipRule) => void;
	onCancelEdit: () => void;
	onConfirmEdit: (ruleId: string) => Promise<void>;
	onToggle: (ruleId: string) => void;
	onDelete: (ruleId: string) => void;
}

function ChapterSkipRuleRow({
	rule,
	isEditing,
	editPattern,
	onEditPatternChange,
	onStartEdit,
	onCancelEdit,
	onConfirmEdit,
	onToggle,
	onDelete,
}: ChapterSkipRuleRowProps) {
	return (
		<div className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-3 ring-1 ring-border/60">
			{isEditing ? (
				<>
					<input
						type="text"
						value={editPattern}
						onChange={(event) => onEditPatternChange(event.target.value)}
						className="flex-1 rounded-xl bg-transparent px-2 py-2 text-sm text-text focus:outline-none"
						onKeyDown={(event) => {
							if (event.key === "Enter" && editPattern.trim()) {
								event.preventDefault();
								void onConfirmEdit(rule.id);
							}
							if (event.key === "Escape") {
								onCancelEdit();
							}
						}}
					/>
					<button
						type="button"
						onClick={() => void onConfirmEdit(rule.id)}
						className="text-primary transition-colors hover:text-primary/80"
					>
						<Check className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={onCancelEdit}
						className="text-text-secondary transition-colors hover:text-text"
					>
						<X className="h-4 w-4" />
					</button>
				</>
			) : (
				<>
					<button
						type="button"
						onClick={() => onToggle(rule.id)}
						className={cn(
							"flex h-5 w-5 items-center justify-center rounded-md border",
							rule.enabled
								? "border-primary bg-primary"
								: "border-border bg-transparent",
						)}
					>
						{rule.enabled ? (
							<Check className="h-3 w-3 text-text-inverse" />
						) : null}
					</button>
					<span
						className={cn(
							"flex-1 text-sm",
							rule.enabled ? "text-text" : "text-text-secondary line-through",
						)}
					>
						{rule.pattern}
					</span>
					<button
						type="button"
						onClick={() => onStartEdit(rule)}
						className="text-text-secondary transition-colors hover:text-primary"
					>
						<Edit className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => onDelete(rule.id)}
						className="text-text-secondary transition-colors hover:text-error"
					>
						<Trash2 className="h-4 w-4" />
					</button>
				</>
			)}
		</div>
	);
}
