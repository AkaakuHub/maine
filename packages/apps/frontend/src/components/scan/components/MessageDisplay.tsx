import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/libs/utils";
import type { Message } from "../types";

interface MessageDisplayProps {
	message: Message;
}

export function MessageDisplay({ message }: MessageDisplayProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-2 p-3 mb-4 rounded-md border text-sm",
				message.type === "success" &&
					"bg-primary/10 border-primary/20 text-primary",
				message.type === "error" && "bg-error/10 border-error/20 text-error",
				message.type === "info" &&
					"bg-primary/10 border-primary/20 text-text-primary",
			)}
		>
			{message.type === "success" && <CheckCircle className="h-4 w-4" />}
			{message.type === "error" && <AlertCircle className="h-4 w-4" />}
			{message.type === "info" && <Info className="h-4 w-4" />}
			{message.text}
		</div>
	);
}
