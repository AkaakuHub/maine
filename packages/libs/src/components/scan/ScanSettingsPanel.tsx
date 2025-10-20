"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Settings,
	RotateCcw,
	Save,
	Loader2,
	AlertCircle,
	CheckCircle,
	Info,
} from "lucide-react";
import { cn } from "../../libs/utils";
import { ToggleButton } from "../../components/ui/RadioGroup";
import {
	type ScanSettings,
	DEFAULT_SCAN_SETTINGS,
	SCAN_SETTINGS_CONSTRAINTS,
} from "../../types/scanSettings";
import { createApiUrl } from "../../utils/api";

interface ScanSettingsPanelProps {
	className?: string;
}

/**
 * スキャン設定パネルコンポーネント
 *
 * スキャンパラメータの設定・保存・リセットを提供
 */
export function ScanSettingsPanel({ className }: ScanSettingsPanelProps) {
	const [settings, setSettings] = useState<ScanSettings>(DEFAULT_SCAN_SETTINGS);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error" | "info";
		text: string;
	} | null>(null);

	// 設定を読み込み
	const loadSettings = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await fetch(createApiUrl("/scan/settings"));
			if (response.ok) {
				const data = await response.json();
				setSettings(data.settings);
			} else {
				const error = await response.json();
				setMessage({
					type: "error",
					text: `設定の読み込みに失敗しました: ${error.error}`,
				});
			}
		} catch {
			setMessage({
				type: "error",
				text: "設定の読み込み中にエラーが発生しました",
			});
		} finally {
			setIsLoading(false);
		}
	}, []);

	// 設定を保存
	const saveSettings = async () => {
		setIsSaving(true);
		setMessage(null);
		try {
			const response = await fetch(createApiUrl("/scan/settings"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(settings),
			});

			if (response.ok) {
				setMessage({ type: "success", text: "設定を保存しました" });
			} else {
				const error = await response.json();
				setMessage({
					type: "error",
					text: `設定の保存に失敗しました: ${error.error}`,
				});
			}
		} catch {
			setMessage({ type: "error", text: "設定の保存中にエラーが発生しました" });
		} finally {
			setIsSaving(false);
		}
	};

	// 設定をリセット
	const resetSettings = async () => {
		setIsLoading(true);
		setMessage(null);
		try {
			const response = await fetch(createApiUrl("/scan/settings"), {
				method: "PUT",
			});

			if (response.ok) {
				const data = await response.json();
				setSettings(data.settings);
				setMessage({
					type: "info",
					text: "設定をデフォルトにリセットしました",
				});
			} else {
				const error = await response.json();
				setMessage({
					type: "error",
					text: `設定のリセットに失敗しました: ${error.error}`,
				});
			}
		} catch {
			setMessage({
				type: "error",
				text: "設定のリセット中にエラーが発生しました",
			});
		} finally {
			setIsLoading(false);
		}
	};

	// 初回読み込み
	useEffect(() => {
		loadSettings();
	}, [loadSettings]);

	// メッセージを自動消去
	useEffect(() => {
		if (message) {
			const timer = setTimeout(() => setMessage(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [message]);

	// 設定値の更新ハンドラー
	const updateSetting = <K extends keyof ScanSettings>(
		key: K,
		value: ScanSettings[K],
	) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	};

	// 入力フィールドコンポーネント
	const NumberInput = ({
		label,
		value,
		onChange,
		min,
		max,
		step = 1,
		unit,
		description,
	}: {
		label: string;
		value: number;
		onChange: (value: number) => void;
		min: number;
		max: number;
		step?: number;
		unit?: string;
		description?: string;
	}) => {
		const inputId = `number-input-${label.toLowerCase().replace(/\s+/g, "-")}`;
		return (
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label
						htmlFor={inputId}
						className="text-sm font-medium text-text-primary"
					>
						{label}
					</label>
					<div className="flex items-center gap-2">
						<input
							id={inputId}
							type="number"
							value={value}
							onChange={(e) => onChange(Number(e.target.value))}
							min={min}
							max={max}
							step={step}
							className="w-20 px-2 py-1 text-sm bg-surface-elevated border border-border rounded text-center focus:ring-2 focus:ring-primary focus:border-transparent"
						/>
						{unit && (
							<span className="text-xs text-text-secondary">{unit}</span>
						)}
					</div>
				</div>
				{description && (
					<p className="text-xs text-text-muted">{description}</p>
				)}
			</div>
		);
	};

	// 選択フィールドコンポーネント
	const SelectInput = ({
		label,
		value,
		onChange,
		options,
		description,
	}: {
		label: string;
		value: string;
		onChange: (value: string) => void;
		options: { value: string; label: string }[];
		description?: string;
	}) => {
		const selectId = `select-input-${label.toLowerCase().replace(/\s+/g, "-")}`;
		return (
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label
						htmlFor={selectId}
						className="text-sm font-medium text-text-primary"
					>
						{label}
					</label>
					<select
						id={selectId}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						className="px-3 py-1 text-sm bg-surface-elevated border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent"
					>
						{options.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>
				{description && (
					<p className="text-xs text-text-muted">{description}</p>
				)}
			</div>
		);
	};

	// チェックボックスコンポーネント
	const CheckboxInput = ({
		label,
		checked,
		onChange,
		description,
	}: {
		label: string;
		checked: boolean;
		onChange: (checked: boolean) => void;
		description?: string;
	}) => {
		return (
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-text-primary">{label}</span>
					<ToggleButton
						checked={checked}
						onToggle={onChange}
						variant="checkbox"
					/>
				</div>
				{description && (
					<p className="text-xs text-text-muted">{description}</p>
				)}
			</div>
		);
	};

	if (isLoading) {
		return (
			<div
				className={cn(
					"bg-surface rounded-lg border border-border p-6",
					className,
				)}
			>
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
					<span className="ml-2 text-text-secondary">設定を読み込み中...</span>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"bg-surface rounded-lg border border-border p-6",
				className,
			)}
		>
			{/* ヘッダー */}
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
					<Settings className="h-5 w-5" />
					スキャン設定
				</h3>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={resetSettings}
						disabled={isLoading}
						className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-elevated text-text-secondary border border-border rounded hover:bg-surface-elevated/80 disabled:opacity-50"
					>
						<RotateCcw className="h-3 w-3" />
						リセット
					</button>
					<button
						type="button"
						onClick={saveSettings}
						disabled={isSaving}
						className="text-text-inverse flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
					>
						{isSaving ? (
							<Loader2 className="h-3 w-3 animate-spin" />
						) : (
							<Save className="h-3 w-3" />
						)}
						保存
					</button>
				</div>
			</div>

			{/* メッセージ表示 */}
			{message && (
				<div
					className={cn(
						"flex items-center gap-2 p-3 mb-4 rounded-md border text-sm",
						message.type === "success" &&
							"bg-primary/10 border-primary/20 text-primary",
						message.type === "error" &&
							"bg-error/10 border-error/20 text-error",
						message.type === "info" &&
							"bg-primary/10 border-primary/20 text-text-primary",
					)}
				>
					{message.type === "success" && <CheckCircle className="h-4 w-4" />}
					{message.type === "error" && <AlertCircle className="h-4 w-4" />}
					{message.type === "info" && <Info className="h-4 w-4" />}
					{message.text}
				</div>
			)}

			{/* 設定項目 */}
			<div className="space-y-6">
				{/* 基本設定 */}
				<div>
					<h4 className="text-md font-medium text-text-primary mb-3 border-b border-border pb-2">
						基本設定
					</h4>
					<div className="space-y-4">
						<NumberInput
							label="バッチサイズ"
							value={settings.batchSize}
							onChange={(value) => updateSetting("batchSize", value)}
							min={SCAN_SETTINGS_CONSTRAINTS.batchSize.min}
							max={SCAN_SETTINGS_CONSTRAINTS.batchSize.max}
							unit="ファイル"
							description="動的バッチサイズ調整のベース値"
						/>
						<NumberInput
							label="進捗更新間隔"
							value={settings.progressUpdateInterval}
							onChange={(value) =>
								updateSetting("progressUpdateInterval", value)
							}
							min={SCAN_SETTINGS_CONSTRAINTS.progressUpdateInterval.min}
							max={SCAN_SETTINGS_CONSTRAINTS.progressUpdateInterval.max}
							unit="ファイル"
							description="何ファイルごとに進捗を更新するか"
						/>
						<NumberInput
							label="休憩間隔"
							value={settings.sleepInterval}
							onChange={(value) => updateSetting("sleepInterval", value)}
							min={SCAN_SETTINGS_CONSTRAINTS.sleepInterval.min}
							max={SCAN_SETTINGS_CONSTRAINTS.sleepInterval.max}
							unit="ms"
							description="CPU負荷軽減のための休憩時間"
						/>
					</div>
				</div>

				{/* パフォーマンス設定 */}
				<div>
					<h4 className="text-md font-medium text-text-primary mb-3 border-b border-border pb-2">
						パフォーマンス設定
					</h4>
					<div className="space-y-4">
						<SelectInput
							label="処理優先度"
							value={settings.processingPriority}
							onChange={(value) =>
								updateSetting(
									"processingPriority",
									value as "low" | "normal" | "high",
								)
							}
							options={[
								{ value: "low", label: "低" },
								{ value: "normal", label: "標準" },
								{ value: "high", label: "高" },
							]}
							description="システムリソースの使用優先度"
						/>
						<NumberInput
							label="最大並行処理数"
							value={settings.maxConcurrentOperations}
							onChange={(value) =>
								updateSetting("maxConcurrentOperations", value)
							}
							min={SCAN_SETTINGS_CONSTRAINTS.maxConcurrentOperations.min}
							max={SCAN_SETTINGS_CONSTRAINTS.maxConcurrentOperations.max}
							unit="個"
							description="メタデータ処理の並列実行数"
						/>
						<NumberInput
							label="メモリしきい値"
							value={settings.memoryThresholdMB}
							onChange={(value) => updateSetting("memoryThresholdMB", value)}
							min={SCAN_SETTINGS_CONSTRAINTS.memoryThresholdMB.min}
							max={SCAN_SETTINGS_CONSTRAINTS.memoryThresholdMB.max}
							unit="MB"
							description="メモリ使用量の自動監視しきい値"
						/>
					</div>
				</div>

				{/* 自動一時停止設定 */}
				<div>
					<h4 className="text-md font-medium text-text-primary mb-3 border-b border-border pb-2">
						自動一時停止設定
					</h4>
					<div className="space-y-4">
						<CheckboxInput
							label="高CPU使用率時の自動一時停止"
							checked={settings.autoPauseOnHighCPU}
							onChange={(checked) =>
								updateSetting("autoPauseOnHighCPU", checked)
							}
							description="CPUが高負荷時に自動でスキャンを一時停止"
						/>
						{settings.autoPauseOnHighCPU && (
							<NumberInput
								label="CPU使用率しきい値"
								value={settings.autoPauseThreshold}
								onChange={(value) => updateSetting("autoPauseThreshold", value)}
								min={SCAN_SETTINGS_CONSTRAINTS.autoPauseThreshold.min}
								max={SCAN_SETTINGS_CONSTRAINTS.autoPauseThreshold.max}
								unit="%"
								description="自動一時停止するCPU使用率"
							/>
						)}
						<CheckboxInput
							label="時間帯による自動一時停止"
							checked={settings.autoPauseTimeRange.enabled}
							onChange={(checked) =>
								updateSetting("autoPauseTimeRange", {
									...settings.autoPauseTimeRange,
									enabled: checked,
								})
							}
							description="指定した時間帯にスキャンを自動一時停止"
						/>
						{settings.autoPauseTimeRange.enabled && (
							<div className="ml-4 space-y-3 p-3 bg-surface-elevated rounded border">
								<div className="flex items-center gap-4">
									<NumberInput
										label="開始時刻"
										value={settings.autoPauseTimeRange.startHour}
										onChange={(value) =>
											updateSetting("autoPauseTimeRange", {
												...settings.autoPauseTimeRange,
												startHour: value,
											})
										}
										min={0}
										max={23}
										unit="時"
									/>
									<NumberInput
										label="終了時刻"
										value={settings.autoPauseTimeRange.endHour}
										onChange={(value) =>
											updateSetting("autoPauseTimeRange", {
												...settings.autoPauseTimeRange,
												endHour: value,
											})
										}
										min={0}
										max={23}
										unit="時"
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* デバッグ・監視設定 */}
				<div>
					<h4 className="text-md font-medium text-text-primary mb-3 border-b border-border pb-2">
						デバッグ・監視設定
					</h4>
					<div className="space-y-4">
						<CheckboxInput
							label="詳細ログ出力"
							checked={settings.enableDetailedLogging}
							onChange={(checked) =>
								updateSetting("enableDetailedLogging", checked)
							}
							description="詳細なスキャンログを出力"
						/>
						<CheckboxInput
							label="リソース監視表示"
							checked={settings.showResourceMonitoring}
							onChange={(checked) =>
								updateSetting("showResourceMonitoring", checked)
							}
							description="CPU・メモリ使用量の監視情報を表示"
						/>
						<CheckboxInput
							label="パフォーマンス指標"
							checked={settings.enablePerformanceMetrics}
							onChange={(checked) =>
								updateSetting("enablePerformanceMetrics", checked)
							}
							description="処理速度・時間計測などの指標を表示"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
