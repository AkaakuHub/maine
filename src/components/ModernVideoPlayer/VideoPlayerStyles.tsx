export default function VideoPlayerStyles() {
	return (
		<style jsx>{`
			/* フルスクリーン時のスタイル */
			.group:fullscreen {
				display: flex;
				flex-direction: column;
				width: 100vw !important;
				height: 100vh !important;
				padding: 0 !important;
				margin: 0 !important;
				border-radius: 0 !important;
			}

			.group:fullscreen video {
				flex: 1;
				width: 100% !important;
				height: 100% !important;
				object-fit: contain;
			}

			.progress-slider::-webkit-slider-thumb {
				appearance: none;
				height: 16px;
				width: 16px;
				border-radius: 50%;
				background: #d81c2f;
				cursor: pointer;
				border: 2px solid white;
				box-shadow: 0 2px 8px rgba(216, 28, 47, 0.4);
			}
			.progress-slider::-moz-range-thumb {
				height: 16px;
				width: 16px;
				border-radius: 50%;
				background: #d81c2f;
				cursor: pointer;
				border: 2px solid white;
				box-shadow: 0 2px 8px rgba(216, 28, 47, 0.4);
			}
			.volume-slider::-webkit-slider-thumb {
				appearance: none;
				height: 12px;
				width: 12px;
				border-radius: 50%;
				background: #d81c2f;
				cursor: pointer;
				border: 2px solid white;
				box-shadow: 0 2px 6px rgba(216, 28, 47, 0.4);
			}
			.volume-slider::-moz-range-thumb {
				height: 12px;
				width: 12px;
				border-radius: 50%;
				background: #d81c2f;
				cursor: pointer;
				border: 2px solid white;
				box-shadow: 0 2px 6px rgba(216, 28, 47, 0.4);
			}
		`}</style>
	);
}
