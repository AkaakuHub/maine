"use client";

import { forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "../../libs/utils";

interface ToggleButtonProps {
	checked?: boolean;
	onToggle?: (checked: boolean) => void;
	className?: string;
	title?: string;
	disabled?: boolean;
	variant?: "checkbox" | "radio";
}

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
	(
		{
			checked = false,
			onToggle,
			className,
			title,
			disabled = false,
			variant = "checkbox",
			...props
		},
		ref,
	) => {
		const handleClick = () => {
			if (!disabled && onToggle) {
				onToggle(!checked);
			}
		};

		const handleKeyDown = (e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleClick();
			}
		};

		const isRadio = variant === "radio";

		return (
			<button
				ref={ref}
				type="button"
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				className={cn(
					"w-5 h-5 border-2 transition-colors flex items-center justify-center",
					"focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
					isRadio ? "rounded-full" : "rounded",
					checked
						? "bg-primary border-primary text-text-inverse"
						: "border-text-secondary hover:border-primary",
					disabled && "opacity-50 cursor-not-allowed",
					className,
				)}
				title={title}
				role={isRadio ? "radio" : "checkbox"}
				aria-checked={checked}
				aria-disabled={disabled}
				{...props}
			>
				{checked &&
					(isRadio ? (
						<div className="w-2 h-2 rounded-full bg-text-inverse transition-all" />
					) : (
						<Check className="w-3 h-3" />
					))}
			</button>
		);
	},
);

ToggleButton.displayName = "ToggleButton";
