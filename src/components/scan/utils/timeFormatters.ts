export const formatTime = (hour: number, minute: number) => {
	return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

export const toSafeDate = (dateInput: Date | string | null): Date | null => {
	if (!dateInput) return null;

	const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

	// Check if the date is valid
	if (Number.isNaN(date.getTime())) return null;

	return date;
};

export const formatNextExecution = (nextExecution: Date | string | null) => {
	if (!nextExecution) return "なし";

	// Convert to Date object if it's a string
	const executionDate =
		typeof nextExecution === "string" ? new Date(nextExecution) : nextExecution;

	// Check if the date is valid
	if (Number.isNaN(executionDate.getTime())) return "無効な日時";

	const now = new Date();
	const diff = executionDate.getTime() - now.getTime();

	if (diff < 0) return "予定時刻を過ぎています";

	const days = Math.floor(diff / (24 * 60 * 60 * 1000));
	const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
	const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

	if (days > 0) {
		return `${days}日${hours}時間${minutes}分後 (${executionDate.toLocaleDateString("ja-JP")} ${formatTime(executionDate.getHours(), executionDate.getMinutes())})`;
	}

	if (hours > 0) {
		return `${hours}時間${minutes}分後 (${formatTime(executionDate.getHours(), executionDate.getMinutes())})`;
	}

	return `${minutes}分後 (${formatTime(executionDate.getHours(), executionDate.getMinutes())})`;
};
