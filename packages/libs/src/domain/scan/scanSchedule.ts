import { SCAN } from "../../utils/constants";

export interface ScanScheduleSettings {
	enabled: boolean;
	cronPattern?: string;
	interval: "daily" | "weekly" | "monthly" | "custom";
	intervalHours: number;
	executionTime: {
		hour: number;
		minute: number;
	};
	weeklyDays: number[];
	monthlyDay: number;
	skipIfRunning: boolean;
	maxExecutionTimeMinutes: number;
	onlyWhenIdle: boolean;
}

export const DEFAULT_SCHEDULE_SETTINGS: ScanScheduleSettings = {
	enabled: false,
	interval: "weekly",
	intervalHours: 168,
	executionTime: {
		hour: SCAN.DEFAULT_SCHEDULE_HOUR,
		minute: SCAN.DEFAULT_SCHEDULE_MINUTE,
	},
	weeklyDays: [0],
	monthlyDay: SCAN.DEFAULT_MONTHLY_DAY,
	skipIfRunning: true,
	maxExecutionTimeMinutes: SCAN.DEFAULT_MAX_EXECUTION_TIME_MINUTES,
	onlyWhenIdle: false,
};

export const SCHEDULE_SETTINGS_CONSTRAINTS = {
	intervalHours: { min: 1, max: 168 * 4 },
	executionTime: {
		hour: { min: 0, max: 23 },
		minute: { min: 0, max: 59 },
	},
	weeklyDays: { min: 0, max: 6 },
	monthlyDay: { min: 1, max: 31 },
	maxExecutionTimeMinutes: {
		min: SCAN.MIN_EXECUTION_TIME_MINUTES,
		max: SCAN.MAX_EXECUTION_TIME_MINUTES,
	},
} as const;

export const SCHEDULE_INTERVAL_LABELS = {
	daily: "毎日",
	weekly: "毎週",
	monthly: "毎月",
	custom: "カスタム間隔",
} as const;

export const WEEKDAY_LABELS = [
	"日曜日",
	"月曜日",
	"火曜日",
	"水曜日",
	"木曜日",
	"金曜日",
	"土曜日",
] as const;

export interface SchedulerStatus {
	isEnabled: boolean;
	isRunning: boolean;
	nextExecution: Date | null;
	lastExecution: Date | null;
	lastExecutionStatus: "completed" | "failed" | "cancelled" | "timeout" | null;
	currentExecutionStartTime: Date | null;
}
