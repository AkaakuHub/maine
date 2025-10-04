export const formatTime = (hour: number, minute: number) => {
	return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

export const toSafeDate = (dateInput: Date | string | null): Date | null => {
	if (!dateInput) return null;

	let date: Date;

	if (typeof dateInput === "string") {
		// Handle ISO string format specifically
		if (dateInput.includes("T") || dateInput.includes("Z")) {
			date = new Date(dateInput);
		} else {
			// Try to parse as regular date string
			date = new Date(dateInput);
		}
	} else {
		date = dateInput;
	}

	// Check if the date is valid using Number.isNaN for safety
	if (Number.isNaN(date.getTime())) {
		console.warn("[toSafeDate] Invalid date detected:", dateInput);
		return null;
	}

	return date;
};
