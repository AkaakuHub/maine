import { SCAN } from "../../utils/constants";

export interface ScanSettings {
	scanMode: "lightweight" | "full";
	batchSize: number;
	progressUpdateInterval: number;
	sleepInterval: number;
	processingPriority: "low" | "normal" | "high";
	maxConcurrentOperations: number;
	memoryThresholdMB: number;
	autoPauseOnHighCPU: boolean;
	autoPauseThreshold: number;
	autoPauseTimeRange: {
		enabled: boolean;
		startHour: number;
		endHour: number;
	};
	enableDetailedLogging: boolean;
	showResourceMonitoring: boolean;
	enablePerformanceMetrics: boolean;
}

export const DEFAULT_SCAN_SETTINGS: ScanSettings = {
	scanMode: "lightweight",
	batchSize: SCAN.DEFAULT_BATCH_SIZE,
	progressUpdateInterval: SCAN.DEFAULT_PROGRESS_UPDATE_INTERVAL,
	sleepInterval: SCAN.DEFAULT_SLEEP_INTERVAL,
	processingPriority: "normal",
	maxConcurrentOperations: SCAN.MIN_CONCURRENT_OPERATIONS,
	memoryThresholdMB: SCAN.DEFAULT_MEMORY_THRESHOLD_MB,
	autoPauseOnHighCPU: false,
	autoPauseThreshold: SCAN.DEFAULT_AUTO_PAUSE_THRESHOLD,
	autoPauseTimeRange: {
		enabled: false,
		startHour: SCAN.DEFAULT_AUTO_PAUSE_START_HOUR,
		endHour: SCAN.DEFAULT_AUTO_PAUSE_END_HOUR,
	},
	enableDetailedLogging: true,
	showResourceMonitoring: true,
	enablePerformanceMetrics: true,
};

export const SCAN_SETTINGS_CONSTRAINTS = {
	batchSize: { min: SCAN.MIN_BATCH_SIZE, max: SCAN.MAX_BATCH_SIZE },
	progressUpdateInterval: {
		min: SCAN.MIN_PROGRESS_UPDATE_INTERVAL,
		max: SCAN.MAX_PROGRESS_UPDATE_INTERVAL,
	},
	sleepInterval: { min: SCAN.MIN_SLEEP_INTERVAL, max: SCAN.MAX_SLEEP_INTERVAL },
	maxConcurrentOperations: {
		min: SCAN.MIN_CONCURRENT_OPERATIONS,
		max: SCAN.MAX_CONCURRENT_OPERATIONS,
	},
	memoryThresholdMB: {
		min: SCAN.MIN_MEMORY_THRESHOLD_MB,
		max: SCAN.MAX_MEMORY_THRESHOLD_MB,
	},
	autoPauseThreshold: {
		min: SCAN.MIN_AUTO_PAUSE_THRESHOLD,
		max: SCAN.MAX_AUTO_PAUSE_THRESHOLD,
	},
} as const;
