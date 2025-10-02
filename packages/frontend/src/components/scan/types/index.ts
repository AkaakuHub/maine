export interface ScanSchedulePanelProps {
	className?: string;
}

export interface Message {
	type: "success" | "error" | "info";
	text: string;
}
