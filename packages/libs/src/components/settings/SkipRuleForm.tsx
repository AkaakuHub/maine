"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "../../components/ui/Input";

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
				<div className="flex-1">
					<Input
						id="new-pattern-input"
						value={pattern}
						onChange={(e) => setPattern(e.target.value)}
						placeholder="CM、OP、EDなど"
						onKeyDown={handleKeyDown}
					/>
				</div>
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
