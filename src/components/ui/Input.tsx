"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "@/libs/utils";

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	variant?: "default" | "search";
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	rightContent?: React.ReactNode;
	error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			className,
			variant = "default",
			leftIcon,
			rightIcon,
			rightContent,
			error,
			disabled,
			...props
		},
		ref,
	) => {
		const baseClasses = cn(
			"w-full bg-surface border border-border rounded-lg text-text placeholder-text-muted",
			"focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
			"transition-all duration-200",
			"disabled:opacity-50 disabled:cursor-not-allowed",
			error && "border-error focus:ring-error focus:border-error",
		);

		const variantClasses = {
			default: "px-3 py-2",
			search: leftIcon
				? "pl-10 pr-24 py-3"
				: rightContent
					? "pl-3 pr-24 py-3"
					: "px-3 py-3",
		};

		return (
			<div className="relative">
				{leftIcon && (
					<div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
						{leftIcon}
					</div>
				)}

				<input
					ref={ref}
					disabled={disabled}
					className={cn(baseClasses, variantClasses[variant], className)}
					// 利便性
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					{...props}
				/>

				{(rightIcon || rightContent) && (
					<div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
						{rightContent || rightIcon}
					</div>
				)}

				{error && <p className="mt-1 text-sm text-error">{error}</p>}
			</div>
		);
	},
);

Input.displayName = "Input";
