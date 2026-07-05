import type { LoggerService } from "@nestjs/common";
import type { Writable } from "node:stream";

const LOG_LEVELS = ["error", "warn", "info", "debug", "trace"] as const;

type AppLogLevel = (typeof LOG_LEVELS)[number];

const LOG_LEVEL_PRIORITY: Record<AppLogLevel, number> = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
	trace: 4,
};

const DEFAULT_LOG_LEVEL: AppLogLevel = "error";
const LOG_LEVEL_ENV_NAME = "MAINE_BACKEND_LOG_LEVEL";

class AppLogger implements LoggerService {
	private readonly configuredLevel: AppLogLevel;

	constructor(private readonly context?: string) {
		this.configuredLevel = resolveLogLevel(process.env[LOG_LEVEL_ENV_NAME]);
	}

	error(message: unknown, ...optionalParams: unknown[]): void {
		this.write("error", message, optionalParams);
	}

	warn(message: unknown, ...optionalParams: unknown[]): void {
		this.write("warn", message, optionalParams);
	}

	log(message: unknown, ...optionalParams: unknown[]): void {
		this.write("info", message, optionalParams);
	}

	debug(message: unknown, ...optionalParams: unknown[]): void {
		this.write("debug", message, optionalParams);
	}

	verbose(message: unknown, ...optionalParams: unknown[]): void {
		this.write("trace", message, optionalParams);
	}

	info(message: unknown, ...optionalParams: unknown[]): void {
		this.write("info", message, optionalParams);
	}

	trace(message: unknown, ...optionalParams: unknown[]): void {
		this.write("trace", message, optionalParams);
	}

	private write(
		level: AppLogLevel,
		message: unknown,
		optionalParams: unknown[],
	): void {
		if (LOG_LEVEL_PRIORITY[level] > LOG_LEVEL_PRIORITY[this.configuredLevel]) {
			return;
		}

		const output = formatLogLine({
			level,
			context: this.context,
			message,
			optionalParams,
		});
		const stream = level === "error" ? process.stderr : process.stdout;
		writeLine(stream, output);
	}
}

export function createAppLogger(context?: string): AppLogger {
	return new AppLogger(context);
}

function resolveLogLevel(value: string | undefined): AppLogLevel {
	if (!value) {
		return DEFAULT_LOG_LEVEL;
	}

	if (isLogLevel(value)) {
		return value;
	}

	throw new Error(`Invalid ${LOG_LEVEL_ENV_NAME}: ${value}`);
}

function isLogLevel(value: string): value is AppLogLevel {
	return LOG_LEVELS.includes(value as AppLogLevel);
}

function formatLogLine(params: {
	level: AppLogLevel;
	context?: string;
	message: unknown;
	optionalParams: unknown[];
}): string {
	const timestamp = new Date().toISOString();
	const context = params.context ? ` [${params.context}]` : "";
	const values = [params.message, ...params.optionalParams];
	const message = values.map((value) => serializeLogValue(value)).join(" ");

	return `${timestamp} ${params.level.toUpperCase()}${context} ${message}`;
}

function serializeLogValue(value: unknown): string {
	if (value instanceof Error) {
		return value.stack ?? value.message;
	}

	if (typeof value === "string") {
		return value;
	}

	if (
		typeof value === "number" ||
		typeof value === "boolean" ||
		typeof value === "bigint"
	) {
		return value.toString();
	}

	if (value === null) {
		return "null";
	}

	if (value === undefined) {
		return "undefined";
	}

	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function writeLine(stream: Writable, line: string): void {
	stream.write(`${line}\n`);
}
