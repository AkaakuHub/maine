import { Transform } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

export class ContinueWatchingQueryDto {
	@IsNumber()
	@IsOptional()
	@Transform(({ value }) => Number.parseInt(value, 10))
	page?: number;

	@IsNumber()
	@IsOptional()
	@Transform(({ value }) => Number.parseInt(value, 10))
	limit?: number;
}
