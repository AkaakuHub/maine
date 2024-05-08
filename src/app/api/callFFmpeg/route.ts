// import { exec } from 'child_process';
// import { NextRequest } from "next/server";
// import fs from "fs";
// import path from "path";
// import { get } from 'http';

// export async function POST(req: NextRequest) {
//   try {
//     const requestBody = await req.json();
//     const filename: string = requestBody.filename;
//     const res = await executeCommand(filename);
//     if (res.stdout === "") {
//       return new Response('Unauthorized', { status: 401 });
//     } else {
//       return new Response(JSON.stringify(res), {
//         headers: { "Content-Type": "application/json" },
//         status: 200,
//       });
//     }
//   } catch (error) {
//     console.error('Error:', error);
//     return new Response('Internal server error', { status: 500 });
//   }
// }

// async function executeCommand(filename: string) {
//   return new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
//     const ORIGIN_PATH: string = process.env.ORIGIN_PATH || "";
//     const HLS_PATH: string = process.env.HLS_PATH || "";
//     const parentDir: string = filename.split("\\")[1].split(".mp4")[0] + "\\";

//     const ffmpegCommand: string = `ffmpeg -i "${ORIGIN_PATH}${filename}" -c:v copy -c:a copy -f hls -hls_time 9 -hls_playlist_type vod -hls_segment_filename "${HLS_PATH}${parentDir}%4d.ts" "${HLS_PATH}${parentDir}playlist.m3u8" -hide_banner`;
//     // console.log("ffmpegCommand: ", ffmpegCommand);

//     // ${HLS_PATH}内のディレクトリたちが、合計N GBを超える場合、古いものからディレクトリごと削除する
//     const maxStorageGB: number = 2;

//     const getDirectorySize = (dirPath: string): number => {
//       const files = fs.readdirSync(dirPath);
//       let size: number = 0;
//       files.forEach((file) => {
//         const filePath = path.join(dirPath, file);
//         const stats = fs.statSync(filePath);
//         if (stats.isDirectory()) {
//           size += getDirectorySize(filePath);
//         } else {
//           size += stats.size;
//         }
//       });

//       return size;
//     }

//     const deleteDirectory = (directory: string) => {
//       const files = fs.readdirSync(directory);

//       files.forEach((file) => {
//         const filePath = path.join(directory, file);
//         const stats = fs.statSync(filePath);

//         if (stats.isDirectory()) {
//           deleteDirectory(filePath); // 再帰的にサブディレクトリを削除
//         } else {
//           fs.unlinkSync(filePath); // ファイルを削除
//         }
//       });

//       fs.rmdirSync(directory); // ディレクトリ自体を削除
//     }
//     const storageSizeCurrent = getDirectorySize(HLS_PATH);

//     console.log("current storageSize(GB): ", storageSizeCurrent / 1024 / 1024 / 1024);

//     if (storageSizeCurrent > maxStorageGB * 1024 * 1024 * 1024) {
//       const sortedStorageDir = fs.readdirSync(HLS_PATH).sort((a, b) => {
//         return fs.statSync(`${HLS_PATH}${a}`).birthtime.getTime() - fs.statSync(`${HLS_PATH}${b}`).birthtime.getTime();
//       });
//       let deleteSize: number = 0;
//       for (let i = 0; i < sortedStorageDir.length; i++) {
//         const stats = fs.statSync(`${HLS_PATH}${sortedStorageDir[i]}`);
//         deleteSize += stats.size;
//         deleteDirectory(`${HLS_PATH}${sortedStorageDir[i]}`);
//         if (deleteSize > maxStorageGB * 1024 * 1024 * 1024) {
//           break;
//         }
//       }
//     }

//     // ${HLS_PATH}${parentDir}内にplaylist.m3u8がすでにあればffmpegは実行しない
//     if (fs.existsSync(`${HLS_PATH}${parentDir}playlist.m3u8`)) {
//       console.log("playlist.m3u8 already exists. Skip ffmpeg command.");
//       const returnMessage = {
//         stdout: "playlist.m3u8 already exists",
//         stderr: "",
//       };
//       resolve(returnMessage);
//     }

//     // mkdirコマンドを実行
//     fs.mkdirSync(`${HLS_PATH}${parentDir}`, { recursive: true });

//     exec(ffmpegCommand, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`exec error: ${error}`);
//         const returnMessage = {
//           stdout: "",
//           stderr: error.message,
//         };
//         reject(returnMessage);
//       }

//       // console.log(`stdout: ${stdout}`);
//       // console.error(`stderr: ${stderr}`);
//       const returnMessage = {
//         stdout: stdout,
//         stderr: stderr,
//       };
//       resolve(returnMessage);
//     });
//   });
// }
