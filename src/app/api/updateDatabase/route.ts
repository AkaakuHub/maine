import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

import { DatabaseJsonType } from "@/type";

export async function GET(req: NextRequest) {
	try {
		const res = await updateDatabase();
		if (Object.keys(res).length === 0) {
			return new Response("Unauthorized", { status: 401 });
		} else {
			return new Response(JSON.stringify(res), {
				headers: { "Content-Type": "application/json" },
				status: 200,
			});
		}
	} catch (error) {
		console.error("Error:", error);
		return new Response("Internal server error", { status: 500 });
	}
}

async function updateDatabase() {
	return new Promise<{ newDatabase: DatabaseJsonType }>((resolve, reject) => {
		const ORIGIN_PATH: string = process.env.ORIGIN_PATH || "";
		// const HLS_PATH: string = process.env.HLS_PATH || "";

		// まず、現時点のdatabase.jsonを読み込む
		const PUBLIC_PATH: string = process.env.PUBLIC_PATH || "";
		const databasePath = path.join(PUBLIC_PATH, "Files/database.json");
		// const database = JSON.parse(fs.readFileSync(databasePath, "utf-8"));
		let newDatabase: DatabaseJsonType = {};

		// ORIGIN_PATH内のフォルダ構成をdatabase.jsonにjson形式で保存する
		// 階層は２階層まである
		// ORIGIN_PATH\\アニメ名\\アニメ話数.mp4
		/**
		 * {
		 *  "アニメ名1": ["アニメ話数1", "アニメ話数2", ...],
		 *  "アニメ名2": []...
		 * ...
		 */
		const animeFolders = fs.readdirSync(ORIGIN_PATH, { withFileTypes: true });
		animeFolders.forEach((folder) => {
			if (folder.isDirectory()) {
				const animeName = folder.name;
				const animePath = path.join(ORIGIN_PATH, animeName);
				const episodeFiles = fs.readdirSync(animePath, { withFileTypes: true });
				const episodes: string[] = [];

				episodeFiles.forEach((file) => {
					if (file.isFile() && file.name.endsWith(".mp4")) {
						episodes.push(file.name);
					}
				});

				newDatabase[animeName] = episodes;
			}
		});

		// database.jsonを更新
		fs.writeFileSync(databasePath, JSON.stringify(newDatabase, null, 2));
		console.log("database.json updated");

		resolve({ newDatabase });
	});
}
