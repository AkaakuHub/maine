import { Transform } from "class-transformer";
import {
	IsEmail,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from "class-validator";

export class UpdateUserProfileDto {
	@IsOptional()
	@IsString()
	@MinLength(3, { message: "ユーザー名は3文字以上で入力してください" })
	@MaxLength(32, { message: "ユーザー名は32文字以内で入力してください" })
	@Matches(/^[a-zA-Z0-9_-]+$/, {
		message: "ユーザー名は英数字・ハイフン・アンダースコアのみ使用できます",
	})
	@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
	username?: string;

	@IsOptional()
	@IsString()
	@MaxLength(190, { message: "メールアドレスは190文字以内で入力してください" })
	@IsEmail({}, { message: "有効なメールアドレスを入力してください" })
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim().toLowerCase() : value,
	)
	email?: string;
}
