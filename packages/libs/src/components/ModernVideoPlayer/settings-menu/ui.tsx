import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type {
	ComponentType,
	PointerEvent as ReactPointerEvent,
	ReactNode,
} from "react";
import { cn } from "../../../libs/utils";

type IconComponent = ComponentType<{ className?: string }>;

interface SheetHeaderProps {
	icon: IconComponent;
	title: string;
	onDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

export function SheetHeader({
	icon: Icon,
	title,
	onDragStart,
}: SheetHeaderProps) {
	return (
		<div className="px-4 pb-2 pt-3">
			<div className="mb-3 flex justify-center">
				<button
					type="button"
					aria-label="シートをドラッグ"
					className="flex w-full cursor-grab touch-none justify-center py-1 active:cursor-grabbing"
					onPointerDown={onDragStart}
				>
					<div className="h-1.5 w-12 rounded-full bg-text-muted" />
				</button>
			</div>
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-text ring-1 ring-border/60">
					<Icon className="h-5 w-5" />
				</div>
				<div className="text-lg font-semibold tracking-tight text-text">
					{title}
				</div>
			</div>
		</div>
	);
}

interface SectionHeaderProps {
	icon: IconComponent;
	title: string;
	onBack: () => void;
	iconClassName?: string;
}

export function SectionHeader({
	icon: Icon,
	title,
	onBack,
	iconClassName,
}: SectionHeaderProps) {
	return (
		<div className="flex items-center gap-3 px-4 pb-2 pt-3">
			<button
				type="button"
				onClick={onBack}
				className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text"
			>
				<ChevronLeft className="h-5 w-5" />
			</button>
			<div className="flex items-center gap-2 text-base font-semibold text-text">
				<Icon className={cn("h-5 w-5", iconClassName)} />
				{title}
			</div>
		</div>
	);
}

interface SheetSectionProps {
	children: ReactNode;
}

export function SheetSection({ children }: SheetSectionProps) {
	return <div className="space-y-1 px-2 pb-3">{children}</div>;
}

interface MenuRowProps {
	icon: IconComponent;
	label: string;
	value?: string;
	valueTone?: "default" | "primary" | "warning";
	onClick: () => void;
	trailing?: ReactNode;
}

export function MenuRow({
	icon: Icon,
	label,
	value,
	valueTone = "default",
	onClick,
	trailing,
}: MenuRowProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-surface-elevated"
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-text-secondary ring-1 ring-border/60 transition-colors group-hover:bg-surface-pressed">
				<Icon className="h-5 w-5" />
			</div>
			<div className="min-w-0 flex-1 text-base font-medium text-text">
				{label}
			</div>
			{trailing ?? (
				<div className="flex items-center gap-2">
					{value ? (
						<span
							className={cn(
								"text-sm font-medium",
								valueTone === "warning" && "text-warning",
								valueTone === "primary" && "text-primary",
								valueTone === "default" && "text-text-secondary",
							)}
						>
							{value}
						</span>
					) : null}
					<ChevronRight className="h-5 w-5 text-text-secondary" />
				</div>
			)}
		</button>
	);
}

interface OptionButtonProps {
	label: string;
	selected: boolean;
	onClick: () => void;
	icon?: IconComponent;
}

export function OptionButton({
	label,
	selected,
	onClick,
	icon: Icon,
}: OptionButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors",
				selected ? "bg-surface-elevated" : "hover:bg-surface-elevated",
			)}
		>
			<div
				className={cn(
					"flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 transition-colors",
					selected
						? "bg-primary/16 text-primary ring-primary/20"
						: "bg-surface text-text-secondary ring-border/60",
				)}
			>
				{Icon ? <Icon className="h-4 w-4" /> : <Check className="h-4 w-4" />}
			</div>
			<div
				className={cn(
					"min-w-0 flex-1 text-base font-medium",
					selected ? "text-text" : "text-text-secondary",
				)}
			>
				{label}
			</div>
			<div
				className={cn(
					"flex h-5 w-5 items-center justify-center rounded-full border",
					selected
						? "border-primary bg-primary text-text-inverse"
						: "border-border bg-transparent",
				)}
			>
				{selected ? <Check className="h-3 w-3" /> : null}
			</div>
		</button>
	);
}
