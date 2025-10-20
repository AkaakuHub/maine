import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "danger" | "ghost";
	size?: "sm" | "md" | "lg";
	loading?: boolean;
	children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			variant = "primary",
			size = "md",
			loading = false,
			disabled,
			children,
			className = "",
			...props
		},
		ref,
	) => {
		const baseClasses =
			"inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

		const variantClasses = {
			primary:
				"bg-primary text-text-inverse hover:bg-primary/90 focus:ring-border-focus",
			secondary:
				"bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary",
			danger:
				"bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive",
			ghost: "text-foreground hover:bg-primary/10 focus:ring-border-focus",
		};

		const sizeClasses = {
			sm: "px-3 py-1.5 text-sm",
			md: "px-4 py-2 text-sm",
			lg: "px-6 py-3 text-base",
		};

		const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

		return (
			<button
				ref={ref}
				disabled={disabled || loading}
				className={combinedClasses}
				{...props}
			>
				{loading && (
					<svg
						className="animate-spin -ml-1 mr-2 h-4 w-4"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<title>Loading...</title>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
				)}
				{children}
			</button>
		);
	},
);

Button.displayName = "Button";

export default Button;
