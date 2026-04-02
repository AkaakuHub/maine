import { Camera, Download } from "lucide-react";
import { OptionButton, SectionHeader, SheetSection } from "./ui";

interface ScreenshotSettingsPanelProps {
	autoDownloadScreenshot: boolean;
	onBack: () => void;
	onSelect: (enabled: boolean) => void;
}

export function ScreenshotSettingsPanel({
	autoDownloadScreenshot,
	onBack,
	onSelect,
}: ScreenshotSettingsPanelProps) {
	return (
		<>
			<SectionHeader
				icon={Camera}
				title="スクリーンショット"
				onBack={onBack}
				iconClassName="text-primary"
			/>
			<SheetSection>
				<OptionButton
					label="クリップボードにコピーのみ"
					selected={!autoDownloadScreenshot}
					onClick={() => onSelect(false)}
					icon={Camera}
				/>
				<OptionButton
					label="クリップボード + 自動ダウンロード"
					selected={autoDownloadScreenshot}
					onClick={() => onSelect(true)}
					icon={Download}
				/>
			</SheetSection>
		</>
	);
}
