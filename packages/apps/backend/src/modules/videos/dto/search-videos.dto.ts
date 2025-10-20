import { Transform } from "class-transformer";
import {
	IsBoolean,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
} from "class-validator";

export class SearchVideosDto {
	@IsString()
	@IsOptional()
	@Transform(({ value }) => value || "")
	search?: string;

	@IsBoolean()
	@IsOptional()
	@Transform(({ value }) => value === "true")
	exactMatch?: boolean;

	@IsBoolean()
	@IsOptional()
	@Transform(({ value }) => value === "true")
	loadAll?: boolean;

	@IsString()
	@IsOptional()
	@IsEnum(["title", "fileName", "createdAt", "updatedAt", "duration"])
	sortBy?: string;

	@IsString()
	@IsOptional()
	@IsEnum(["asc", "desc"])
	sortOrder?: string;

	@IsNumber()
	@IsOptional()
	@Transform(({ value }) => Number.parseInt(value, 10))
	page?: number;

	@IsNumber()
	@IsOptional()
	@Transform(({ value }) => Number.parseInt(value, 10))
	limit?: number;
}
