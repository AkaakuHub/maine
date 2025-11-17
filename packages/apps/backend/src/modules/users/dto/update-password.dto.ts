import { IsString, Matches, MinLength } from "class-validator";

export class UpdatePasswordDto {
	@IsString()
	@MinLength(8, { message: "現在のパスワードを入力してください" })
	currentPassword!: string;

	@IsString()
	@MinLength(8, { message: "新しいパスワードは8文字以上で入力してください" })
	@Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
		message: "新しいパスワードは英字と数字を含めてください",
	})
	newPassword!: string;
}
