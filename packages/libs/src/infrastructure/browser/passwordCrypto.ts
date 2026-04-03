const textEncoder = new TextEncoder();

const hexTable = "0123456789abcdef";

const ensureCrypto = () => {
	if (typeof window === "undefined" || !window.crypto?.subtle) {
		throw new Error("このブラウザは安全な暗号処理に対応していません");
	}
};

const hexToArrayBuffer = (hex: string): ArrayBuffer => {
	const length = hex.length / 2;
	const buffer = new Uint8Array(length);
	for (let i = 0; i < length; i += 1) {
		buffer[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return buffer.buffer;
};

const arrayBufferToHex = (buffer: ArrayBuffer): string => {
	const byteArray = new Uint8Array(buffer);
	let hex = "";
	for (const byte of byteArray) {
		hex += hexTable[(byte >> 4) & 0xf] + hexTable[byte & 0xf];
	}
	return hex;
};

export async function deriveVerifier(
	password: string,
	saltHex: string,
	iterations: number,
	keyLength: number,
	digest: string,
): Promise<string> {
	ensureCrypto();
	const keyMaterial = await window.crypto.subtle.importKey(
		"raw",
		textEncoder.encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveBits"],
	);
	const derivedBits = await window.crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: hexToArrayBuffer(saltHex),
			iterations,
			hash: digest,
		},
		keyMaterial,
		keyLength * 8,
	);
	return arrayBufferToHex(derivedBits);
}

export async function computeChallengeResponseClient(
	verifierHex: string,
	challenge: string,
): Promise<string> {
	ensureCrypto();
	const data = textEncoder.encode(`${verifierHex}:${challenge}`);
	const hash = await window.crypto.subtle.digest("SHA-256", data);
	return arrayBufferToHex(hash);
}

export function generateClientSalt(byteLength = 16): string {
	ensureCrypto();
	const buffer = new Uint8Array(byteLength);
	window.crypto.getRandomValues(buffer);
	return arrayBufferToHex(buffer.buffer);
}
