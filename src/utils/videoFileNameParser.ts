/**
 * 動画ファイル名から番組情報を抽出するユーティリティ
 */

export interface ParsedVideoInfo {
	cleanTitle: string; // クリーンなタイトル
	originalTitle: string; // 元のタイトル
	broadcastDate?: Date; // 放送日時
	broadcastStation?: string; // 放送局
	dayOfWeek?: string; // 曜日
	timeSlot?: string; // 時間帯（例: "21:54"）
	weeklySchedule?: string; // 曜日+時間（例: "毎週月曜日 21:54"）
}

/**
 * 放送局名をクリーンアップ
 */
export function cleanStationName(station: string): string {
	// よくある放送局名のマッピング
	const stationMap: Record<string, string> = {
		ＢＳ１１イレブン: "BS11",
		ＢＳ１１: "BS11",
		ＢＳフジ: "BSフジ",
		"ＢＳ-ＴＢＳ": "BS-TBS",
		ＢＳテレ東: "BSテレ東",
		ＢＳアニマックス: "アニマックス",
		ＡＴＸＸ: "AT-X",
		"ＡＴ－Ｘ": "AT-X",
	};

	return stationMap[station] || station;
}

/**
 * ファイル名から番組情報をパースする
 * 例: "202505252330_負けヒロインが多すぎる! 第8話「おこまりでしたらコンサルに」_ＢＳ１１イレブン.mp4"
 */
export function parseVideoFileName(fileName: string): ParsedVideoInfo {
	// 拡張子を除去
	const nameWithoutExt = fileName.replace(/\.(mp4|mkv|avi|mov|ts|m2ts)$/i, "");

	// 日付パターン (YYYYMMDDHHMM) をマッチ
	const datePattern = /^(\d{12})_/;
	const stationPattern = /_([^_]+)$/;

	const dateMatch = nameWithoutExt.match(datePattern);
	const stationMatch = nameWithoutExt.match(stationPattern);

	let cleanTitle = nameWithoutExt;
	let broadcastDate: Date | undefined;
	let broadcastStation: string | undefined;
	let dayOfWeek: string | undefined;
	let timeSlot: string | undefined;
	let weeklySchedule: string | undefined;

	// 日付情報を抽出
	if (dateMatch) {
		const dateStr = dateMatch[1]; // YYYYMMDDHHMM
		const year = Number.parseInt(dateStr.substring(0, 4), 10);
		const month = Number.parseInt(dateStr.substring(4, 6), 10) - 1; // Monthは0ベース
		const day = Number.parseInt(dateStr.substring(6, 8), 10);
		const hour = Number.parseInt(dateStr.substring(8, 10), 10);
		const minute = Number.parseInt(dateStr.substring(10, 12), 10);

		broadcastDate = new Date(year, month, day, hour, minute);

		// 曜日を取得
		const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];
		dayOfWeek = daysOfWeek[broadcastDate.getDay()];

		// 時間帯を取得
		timeSlot = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

		// 毎週の予定として表示
		weeklySchedule = `毎週${dayOfWeek}曜日 ${timeSlot}`;

		// タイトルから日付部分を除去
		cleanTitle = cleanTitle.replace(datePattern, "");
	}

	// 放送局情報を抽出
	if (stationMatch) {
		broadcastStation = cleanStationName(stationMatch[1]);
		// タイトルから放送局部分を除去
		cleanTitle = cleanTitle.replace(stationPattern, "");
	}

	return {
		cleanTitle: cleanTitle.trim(),
		originalTitle: fileName,
		broadcastDate,
		broadcastStation,
		dayOfWeek,
		timeSlot,
		weeklySchedule,
	};
}

/**
 * 放送日時を人間が読みやすい形式にフォーマット
 */
export function formatBroadcastDate(date: Date): string {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	const hour = date.getHours().toString().padStart(2, "0");
	const minute = date.getMinutes().toString().padStart(2, "0");

	const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];
	const dayOfWeek = daysOfWeek[date.getDay()];

	return `${year}/${month}/${day}(${dayOfWeek}) ${hour}:${minute}`;
}
