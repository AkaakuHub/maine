"use client";

import { Download, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatFileSize } from "@/libs/utils";
import type { VideoFileData } from "@/type";

interface OfflineManagementPanelProps {
	offlineVideos: VideoFileData[];
	cacheSize: number;
	storageEstimate: StorageEstimate | null;
	onRefreshCachedVideos: () => void;
	onClearAllOffline: () => void;
}

export function OfflineManagementPanel({
	offlineVideos,
	cacheSize,
	storageEstimate,
	onRefreshCachedVideos,
	onClearAllOffline,
}: OfflineManagementPanelProps) {
	return (
		<div className="container mx-auto px-6">
			{/* オフライン管理パネル */}
			<div className="bg-surface-elevated rounded-lg p-4">
				<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
							<Download className="h-5 w-5 text-primary" />
						</div>
						<div>
							<h3 className="text-text font-semibold">オフライン動画管理</h3>
							<p className="text-sm text-text-secondary">
								{storageEstimate &&
								storageEstimate.usage != null &&
								storageEstimate.quota != null ? (
									<>
										使用容量: {formatFileSize(storageEstimate.usage)} /{" "}
										{formatFileSize(storageEstimate.quota)} (
										{Math.round(
											(storageEstimate.usage / storageEstimate.quota) * 100,
										)}
										%)
									</>
								) : cacheSize > 0 ? (
									`使用容量: ${formatFileSize(cacheSize)}`
								) : (
									"ストレージ情報を取得中..."
								)}
							</p>
						</div>
					</div>
					<div className="flex gap-2">
						<Button
							onClick={onRefreshCachedVideos}
							variant="secondary"
							size="sm"
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							更新
						</Button>
						{offlineVideos.length > 0 && (
							<Button onClick={onClearAllOffline} variant="danger" size="sm">
								<Trash2 className="h-4 w-4 mr-2" />
								すべて削除
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
