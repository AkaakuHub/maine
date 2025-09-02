"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn, formatDuration } from "@/libs/utils";

// 分離したコンポーネントとタイプのインポート
import VideoElement from "./VideoElement";
import SkipOverlay from "./SkipOverlay";
import ControlsOverlay from "./ControlsOverlay";
import SettingsMenu from "./SettingsMenu";
import VideoPlayerStyles from "./VideoPlayerStyles";
import type {
	HTMLVideoElementWithFullscreen,
	HTMLElementWithFullscreen,
	DocumentWithFullscreen,
	ModernVideoPlayerProps,
	SettingsView,
} from "./types";

const ModernVideoPlayer = ({
	src,
	title,
	onTimeUpdate,
	initialTime = 0,
	className = "",
	onShowHelp,
}: ModernVideoPlayerProps) => {
	const videoRef = useRef<HTMLVideoElementWithFullscreen>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const settingsRef = useRef<HTMLDivElement>(null);
	const settingsButtonRef = useRef<HTMLButtonElement>(null);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isShowRestTime, setIsShowRestTime] = useState(() => {
		// LocalStorageから設定を読み込み
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("video-player-show-rest-time");
			return saved === "true";
		}
		return false;
	});
	const [volume, setVolume] = useState(() => {
		// LocalStorageから設定を読み込み
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("video-player-volume");
			return saved ? Number.parseFloat(saved) : 1;
		}
		return 1;
	});
	const [isMuted, setIsMuted] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const [playbackRate, setPlaybackRate] = useState(() => {
		// LocalStorageから設定を読み込み
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("video-player-playback-rate");
			return saved ? Number.parseFloat(saved) : 1;
		}
		return 1;
	});
	const [showSettings, setShowSettings] = useState(false);
	const [isBuffering, setIsBuffering] = useState(false);

	// スキップ機能
	const [skipSeconds, setSkipSeconds] = useState(() => {
		// LocalStorageから設定を読み込み
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("video-player-skip-seconds");
			return saved ? Number.parseInt(saved, 10) : 10;
		}
		return 10; // デフォルト10秒
	});

	// 連続スキップの閾値管理
	const skipThrottleRef = useRef<NodeJS.Timeout | null>(null);
	const skipQueueRef = useRef<number>(0);
	const [predictedTime, setPredictedTime] = useState<number | null>(null); // 設定メニューの状態
	const [settingsView, setSettingsView] = useState<SettingsView>("main");
	const skipOptions = [5, 10, 20, 60, 90]; // 選択可能な秒数
	// サムネイル用の状態
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

	// スクリーンショット設定の状態
	const [autoDownloadScreenshot, setAutoDownloadScreenshot] = useState(() => {
		// LocalStorageから設定を読み込み
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("screenshot-auto-download");
			return saved === "true";
		}
		return false;
	});

	// 再生/一時停止
	const togglePlay = useCallback(() => {
		if (!videoRef.current) return;

		if (videoRef.current.paused) {
			videoRef.current.play();
			setIsPlaying(true);
		} else {
			videoRef.current.pause();
			setIsPlaying(false);
		}
	}, []);

	// 音量変更
	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = Number.parseFloat(e.target.value);
		setVolume(newVolume);
		// LocalStorageに保存
		localStorage.setItem("video-player-volume", newVolume.toString());
		if (videoRef.current) {
			videoRef.current.volume = newVolume;
			setIsMuted(newVolume === 0);
		}
	};

	// ミュート切り替え
	const toggleMute = useCallback(() => {
		if (!videoRef.current) return;

		if (isMuted) {
			videoRef.current.volume = volume;
			setIsMuted(false);
		} else {
			videoRef.current.volume = 0;
			setIsMuted(true);
		}
	}, [isMuted, volume]); // フルスクリーン切り替え - ブラウザ間互換性を考慮
	const toggleFullscreen = useCallback(async () => {
		if (!containerRef.current) return;

		const doc = document as DocumentWithFullscreen;
		const container = containerRef.current as HTMLElementWithFullscreen;

		try {
			// フルスクリーン状態の確認（ベンダープレフィックス対応）
			const fullscreenElement =
				doc.fullscreenElement ||
				doc.webkitFullscreenElement ||
				doc.mozFullScreenElement ||
				doc.msFullscreenElement;

			if (fullscreenElement) {
				// フルスクリーン解除
				if (doc.exitFullscreen) {
					await doc.exitFullscreen();
				} else if (doc.webkitExitFullscreen) {
					await doc.webkitExitFullscreen();
				} else if (doc.mozCancelFullScreen) {
					await doc.mozCancelFullScreen();
				} else if (doc.msExitFullscreen) {
					await doc.msExitFullscreen();
				}
			} else {
				// フルスクリーン開始
				if (container.requestFullscreen) {
					await container.requestFullscreen();
				} else if (container.webkitRequestFullscreen) {
					await container.webkitRequestFullscreen();
				} else if (container.mozRequestFullScreen) {
					await container.mozRequestFullScreen();
				} else if (container.msRequestFullscreen) {
					await container.msRequestFullscreen();
				}
			}
		} catch (error) {
			console.error("Fullscreen error:", error);
		}
	}, []);

	// シーク
	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!videoRef.current) return;
		const time = Number.parseFloat(e.target.value);
		videoRef.current.currentTime = time;
		setCurrentTime(time);
	};

	// 動画の長さに応じてシークバーのstep値を計算
	const getSeekStep = useCallback(() => {
		if (duration === 0) return 0.01;

		// シンプルな解決策: 常に小さなstepを使用
		// 動画の長さに応じて適切な刻みを設定
		if (duration <= 10) return 0.01; // 10秒以下: 0.01秒刻み
		if (duration <= 30) return 0.1; // 30秒以下: 0.1秒刻み
		if (duration <= 60) return 0.25; // 1分以下: 0.25秒刻み
		if (duration <= 300) return 0.5; // 5分以下: 0.5秒刻み
		if (duration <= 600) return 1; // 10分以下: 1秒刻み
		if (duration <= 1800) return 2; // 30分以下: 2秒刻み
		return 5; // 30分超: 5秒刻み
	}, [duration]);

	// 再生速度変更
	const handlePlaybackRateChange = (rate: number) => {
		if (!videoRef.current) return;
		videoRef.current.playbackRate = rate;
		setPlaybackRate(rate);
		// LocalStorageに保存
		localStorage.setItem("video-player-playback-rate", rate.toString());
		setShowSettings(false);
	};
	// スキップ - 連続処理に対応
	const skip = useCallback(
		(seconds: number) => {
			if (!videoRef.current) return;

			// 現在のキューに追加
			skipQueueRef.current += seconds;

			// 予測時間を更新
			const newPredictedTime = Math.max(
				0,
				Math.min(duration, currentTime + skipQueueRef.current),
			);
			setPredictedTime(newPredictedTime);

			// 既存のタイマーをクリア
			if (skipThrottleRef.current) {
				clearTimeout(skipThrottleRef.current);
			}

			// 500ms後に実際のスキップを実行
			skipThrottleRef.current = setTimeout(() => {
				if (!videoRef.current) return;

				const totalSkip = skipQueueRef.current;
				skipQueueRef.current = 0; // キューをリセット
				setPredictedTime(null); // 予測時間をリセット

				videoRef.current.currentTime = Math.max(
					0,
					Math.min(duration, currentTime + totalSkip),
				);
			}, 500);
		},
		[duration, currentTime],
	);

	// カスタムスキップ関数
	const skipForward = useCallback(() => {
		skip(skipSeconds);
	}, [skip, skipSeconds]);

	const skipBackward = useCallback(() => {
		skip(-skipSeconds);
	}, [skip, skipSeconds]);

	// スキップ秒数設定
	const handleSkipSecondsChange = (seconds: number) => {
		setSkipSeconds(seconds);
		// LocalStorageに保存
		localStorage.setItem("video-player-skip-seconds", seconds.toString());
		setShowSettings(false); // 設定ダイアログを閉じる
	};

	// ダブルタップ機能
	const [lastTapTime, setLastTapTime] = useState(0);
	const [lastTapX, setLastTapX] = useState(0);

	const handleVideoTap = useCallback(
		(e: React.MouseEvent<HTMLVideoElement>) => {
			const currentTime = Date.now();
			const tapX = e.clientX;
			const videoWidth = e.currentTarget.clientWidth;
			const tapPosition = tapX / videoWidth; // 0-1の範囲

			// ダブルタップの判定（300ms以内、同じ位置付近）
			if (currentTime - lastTapTime < 300 && Math.abs(tapX - lastTapX) < 50) {
				e.stopPropagation(); // 通常の再生/一時停止を防ぐ

				if (tapPosition > 0.6) {
					// 右側タップ: 前進
					skipForward();
				} else if (tapPosition < 0.4) {
					// 左側タップ: 後退
					skipBackward();
				}

				// ダブルタップ処理後はlastTapTimeをリセット
				setLastTapTime(0);
			} else {
				setLastTapTime(currentTime);
				setLastTapX(tapX);
			}
		},
		[lastTapTime, lastTapX, skipForward, skipBackward],
	);

	// ピクチャーインピクチャー
	const togglePictureInPicture = async () => {
		if (!videoRef.current) return;

		try {
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
			} else {
				await videoRef.current.requestPictureInPicture();
			}
		} catch (error) {
			console.error("Picture-in-picture error:", error);
		}
	};

	// コントロール表示制御
	const resetControlsTimeout = useCallback(() => {
		if (controlsTimeoutRef.current) {
			clearTimeout(controlsTimeoutRef.current);
		}
		setShowControls(true);
		controlsTimeoutRef.current = setTimeout(() => {
			if (isPlaying) {
				setShowControls(false);
			}
		}, 3000);
	}, [isPlaying]);

	// 設定パネルの外側クリック検知
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				settingsRef.current &&
				!settingsRef.current.contains(event.target as Node) &&
				settingsButtonRef.current &&
				!settingsButtonRef.current.contains(event.target as Node)
			) {
				setShowSettings(false);
				setSettingsView("main"); // メインビューに戻す
			}
		};

		if (showSettings) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showSettings]);

	// キーボードショートカット
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement) return;

			switch (e.code) {
				case "Space":
					e.preventDefault();
					togglePlay();
					break;
				case "ArrowLeft":
					e.preventDefault();
					skipBackward();
					break;
				case "ArrowRight":
					e.preventDefault();
					skipForward();
					break;
				case "ArrowUp":
					e.preventDefault();
					setVolume((prev) => Math.min(1, prev + 0.1));
					break;
				case "ArrowDown":
					e.preventDefault();
					setVolume((prev) => Math.max(0, prev - 0.1));
					break;
				case "KeyF":
					e.preventDefault();
					toggleFullscreen();
					break;
				case "KeyM":
					e.preventDefault();
					toggleMute();
					break;
				case "KeyS":
					e.preventDefault();
					takeScreenshot();
					break;
				case "Slash":
					if (e.shiftKey) {
						// ? キー（Shift + /）
						e.preventDefault();
						onShowHelp?.();
					}
					break;
				case "Escape":
					e.preventDefault();
					if (isFullscreen) {
						// フルスクリーン時はフルスクリーンを解除
						toggleFullscreen();
					} else if (settingsView !== "main") {
						setSettingsView("main"); // サブメニューの場合はメインに戻る
					} else {
						setShowSettings(false); // メインメニューの場合は閉じる
					}
					break;
			}
		};

		document.addEventListener("keydown", handleKeyPress);
		return () => document.removeEventListener("keydown", handleKeyPress);
	}, [
		togglePlay,
		skipBackward,
		skipForward,
		toggleFullscreen,
		toggleMute,
		onShowHelp,
		settingsView,
		isFullscreen,
	]);

	// マウス移動でコントロール表示
	useEffect(() => {
		resetControlsTimeout();
	}, [resetControlsTimeout]);

	// ビデオイベントリスナーの設定
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleTimeUpdate = () => {
			const current = video.currentTime;
			setCurrentTime(current);

			// 現在位置が最後まで到達したら自動的に一時停止
			if (current >= video.duration) {
				setIsPlaying(false);
				video.pause();
			}

			// 親コンポーネントに時間更新を通知
			if (onTimeUpdate && video.duration) {
				onTimeUpdate(current, video.duration);
			}
		};

		const handleLoadedMetadata = () => {
			setDuration(video.duration);

			// 初期時間が設定されている場合は、その位置にシーク
			if (initialTime > 0 && initialTime < video.duration) {
				video.currentTime = initialTime;
			}

			// LocalStorageから読み込んだ設定をビデオ要素に適用
			video.playbackRate = playbackRate;
			video.volume = isMuted ? 0 : volume;

			// 動画が読み込まれたら自動で再生を開始
			video
				.play()
				.then(() => {
					setIsPlaying(true);
				})
				.catch(() => {
					// ブラウザの自動再生ポリシーにより失敗する場合があります
				});
		};

		const handleWaiting = () => setIsBuffering(true);
		const handleCanPlay = () => setIsBuffering(false);

		video.addEventListener("timeupdate", handleTimeUpdate);
		video.addEventListener("loadedmetadata", handleLoadedMetadata);
		video.addEventListener("waiting", handleWaiting);
		video.addEventListener("canplay", handleCanPlay);

		return () => {
			video.removeEventListener("timeupdate", handleTimeUpdate);
			video.removeEventListener("loadedmetadata", handleLoadedMetadata);
			video.removeEventListener("waiting", handleWaiting);
			video.removeEventListener("canplay", handleCanPlay);
		};
	}, [onTimeUpdate, initialTime, playbackRate, volume, isMuted]);
	// フルスクリーン状態の変更を監視
	useEffect(() => {
		const handleFullscreenChange = () => {
			const doc = document as DocumentWithFullscreen;
			const fullscreenElement =
				doc.fullscreenElement ||
				doc.webkitFullscreenElement ||
				doc.mozFullScreenElement ||
				doc.msFullscreenElement;

			setIsFullscreen(!!fullscreenElement);
		};

		// 標準とベンダープレフィックス付きイベントリスナーを追加
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
		document.addEventListener("mozfullscreenchange", handleFullscreenChange);
		document.addEventListener("msfullscreenchange", handleFullscreenChange);

		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
			document.removeEventListener(
				"webkitfullscreenchange",
				handleFullscreenChange,
			);
			document.removeEventListener(
				"mozfullscreenchange",
				handleFullscreenChange,
			);
			document.removeEventListener(
				"msfullscreenchange",
				handleFullscreenChange,
			);
		};
	}, []);

	// 別のアプリにフォーカスがあってもマウスホバーを検出するための強化されたマウス検出
	useEffect(() => {
		if (!containerRef.current) return;

		const container = containerRef.current;
		let isMouseInside = false;

		const handleMouseEnterCapture = () => {
			if (!isMouseInside) {
				isMouseInside = true;
				setShowControls(true);
				resetControlsTimeout();
			}
		};

		const handleMouseLeaveCapture = () => {
			isMouseInside = false;
			if (isPlaying) {
				setShowControls(false);
			}
		};

		const handleMouseMoveCapture = () => {
			if (isMouseInside) {
				setShowControls(true);
				resetControlsTimeout();
			}
		};

		// Capture phaseでイベントを検出してウィンドウフォーカスに関係なくホバーを検出
		container.addEventListener("mouseenter", handleMouseEnterCapture, {
			capture: true,
		});
		container.addEventListener("mouseleave", handleMouseLeaveCapture, {
			capture: true,
		});
		container.addEventListener("mousemove", handleMouseMoveCapture, {
			capture: true,
		});

		return () => {
			container.removeEventListener("mouseenter", handleMouseEnterCapture, {
				capture: true,
			});
			container.removeEventListener("mouseleave", handleMouseLeaveCapture, {
				capture: true,
			});
			container.removeEventListener("mousemove", handleMouseMoveCapture, {
				capture: true,
			});
		};
	}, [isPlaying, resetControlsTimeout]);

	// Media Session API のメタデータとアクションハンドラーを設定（初回のみ）
	useEffect(() => {
		if ("mediaSession" in navigator) {
			try {
				const videoTitle =
					title || src.split("/").pop()?.split(".")[0] || "無題の動画";

				// アクションハンドラーを設定（一度だけ）
				navigator.mediaSession.setActionHandler("play", () => {
					if (videoRef.current?.paused) {
						togglePlay();
					}
				});

				navigator.mediaSession.setActionHandler("pause", () => {
					if (!videoRef.current?.paused) {
						togglePlay();
					}
				});

				navigator.mediaSession.setActionHandler("seekbackward", () => {
					skipBackward();
				});

				navigator.mediaSession.setActionHandler("seekforward", () => {
					skipForward();
				});

				// HTMLのタイトルを更新（一度だけ）
				document.title = `${videoTitle} - My Video Storage`;
			} catch {
				// Media Session API not supported
			}
		}

		return () => {
			// クリーンアップ
			try {
				if ("mediaSession" in navigator) {
					navigator.mediaSession.metadata = null;
					navigator.mediaSession.setActionHandler("play", null);
					navigator.mediaSession.setActionHandler("pause", null);
					navigator.mediaSession.setActionHandler("seekbackward", null);
					navigator.mediaSession.setActionHandler("seekforward", null);
				}
			} catch {
				// エラーを無視
			}
		};
	}, [title, src, togglePlay, skipBackward, skipForward]);

	// Media Session API のメタデータを設定（サムネイル含む）
	useEffect(() => {
		if ("mediaSession" in navigator) {
			try {
				const videoTitle =
					title || src.split("/").pop()?.split(".")[0] || "無題の動画";

				// サムネイルの有無に応じてartworkを設定
				const artwork = thumbnailUrl
					? [
							{
								src: thumbnailUrl,
								sizes: "640x360",
								type: "image/jpeg",
							},
						]
					: [
							{
								src: "/favicon.ico",
								sizes: "96x96",
								type: "image/x-icon",
							},
						];

				// @ts-ignore - MediaMetadata は実行時に利用可能
				navigator.mediaSession.metadata = new MediaMetadata({
					title: videoTitle,
					artist: "My Video Storage",
					album: "ビデオ動画",
					artwork,
				});
			} catch {
				// Media Session metadata update failed
			}
		}
	}, [thumbnailUrl, title, src]);

	// Media Session API の位置情報を更新
	useEffect(() => {
		if ("mediaSession" in navigator && duration > 0) {
			try {
				navigator.mediaSession.setPositionState({
					duration: duration,
					playbackRate: playbackRate,
					position: currentTime,
				});
			} catch {
				// Media Session position update failed
			}
		}
	}, [duration, currentTime, playbackRate]);

	// 動画の特定位置のフレームをキャプチャしてサムネイルを生成
	const generateVideoThumbnail = useCallback(
		(timePosition = 0.01): Promise<string | null> => {
			return new Promise((resolve) => {
				if (!videoRef.current || videoRef.current.readyState < 2) {
					console.warn("Video not ready for thumbnail capture");
					resolve(null);
					return;
				}

				const video = videoRef.current;
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");

				if (!ctx) {
					console.error("Canvas context not available");
					resolve(null);
					return;
				}

				// キャンバスのサイズを動画に合わせる
				canvas.width = video.videoWidth || 640;
				canvas.height = video.videoHeight || 360;

				// 現在の再生位置を保存
				const originalTime = video.currentTime;
				const originalPaused = video.paused;

				// サムネイル用の時間位置に移動（デフォルトは動画の1%の位置）
				// 無駄なフェッチを減らす
				const targetTime = Math.min(
					video.duration * timePosition,
					video.duration - 0.1, // 最後から0.1秒前まで
				);

				const onSeeked = () => {
					try {
						// フレームをキャンバスに描画
						ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

						// DataURLとして画像を取得
						const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.8);

						// 元の位置に戻す
						video.currentTime = originalTime;
						if (!originalPaused) {
							video.play().catch(() => {
								// エラーを無視
							});
						}

						resolve(thumbnailDataUrl);
					} catch (error) {
						console.error("Error generating thumbnail:", error);
						// 元の位置に戻す
						video.currentTime = originalTime;
						if (!originalPaused) {
							video.play().catch(() => {
								// エラーを無視
							});
						}
						resolve(null);
					} finally {
						video.removeEventListener("seeked", onSeeked);
					}
				};

				// seekedイベントをリスニング
				video.addEventListener("seeked", onSeeked, { once: true });

				// 指定位置にシーク
				video.currentTime = targetTime;
			});
		},
		[],
	);

	// スクリーンショット取得機能（現在のフレーム）
	const takeScreenshot = useCallback(async () => {
		if (!videoRef.current || videoRef.current.readyState < 2) {
			console.warn("Video not ready for screenshot");
			return;
		}

		const video = videoRef.current;
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			console.error("Canvas context not available");
			return;
		}

		// キャンバスのサイズを動画に合わせる
		canvas.width = video.videoWidth || 640;
		canvas.height = video.videoHeight || 360;

		try {
			// 現在のフレームをキャンバスに描画
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			// Canvas から Blob を作成
			canvas.toBlob(async (blob) => {
				if (!blob) return;

				try {
					// クリップボードAPIが使用可能かチェック
					if (navigator.clipboard?.write && window.isSecureContext) {
						await navigator.clipboard.write([
							new ClipboardItem({ "image/png": blob }),
						]);
						console.log("スクリーンショットをクリップボードにコピーしました");
					} else {
						console.warn(
							"クリップボードAPIが使用できません（HTTPS接続またはlocalhostでのみ利用可能）",
						);
					}

					// 自動ダウンロードが有効な場合はダウンロードも実行
					if (autoDownloadScreenshot) {
						const url = URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.href = url;

						// ファイル名を生成（動画タイトル + 時間 + ランダム英数字）
						const videoTitle = title || "screenshot";
						const timeStr = formatDuration(currentTime).replace(/:/g, "-");
						const randomId = Math.random().toString(36).substring(2, 8);
						a.download = `${videoTitle}_${timeStr}_${randomId}.png`;

						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						URL.revokeObjectURL(url);

						console.log("スクリーンショットをダウンロードしました");
					}
				} catch (error) {
					console.error("クリップボードへのコピーに失敗:", error);
				}
			}, "image/png");
		} catch (error) {
			console.error("スクリーンショット取得エラー:", error);
		}
	}, [autoDownloadScreenshot, title, currentTime]);

	// スクリーンショット設定の変更
	const handleScreenshotSettingChange = useCallback((enabled: boolean) => {
		setAutoDownloadScreenshot(enabled);
		localStorage.setItem("screenshot-auto-download", enabled.toString());
		setShowSettings(false);
	}, []);

	// 動画のメタデータが読み込まれた際にサムネイルを生成
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleLoadedMetadata = async () => {
			// サムネイルを生成（動画の1%の位置）
			const thumbnail = await generateVideoThumbnail(0.01);
			if (thumbnail) {
				setThumbnailUrl(thumbnail);
			}
		};

		// メタデータが既に読み込まれている場合は即座に実行
		if (video.readyState >= 1) {
			handleLoadedMetadata();
		} else {
			video.addEventListener("loadedmetadata", handleLoadedMetadata);
		}

		return () => {
			video.removeEventListener("loadedmetadata", handleLoadedMetadata);
		};
	}, [generateVideoThumbnail]);

	// クリーンアップ処理
	useEffect(() => {
		return () => {
			// タイマーのクリーンアップ
			if (controlsTimeoutRef.current) {
				clearTimeout(controlsTimeoutRef.current);
			}
			if (skipThrottleRef.current) {
				clearTimeout(skipThrottleRef.current);
			}

			// 予測時間をリセット
			setPredictedTime(null);
			skipQueueRef.current = 0;

			// Media Session API のクリーンアップ
			try {
				if ("mediaSession" in navigator) {
					navigator.mediaSession.metadata = null;
					navigator.mediaSession.setActionHandler("play", null);
					navigator.mediaSession.setActionHandler("pause", null);
					navigator.mediaSession.setActionHandler("seekbackward", null);
					navigator.mediaSession.setActionHandler("seekforward", null);
				}
			} catch {
				// エラーを無視
			}
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative bg-overlay rounded-lg overflow-hidden group",
				isFullscreen &&
					"!fixed !inset-0 !w-screen !h-screen !rounded-none !z-50 flex flex-col",
				className,
			)}
			style={{
				cursor: showControls ? "default" : "none",
			}}
			onMouseMove={resetControlsTimeout}
			onMouseEnter={() => {
				// ウィンドウフォーカスに関係なくホバー時にコントロールを表示
				setShowControls(true);
				resetControlsTimeout();
			}}
			onMouseLeave={() => {
				// マウスが離れたらコントロールを非表示（再生中の場合のみ）
				if (isPlaying) {
					setShowControls(false);
				}
			}}
		>
			{/* ビデオ要素 */}
			<VideoElement
				src={src}
				title={title}
				videoRef={videoRef}
				isFullscreen={isFullscreen}
				isPlaying={isPlaying}
				isBuffering={isBuffering}
				lastTapTime={lastTapTime}
				onVideoTap={handleVideoTap}
				onTogglePlay={togglePlay}
			/>

			{/* スキップ予測オーバーレイ */}
			<SkipOverlay
				predictedTime={predictedTime}
				skipQueue={skipQueueRef.current}
				show={predictedTime !== null && skipQueueRef.current !== 0}
			/>

			{/* コントロール */}
			<ControlsOverlay
				show={showControls}
				duration={duration}
				currentTime={currentTime}
				predictedTime={predictedTime}
				isPlaying={isPlaying}
				skipSeconds={skipSeconds}
				isMuted={isMuted}
				volume={volume}
				isShowRestTime={isShowRestTime}
				isFullscreen={isFullscreen}
				showSettings={showSettings}
				settingsButtonRef={settingsButtonRef}
				getSeekStep={getSeekStep}
				onSeek={handleSeek}
				onTogglePlay={togglePlay}
				onSkipBackward={skipBackward}
				onSkipForward={skipForward}
				onToggleMute={toggleMute}
				onVolumeChange={handleVolumeChange}
				onSetIsShowRestTime={setIsShowRestTime}
				onSetShowSettings={setShowSettings}
				onSetSettingsView={setSettingsView}
				onTakeScreenshot={takeScreenshot}
				onTogglePictureInPicture={togglePictureInPicture}
				onToggleFullscreen={toggleFullscreen}
			/>

			{/* 設定メニュー */}
			<SettingsMenu
				show={showSettings}
				settingsView={settingsView}
				setSettingsView={setSettingsView}
				skipSeconds={skipSeconds}
				skipOptions={skipOptions}
				playbackRate={playbackRate}
				autoDownloadScreenshot={autoDownloadScreenshot}
				onSkipSecondsChange={handleSkipSecondsChange}
				onPlaybackRateChange={handlePlaybackRateChange}
				onScreenshotSettingChange={handleScreenshotSettingChange}
				settingsRef={settingsRef}
			/>

			{/* カスタムスライダースタイル */}
			<VideoPlayerStyles />
		</div>
	);
};

export default ModernVideoPlayer;
