import { Clock } from "lucide-react";
import { RangeSettingControls } from "./RangeSettingControls";
import { SectionHeader, SheetSection } from "./ui";

interface SkipSettingsPanelProps {
	skipSeconds: number;
	skipOptions: number[];
	onBack: () => void;
	onSelect: (seconds: number) => void;
}

export function SkipSettingsPanel({
	skipSeconds,
	skipOptions,
	onBack,
	onSelect,
}: SkipSettingsPanelProps) {
	return (
		<>
			<SectionHeader
				icon={Clock}
				title="スキップ秒数"
				onBack={onBack}
				iconClassName="text-warning"
			/>
			<SheetSection>
				<RangeSettingControls
					valueLabel={`${skipSeconds}秒`}
					valueTone="warning"
					min={1}
					max={120}
					step={1}
					value={skipSeconds}
					onChange={(value) => {
						onSelect(Math.round(value));
					}}
					presets={skipOptions}
					formatPresetLabel={(value) => `${value}秒`}
					snapThreshold={3}
				/>
			</SheetSection>
		</>
	);
}
