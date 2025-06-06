"use client";

import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ConfirmDialogAction {
	label: string;
	onClick: () => void;
	variant?: "primary" | "secondary" | "danger";
	icon?: LucideIcon;
	description?: string;
}

interface ConfirmDialogProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	message: string | ReactNode;
	actions: ConfirmDialogAction[];
	icon?: LucideIcon;
	iconColor?: string;
	showCancel?: boolean;
}

const ConfirmDialog = ({
	isOpen,
	onClose,
	title,
	message,
	actions,
	icon: Icon,
	iconColor = "text-amber-400",
	showCancel = true,
}: ConfirmDialogProps) => {
	if (!isOpen) return null;

	const getActionClasses = (variant = "secondary") => {
		switch (variant) {
			case "primary":
				return "bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600";
			case "danger":
				return "bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600";
			default:
				return "bg-slate-700 text-white hover:bg-slate-600";
		}
	};

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			onClose();
		}
	};

	return (
		<div
			className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm z-50"
			onClick={handleBackdropClick}
			onKeyDown={handleKeyDown}
			aria-modal="true"
			aria-labelledby="dialog-title"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "1rem",
			}}
		>
			<div
				className="bg-slate-800 rounded-xl p-6 w-full border border-slate-600 shadow-2xl relative"
				style={{ maxWidth: "28rem" }}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				{/* ヘッダー */}
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						{Icon && (
							<div
								className={`p-2 rounded-lg ${iconColor.replace("text-", "bg-")}/20`}
							>
								<Icon className={`h-5 w-5 ${iconColor}`} />
							</div>
						)}
						<h3 id="dialog-title" className="text-lg font-semibold text-white">
							{title}
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-slate-400 hover:text-white transition-colors p-1"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* メッセージ */}
				<div className="mb-6">
					{typeof message === "string" ? (
						<p className="text-slate-300">{message}</p>
					) : (
						message
					)}
				</div>

				{/* アクション */}
				<div className="space-y-3">
					{actions.map((action) => (
						<button
							key={action.label}
							type="button"
							onClick={action.onClick}
							className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${getActionClasses(action.variant)}`}
						>
							{action.icon && <action.icon className="h-5 w-5" />}
							<div className="text-left flex-1">
								<div className="font-medium">{action.label}</div>
								{action.description && (
									<div className="text-xs opacity-80">{action.description}</div>
								)}
							</div>
						</button>
					))}

					{/* キャンセルボタン */}
					{showCancel && (
						<button
							type="button"
							onClick={onClose}
							className="w-full p-2 text-slate-400 hover:text-white transition-colors text-center"
						>
							キャンセル
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default ConfirmDialog;
