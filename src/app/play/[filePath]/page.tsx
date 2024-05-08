"use client";

import { useState, useEffect } from "react";
import Video from "@/components/(parts)/Video";

// import { judgeStatus } from "@/libs/APIhandler";

function Page({ params }: { params: { filePath: string } }) {

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [parentDir, setParentDir] = useState<string>("");
  const [filename, setFilename] = useState<string>("");

  useEffect(() => {
    if (params.filePath) {
      const paramsFilename = decodeURIComponent(params.filePath);
      const parentDir_temp: string = paramsFilename.split("\\")[0];
      const filename_temp: string = paramsFilename.split("\\")[1];
      setParentDir(parentDir_temp);
      setFilename(filename_temp);
    }
  }, []);

  return (
    <div>
      <a href="/">ホーム</a>
      <br />
      動画
      <br />
      {filename}を再生します
      <br />
      <br />
      <Video {... { isPlaying, setIsPlaying, parentDir, filename }} />
    </div>
  )
}

export default Page