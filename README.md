
# My Anime Storage

セルフホスト型のアニメ動画ストレージ＆ストリーミングWebアプリです。
クロスプラットフォーム（Windows/Mac/Linux）対応、2025年最新のNext.js 15/Tailwind CSS v4/Prisma ORM構成。

## 特徴

- **Prisma + SQLite** による堅牢な動画メタデータ管理（JSONファイルは不使用）
- **クロスプラットフォーム**なファイルパス処理とセキュリティ対策
- **MP4動画のストリーミング**（HLS変換不要、Rangeリクエスト対応）
- **Tailwind CSS v4**による2025年風の美しいダークUI
- **アニメ一覧・検索・ソート・グリッド/リスト切替**
- **動画プレイヤー**（キーボードショートカット・シーク・フルスクリーン等）
- **自動ディレクトリスキャン＆DB同期**（新規/削除/更新を自動反映）
- **APIは全てPrisma経由**で高速・信頼性抜群

## 実装内容の詳細

- `prisma/schema.prisma` で `Anime` モデルを定義。動画ファイルのメタデータ（タイトル、エピソード、年、ファイルサイズ、パス等）をDBで管理。
- `src/libs/prisma.ts` でPrismaクライアントをシングルトンで初期化。
- `src/libs/fileUtils.ts` でパストラバーサル対策・正規化・存在確認などクロスプラットフォーム対応のファイルユーティリティを実装。
- `src/app/api/updateDatabase/route.ts` でディレクトリを再帰的にスキャンし、DBとファイルシステムを同期。
- `src/app/api/animes/route.ts` でPrismaからアニメ一覧を取得、検索・ソート・フィルタ対応。
- `src/app/api/video/[filePath]/route.ts` で安全なファイルパス検証＆Range対応の動画ストリーミングAPIを実装。
- `src/components/AnimeGrid` でPrisma型に準拠したアニメ一覧UI（グリッド/リスト切替、検索、ソート、サムネイル最適化）
- `src/app/page.tsx` でDB同期→アニメ一覧取得→AnimeGrid表示の流れを自動化。
- `src/app/play/[filePath]/page.tsx` で動画再生ページを実装。API経由で安全にストリーミング。
- `src/components/VideoPlayer` で高機能な動画プレイヤーUI（ショートカット、音量、シーク、フルスクリーン等）
- `.env` で `VIDEO_DIRECTORY`を指定可能。未指定時はエラー。

## セットアップ方法

1. **リポジトリをクローン**
   ```bash
   git clone <このリポジトリのURL>
   cd my-anime-storage
   ```
2. **依存パッケージをインストール**
   ```bash
   pnpm install
   # または npm install / yarn install
   ```
3. **.envファイルを作成し、動画ディレクトリを指定**
   ```env
   VIDEO_DIRECTORY=/path/to/your/anime/videos
   ```
4. **Prisma DBを初期化**
   ```bash
   pnpm prisma db push
   ```
5. **開発サーバーを起動**
   ```bash
   pnpm dev
   # http://localhost:3000 でアクセス
   ```

## 使い方

1. トップページで「データベースを読み込み中...」が消えるまで待つと、アニメ一覧が表示されます。
2. 検索・ソート・グリッド/リスト切替で好きなアニメを探せます。
3. サムネイルまたはリストから再生したい動画をクリックすると、動画プレイヤー画面に遷移します。
4. 動画プレイヤーではキーボードショートカットやフルスクリーン、シーク等が利用できます。

## 注意点・Tips

- サポート動画形式はMP4推奨。他形式は環境依存です。
- サムネイルは現状ファイルパスで指定。自動生成は未実装。
- DBと動画ディレクトリの同期は「ページアクセス時」に自動で行われます。
- Windows/Mac/Linuxどれでも動作確認済み。
- セキュリティのため、APIは必ずパス検証・存在確認を行います。

---
本アプリは2025年最新のNext.js/Tailwind/Prisma構成で、セルフホスト型のアニメ動画管理・視聴体験を最大化します！
