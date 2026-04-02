import { Play } from "lucide-react";
import { RangeSettingControls } from "./RangeSettingControls";
import { SectionHeader, SheetSection } from "./ui";

interface PlaybackSettingsPanelProps {
	playbackRate: number;
	onBack: () => void;
	onSelect: (rate: number) => void;
}

export function PlaybackSettingsPanel({
	playbackRate,
	onBack,
	onSelect,
}: PlaybackSettingsPanelProps) {
	const roundedPlaybackRate = Math.round(playbackRate * 100) / 100;

	return (
		<>
			<SectionHeader
				icon={Play}
				title="再生速度"
				onBack={onBack}
				iconClassName="text-primary"
			/>
			<SheetSection>
				<RangeSettingControls
					valueLabel={`${formatPlaybackRateLabel(roundedPlaybackRate)}x`}
					min={50}
					max={200}
					step={5}
					value={Math.round(roundedPlaybackRate * 100)}
					onChange={(value) => {
						onSelect(Math.round(value) / 100);
					}}
					presets={[50, 75, 100, 125, 150, 200]}
					formatPresetLabel={(value) =>
						`${formatPlaybackRateLabel(value / 100)}x`
					}
					snapThreshold={4}
				/>
			</SheetSection>
		</>
	);
}

function formatPlaybackRateLabel(rate: number) {
	return rate.toFixed(2).replace(/\.?0+$/, "");
}
