import { IsString, Length, Matches } from "class-validator";

const HEX_PATTERN = /^[0-9a-f]+$/i;
const AUTH_SALT_HEX_LENGTH = 32;
const PASSWORD_VERIFIER_MIN = 32;
const PASSWORD_VERIFIER_MAX = 256;

export class UpdatePasswordDto {
	@IsString()
	@Length(10, 2048, { message: "challengeTokenを指定してください" })
	challengeToken!: string;

	@IsString()
	@Matches(/^[0-9a-f]+$/i, { message: "responseは16進数で指定してください" })
	response!: string;

	@IsString()
	@Matches(HEX_PATTERN, { message: "newSaltは16進数で指定してください" })
	@Length(AUTH_SALT_HEX_LENGTH, AUTH_SALT_HEX_LENGTH)
	newSalt!: string;

	@IsString()
	@Matches(HEX_PATTERN, { message: "newVerifierは16進数で指定してください" })
	@Length(PASSWORD_VERIFIER_MIN, PASSWORD_VERIFIER_MAX)
	newVerifier!: string;
}
