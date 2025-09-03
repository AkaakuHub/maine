import { prisma } from "@/libs/prisma";
import { SCAN } from "@/utils/constants";

export type ScanPhase = "discovery" | "metadata" | "database";
export type ScanType = "full" | "incremental";

export interface ScanCheckpoint {
	id: string;
	scanId: string;
	scanType: ScanType;
	phase: ScanPhase;
	currentDirectoryIndex: number;
	processedFiles: number;
	totalFiles: number;
	lastProcessedPath: string | null;
	metadataCompleted: boolean;
	startedAt: Date;
	lastCheckpointAt: Date;
	errorMessage: string | null;
	isValid: boolean;
}

/**
 * スキャンチェックポイント管理クラス
 * スキャンの進捗状態保存・復元を担当
 */
export class ScanCheckpointManager {
	/**
	 * チェックポイントを保存
	 */
	async saveCheckpoint(
		scanId: string,
		scanType: ScanType,
		phase: ScanPhase,
		processedFiles: number,
		totalFiles: number,
		currentDirectoryIndex = 0,
		lastProcessedPath: string | null = null,
	): Promise<void> {
		try {
			await prisma.scanCheckpoint.upsert({
				where: { id: "scan_checkpoint" },
				update: {
					scanId,
					scanType,
					phase,
					processedFiles,
					totalFiles,
					currentDirectoryIndex,
					lastProcessedPath,
					lastCheckpointAt: new Date(),
					isValid: true,
				},
				create: {
					id: "scan_checkpoint",
					scanId,
					scanType,
					phase,
					processedFiles,
					totalFiles,
					currentDirectoryIndex,
					lastProcessedPath,
					lastCheckpointAt: new Date(),
					isValid: true,
				},
			});

			console.log(
				`✅ Checkpoint saved: ${phase} phase, ${processedFiles}/${totalFiles} files`,
			);
		} catch (error) {
			console.error("チェックポイント保存エラー:", error);
			throw error;
		}
	}

	/**
	 * 有効なチェックポイントを取得
	 */
	async getValidCheckpoint(): Promise<ScanCheckpoint | null> {
		const checkpoint = await prisma.scanCheckpoint.findUnique({
			where: { id: "scan_checkpoint" },
		});

		if (!checkpoint || !checkpoint.isValid) {
			return null;
		}

		// 設定時間以上古いチェックポイントは無効とする
		const expiredTime = new Date(
			Date.now() - SCAN.CHECKPOINT_VALIDITY_HOURS * 60 * 60 * 1000,
		);
		if (checkpoint.lastCheckpointAt < expiredTime) {
			await this.invalidateCheckpoint();
			return null;
		}

		return {
			id: checkpoint.id,
			scanId: checkpoint.scanId,
			scanType: checkpoint.scanType as ScanType,
			phase: checkpoint.phase as ScanPhase,
			currentDirectoryIndex: checkpoint.currentDirectoryIndex,
			processedFiles: checkpoint.processedFiles,
			totalFiles: checkpoint.totalFiles,
			lastProcessedPath: checkpoint.lastProcessedPath,
			metadataCompleted: checkpoint.metadataCompleted,
			startedAt: checkpoint.startedAt,
			lastCheckpointAt: checkpoint.lastCheckpointAt,
			errorMessage: checkpoint.errorMessage,
			isValid: checkpoint.isValid,
		};
	}

	/**
	 * チェックポイントを無効化
	 */
	async invalidateCheckpoint(): Promise<void> {
		await prisma.scanCheckpoint.upsert({
			where: { id: "scan_checkpoint" },
			update: { isValid: false },
			create: {
				id: "scan_checkpoint",
				scanId: "",
				scanType: "full",
				phase: "discovery",
				isValid: false,
			},
		});

		console.log("🗑️ Checkpoint invalidated");
	}

	/**
	 * チェックポイントから再開可能かどうかをチェック
	 */
	async canResumeFromCheckpoint(): Promise<boolean> {
		const checkpoint = await this.getValidCheckpoint();
		return checkpoint !== null;
	}

	/**
	 * チェックポイント情報を取得（デバッグ用）
	 */
	async getCheckpointInfo(): Promise<{
		exists: boolean;
		isValid: boolean;
		age: number; // 分単位
		phase?: ScanPhase;
		progress?: number; // 0-100
	}> {
		const checkpoint = await prisma.scanCheckpoint.findUnique({
			where: { id: "scan_checkpoint" },
		});

		if (!checkpoint) {
			return { exists: false, isValid: false, age: 0 };
		}

		const ageMs = Date.now() - checkpoint.lastCheckpointAt.getTime();
		const ageMinutes = Math.floor(ageMs / (1000 * 60));
		const progress =
			checkpoint.totalFiles > 0
				? Math.round((checkpoint.processedFiles / checkpoint.totalFiles) * 100)
				: 0;

		return {
			exists: true,
			isValid: checkpoint.isValid,
			age: ageMinutes,
			phase: checkpoint.phase as ScanPhase,
			progress,
		};
	}
}
