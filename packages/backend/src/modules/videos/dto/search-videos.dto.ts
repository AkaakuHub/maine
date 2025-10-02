import { Transform } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class SearchVideosDto {
	@IsString()
	@IsOptional()
	@Transform(({ value }) => value || "")
	search?: string;

	@IsBoolean()
	@IsOptional()
	@Transform(({ value }) => value === "true")
	exactMatch?: boolean;

	@IsNumber()
	@IsOptional()
	@Transform(({ value }) => Number.parseInt(value, 10))
	page?: number;

	@IsNumber()
	@IsOptional()
	@Transform(({ value }) => Number.parseInt(value, 10))
	limit?: number;
}
