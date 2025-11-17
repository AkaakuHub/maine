import {
	createHash,
	pbkdf2Sync,
	randomBytes,
	timingSafeEqual,
} from "node:crypto";

const iterations = Number(process.env.AUTH_CHALLENGE_ITERATIONS ?? "120000");
const keyLength = Number(process.env.AUTH_CHALLENGE_KEY_LENGTH ?? "32");
const digest = (process.env.AUTH_CHALLENGE_DIGEST ?? "sha256").toLowerCase();
const webDigestMap: Record<string, string> = {
	sha256: "SHA-256",
	sha512: "SHA-512",
};
const tokenExpiry = process.env.AUTH_CHALLENGE_EXPIRY ?? "5m";

export const challengeCryptoConfig = {
	iterations,
	keyLength,
	digest,
	webDigest: webDigestMap[digest] ?? digest.toUpperCase(),
	tokenExpiry,
};

export function generateAuthSalt() {
	return randomBytes(16).toString("hex");
}

export function derivePasswordVerifier(password: string, saltHex: string) {
	const saltBuffer = Buffer.from(saltHex, "hex");
	return pbkdf2Sync(
		password,
		saltBuffer,
		iterations,
		keyLength,
		digest,
	).toString("hex");
}

export function computeChallengeResponse(verifier: string, challenge: string) {
	return createHash("sha256").update(`${verifier}:${challenge}`).digest("hex");
}

export function safeCompareHex(a: string, b: string) {
	try {
		const bufferA = Buffer.from(a, "hex");
		const bufferB = Buffer.from(b, "hex");
		if (bufferA.length !== bufferB.length) {
			return false;
		}
		return timingSafeEqual(bufferA, bufferB);
	} catch {
		return false;
	}
}
