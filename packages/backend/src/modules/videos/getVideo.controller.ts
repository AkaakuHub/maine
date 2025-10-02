import { createReadStream, statSync } from "node:fs";
import { Controller, Get, Logger, Query, Res } from "@nestjs/common";
import { ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { findFileInVideoDirectories } from "../../libs/fileUtils";

@ApiTags("getVideo")
@Controller("getVideo")
export class GetVideoController {
	private readonly logger = new Logger(GetVideoController.name);

	@Get()
	@ApiQuery({
		name: "filePath",
		required: true,
		description: "動画ファイルパス",
	})
	@ApiResponse({ status: 200, description: "動画ファイル配信" })
	@ApiResponse({ status: 400, description: "無効なファイルパス" })
	@ApiResponse({ status: 403, description: "アクセス拒否" })
	@ApiResponse({ status: 404, description: "ファイルが見つからない" })
	@ApiResponse({ status: 500, description: "サーバーエラー" })
	async getVideo(
		@Query("filePath") filePath: string,
		@Res() response: Response,
	) {
		try {
			if (!filePath) {
				response.status(400);
				return response.send("File path is required");
			}

			// セキュアなファイルパス検証（複数ディレクトリ対応）
			const validation = await findFileInVideoDirectories(filePath);
			if (!validation.isValid) {
				this.logger.error("Invalid file path:", validation.error);

				const statusCode =
					validation.error === "No video directories configured" ? 500 : 403;
				response.status(statusCode);
				return response.send(validation.error || "Invalid file path");
			}

			// ファイルが存在するか確認
			if (!validation.exists) {
				response.status(404);
				return response.send("File not found");
			}

			// ファイルをストリームとして返す
			const stat = statSync(validation.fullPath);

			// Range requestsのサポート（動画の途中再生など）
			const range = response.req.headers.range;

			if (range) {
				const parts = range.replace(/bytes=/, "").split("-");
				const start = Number.parseInt(parts[0], 10);
				const end = parts[1] ? Number.parseInt(parts[1], 10) : stat.size - 1;
				const chunksize = end - start + 1;

				const stream = createReadStream(validation.fullPath, { start, end });

				response.status(206);
				response.setHeader(
					"Content-Range",
					`bytes ${start}-${end}/${stat.size}`,
				);
				response.setHeader("Accept-Ranges", "bytes");
				response.setHeader("Content-Length", chunksize.toString());
				response.setHeader("Content-Type", "video/mp4");

				return stream.pipe(response);
			}

			const fileStream = createReadStream(validation.fullPath);
			response.status(200);
			response.setHeader("Content-Type", "video/mp4");
			response.setHeader("Content-Length", stat.size.toString());
			response.setHeader("Accept-Ranges", "bytes");

			return fileStream.pipe(response);
		} catch (error) {
			this.logger.error("Error serving video file:", error);
			response.status(500);
			return response.send("Internal server error");
		}
	}
}
