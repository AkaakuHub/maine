import { IsNotEmpty, IsString } from "class-validator";

export class ChallengeRequestDto {
	@IsString()
	@IsNotEmpty()
	username!: string;
}
