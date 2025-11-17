import {
	IsEmail,
	IsNotEmpty,
	IsString,
	Length,
	Matches,
} from "class-validator";

const HEX_PATTERN = /^[0-9a-f]+$/i;
const AUTH_SALT_HEX_LENGTH = 32;
const PASSWORD_VERIFIER_MIN = 32;
const PASSWORD_VERIFIER_MAX = 256;

export class RegisterDto {
	@IsString()
	@IsNotEmpty()
	username: string;

	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsString()
	@Matches(HEX_PATTERN, { message: "passwordSaltは16進数で指定してください" })
	@Length(AUTH_SALT_HEX_LENGTH, AUTH_SALT_HEX_LENGTH)
	passwordSalt: string;

	@IsString()
	@Matches(HEX_PATTERN, {
		message: "passwordVerifierは16進数で指定してください",
	})
	@Length(PASSWORD_VERIFIER_MIN, PASSWORD_VERIFIER_MAX)
	passwordVerifier: string;
}
