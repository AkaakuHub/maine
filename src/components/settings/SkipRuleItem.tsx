"use client";

import { useState } from "react";
import { Edit, Trash2, Check, X } from "lucide-react";
import { cn } from "@/libs/utils";
import type { ChapterSkipRule } from "@/stores/chapterSkipStore";

interface SkipRuleItemProps {
	rule: ChapterSkipRule;
	onToggle: (id: string) => void;
	onUpdate: (id: string, data: { pattern: string }) => Promise<void>;
	onDelete: (id: string) => void;
}

export function SkipRuleItem({
	rule,
	onToggle,
	onUpdate,
	onDelete,
}: SkipRuleItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editPattern, setEditPattern] = useState("");

	const startEditing = () => {
		setIsEditing(true);
		setEditPattern(rule.pattern);
	};

	const cancelEditing = () => {
		setIsEditing(false);
		setEditPattern("");
	};

	const saveEdit = async () => {
		if (editPattern.trim()) {
			try {
				await onUpdate(rule.id, { pattern: editPattern.trim() });
				setIsEditing(false);
				setEditPattern("");
			} catch (_error) {
				// エラーハンドリングは親コンポーネントで管理
			}
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			saveEdit();
		} else if (e.key === "Escape") {
			cancelEditing();
		}
	};

	return (
		<div className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg border border-border">
			{isEditing ? (
				<>
					<input
						type="text"
						value={editPattern}
						onChange={(e) => setEditPattern(e.target.value)}
						className="flex-1 px-2 py-1 text-sm bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary"
						onKeyDown={handleKeyDown}
					/>
					<button
						type="button"
						onClick={saveEdit}
						className="text-primary hover:text-primary/80 transition-colors"
						title="保存"
					>
						<Check className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={cancelEditing}
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
						onClick={() => onToggle(rule.id)}
						className={cn(
							"w-5 h-5 rounded border-2 transition-colors flex items-center justify-center",
							rule.enabled
								? "bg-primary border-primary text-text-inverse"
								: "border-text-secondary hover:border-primary",
						)}
						title={rule.enabled ? "無効にする" : "有効にする"}
					>
						{rule.enabled && <Check className="w-3 h-3" />}
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
						onClick={startEditing}
						className="text-text-secondary hover:text-primary transition-colors p-1"
						title="編集"
					>
						<Edit className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => onDelete(rule.id)}
						className="text-text-secondary hover:text-error transition-colors p-1"
						title="削除"
					>
						<Trash2 className="h-4 w-4" />
					</button>
				</>
			)}
		</div>
	);
}
