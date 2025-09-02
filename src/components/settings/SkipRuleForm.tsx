"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

interface SkipRuleFormProps {
	onAdd: (pattern: string) => Promise<void>;
	isLoading: boolean;
}

export function SkipRuleForm({ onAdd, isLoading }: SkipRuleFormProps) {
	const [pattern, setPattern] = useState("");

	const handleSubmit = async () => {
		if (pattern.trim()) {
			try {
				await onAdd(pattern.trim());
				setPattern("");
			} catch (_error) {
				// エラーハンドリングは親コンポーネントで管理
			}
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && pattern.trim()) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
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
					value={pattern}
					onChange={(e) => setPattern(e.target.value)}
					placeholder="CM、OP、EDなど"
					className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
					onKeyDown={handleKeyDown}
				/>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={!pattern.trim() || isLoading}
					className="px-4 py-2 bg-primary text-text-inverse text-sm rounded-lg hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
				>
					<Plus className="h-4 w-4" />
					追加
				</button>
			</div>
		</div>
	);
}
