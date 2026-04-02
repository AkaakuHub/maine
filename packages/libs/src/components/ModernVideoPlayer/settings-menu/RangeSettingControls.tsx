import { cn } from "../../../libs/utils";

interface RangeSettingControlsProps {
	valueLabel: string;
	valueTone?: "primary" | "warning";
	min: number;
	max: number;
	step: number;
	value: number;
	onChange: (value: number) => void;
	presets: number[];
	formatPresetLabel: (value: number) => string;
	isPresetSelected?: (preset: number, currentValue: number) => boolean;
	snapThreshold?: number;
}

export function RangeSettingControls({
	valueLabel,
	valueTone = "primary",
	min,
	max,
	step,
	value,
	onChange,
	presets,
	formatPresetLabel,
	isPresetSelected = (preset, currentValue) => preset === currentValue,
	snapThreshold = step * 2,
}: RangeSettingControlsProps) {
	const handleChange = (rawValue: number) => {
		onChange(getSnappedValue(rawValue, presets, snapThreshold));
	};

	return (
		<div className="space-y-4 rounded-3xl bg-surface px-4 py-4 ring-1 ring-border/60">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-text-secondary">
					現在の値
				</span>
				<span
					className={cn(
						"text-lg font-semibold tabular-nums",
						valueTone === "warning" ? "text-warning" : "text-primary",
					)}
				>
					{valueLabel}
				</span>
			</div>

			<div className="space-y-2">
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					onChange={(event) => {
						handleChange(Number.parseFloat(event.target.value));
					}}
					className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-elevated accent-primary"
				/>
				<div className="relative h-3">
					<div className="absolute inset-y-0 left-2 right-2">
						{presets.map((preset) => {
							const offsetPercent = getPresetOffsetPercent(preset, min, max);
							const isSelected = isPresetSelected(preset, value);

							return (
								<div
									key={preset}
									className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
									style={{ left: `${offsetPercent}%` }}
								>
									<div
										className={cn(
											"rounded-full transition-all",
											isSelected ? "h-3 w-1.5 bg-primary" : "h-2 w-1 bg-border",
										)}
									/>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-2">
				{presets.map((preset) => {
					const isSelected = isPresetSelected(preset, value);
					return (
						<button
							key={preset}
							type="button"
							onClick={() => handleChange(preset)}
							className={cn(
								"rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
								isSelected
									? "bg-primary text-text-inverse"
									: "bg-surface-elevated text-text-secondary hover:bg-surface-pressed hover:text-text",
							)}
						>
							{formatPresetLabel(preset)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function getSnappedValue(
	value: number,
	presets: number[],
	snapThreshold: number,
) {
	const nearestPreset = presets.reduce((closestPreset, preset) => {
		const closestDistance = Math.abs(closestPreset - value);
		const nextDistance = Math.abs(preset - value);
		return nextDistance < closestDistance ? preset : closestPreset;
	}, presets[0] ?? value);

	if (Math.abs(nearestPreset - value) <= snapThreshold) {
		return nearestPreset;
	}

	return value;
}

function getPresetOffsetPercent(preset: number, min: number, max: number) {
	if (max <= min) {
		return 0;
	}

	return ((preset - min) / (max - min)) * 100;
}
