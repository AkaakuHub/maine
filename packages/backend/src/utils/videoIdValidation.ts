/**
 * videoIdの形式を検証する
 * @param videoId 検証するvideoId
 * @returns 有効な形式かどうか
 */
export function isValidVideoId(videoId: string): boolean {
	// 64文字の16進数文字列かどうかを検証（SHA-256ハッシュ）
	return /^[a-f0-9]{64}$/i.test(videoId);
}
