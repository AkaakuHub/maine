/* eslint-disable @next/next/no-img-element */
import React from "react";
import { DatabaseJsonType } from "@/type";

import "./index.css";

const MakeDatabaseCard: React.FC<{ database: DatabaseJsonType }> = ({ database }) => {
  return (
    <div>
      {Object.keys(database).map((parentDir) => {
        return (
          <div key={parentDir}>
            <h2>{parentDir}</h2>
            <div>
              {database[parentDir].map((filename) => {
                return (
                  <div key={filename} className="cardRoot">
                    <div className="animeTitle">{filename}</div>
                    <a href={`/play/${encodeURIComponent(parentDir + "\\" + filename)}`}>
                      <img className="thumbnail"
                        src={`/HLS/${parentDir}/${filename}/thumbnail.jpg`} alt="サムネイル" />
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MakeDatabaseCard;