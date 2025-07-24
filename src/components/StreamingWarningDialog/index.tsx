"use client";

import { AlertTriangle, Download, Wifi } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface StreamingWarningDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onContinueStreaming: () => void;
	onUseOffline: () => void;
	videoTitle: string;
}

const StreamingWarningDialog = ({
	isOpen,
	onClose,
	onContinueStreaming,
	onUseOffline,
	videoTitle,
}: StreamingWarningDialogProps) => {
	const message = (
		<div>
			<p className="text-text-secondary mb-3">
				<span className="font-medium text-text">「{videoTitle}」</span>
				は既にオフラインで保存されています。
			</p>
			<p className="text-sm text-text-secondary">
				ストリーミング再生よりもオフライン再生の方が高速で、インターネット接続も不要です。
			</p>
		</div>
	);

	const actions = [
		{
			label: "オフライン再生（推奨）",
			onClick: onUseOffline,
			variant: "primary" as const,
			icon: Download,
			description: "高速・安定再生",
		},
		{
			label: "ストリーミング再生",
			onClick: onContinueStreaming,
			variant: "secondary" as const,
			icon: Wifi,
			description: "インターネット接続が必要",
		},
	];

	return (
		<ConfirmDialog
			isOpen={isOpen}
			onClose={onClose}
			title="オフライン版が利用可能"
			message={message}
			actions={actions}
			icon={AlertTriangle}
			iconColor="text-warning"
		/>
	);
};

export default StreamingWarningDialog;
