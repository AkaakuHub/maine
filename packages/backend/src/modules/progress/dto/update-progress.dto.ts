import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateProgressDto {
	@IsString()
	filePath!: string;

	@IsNumber()
	@IsOptional()
	watchTime?: number;

	@IsNumber()
	@IsOptional()
	watchProgress?: number;

	@IsBoolean()
	@IsOptional()
	isLiked?: boolean;

	@IsBoolean()
	@IsOptional()
	isInWatchlist?: boolean;
}
