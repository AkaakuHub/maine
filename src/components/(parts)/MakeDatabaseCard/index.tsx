import { DatabaseJsonType } from "@/type";
/* eslint-disable @next/next/no-img-element */
import React from "react";

import "./index.css";

const MakeDatabaseCard: React.FC<{ database: DatabaseJsonType }> = ({
	database,
}) => {
	const handlePlayClick = (parentDir: string, filename: string) => {
		// API経由で動画を取得するURLを生成
		const videoQuery = `${encodeURIComponent(parentDir + "\\" + filename)}`;
		window.location.href = "/play/" + videoQuery;
	};

	return (
		<div>
			{Object.keys(database.newDatabase).map((parentDir) => {
				const files = database.newDatabase[parentDir];
				if (!Array.isArray(files)) {
					console.error(`Invalid data for parentDir: ${parentDir}`, files);
					return null;
				}
				return (
					<div key={parentDir}>
						<h2>{parentDir}</h2>
						<div>
							{files.map((filename) => (
								<div key={filename} className="cardRoot">
									<div className="animeTitle">{filename}</div>
									<button
										className="playButton"
										onClick={() => handlePlayClick(parentDir, filename)}
									>
										再生
									</button>
								</div>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default MakeDatabaseCard;
