# My-Video-Storage

オフライン対応のビデオ動画管理PWAアプリケーション

## 技術スタック

### フロントエンド
- **Next.js** - React フレームワーク
- **React** - UI ライブラリ
- **TypeScript** - 型安全な開発
- **Tailwind CSS** - ユーティリティファーストCSS
- **Lucide React** - アイコンライブラリ

### バックエンド
- **Next.js API Routes** - サーバーサイドAPI
- **Prisma** - データベースORM
- **SQLite** - データベース

### PWA・オフライン機能
- **Service Workers** - オフライン対応とキャッシュ
- **IndexedDB (idb)** - クライアントサイドデータベース
- **Cache API** - リソースキャッシュ

### 開発ツール
- **Biome** - リンター・フォーマッター
- **pnpm** - パッケージマネージャー
- **Lefthook** - Git hooks
- **Commitlint** - コミットメッセージ規約

## セットアップ

### 前提条件
- Node.js 18以上
- pnpm

### 基本セットアップ
```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev

# 本番ビルド
pnpm build

# 本番サーバー起動
pnpm start
```

### HTTPS対応（クリップボードAPI使用のため）

クリップボードAPI（スクリーンショット機能）を使用するには、HTTPS環境が必要です。

#### macOS / Linux
```bash
# mkcertインストール
brew install mkcert

# ローカル認証局設定
mkcert -install

# 証明書生成
mkcert localhost 127.0.0.1 ::1
```

#### Windows
```bash
# Chocolateyでmkcertインストール
choco install mkcert

# または Scoopでインストール
scoop bucket add extras
scoop install mkcert

# ローカル認証局設定
mkcert -install

# 証明書生成
mkcert localhost 127.0.0.1 ::1
```

#### 証明書生成後
```bash
# 本番ビルド
pnpm build

# HTTPS本番サーバー起動
pnpm start
```

`https://localhost:3000` でアクセス可能になります。

## PWAデバッグ方法
PWAデバッグ方法
Service Worker確認:

DevTools → Application タブ → Service Workers
登録済みSWとその状態を確認
Cache API確認:

DevTools → Application タブ → Cache Storage
キャッシュされたリソースを確認
IndexedDB確認:

DevTools → Application タブ → IndexedDB
オフライン動画データを確認
ネットワーク状態シミュレート:

DevTools → Network タブ → Throttling
"Offline" を選択してオフライン状態をテスト
コンソールログ確認:

DevTools → Console タブ
PWA関連のログとエラーを確認


メモ：番組情報の抽出

```typescript
// ・日付を使って毎週何曜日の何時に放送か？
// ・放送局は？

const extractWeekdayAndTime = (str: string): string => {
	// [202404292154] => 「毎週月曜日 21:54」曜日はカレンダー情報から計算, Dateオブジェクトとかを使って。
	let message = "";
	const weekdayAndTime = str.match(/\[(.*?)\]/);
	if (weekdayAndTime) {
		const weekday: string = weekdayAndTime[1].slice(8, 9);
		const time = weekdayAndTime[1].slice(8, 12);
		message = `毎週${weekday}曜日 ${time.slice(0, 2)}:${time.slice(2, 4)}`;
	} else {
		message = "放送日時が取得できませんでした";
	}
	return message;
};

const extractServiceName = (str: string): string => {
	// []側から数えて一番近くにある()の中身を取得
	let message = "";
	const serviceName = str.match(/\((.*?)\)/);
	if (serviceName) {
		message = serviceName[1];
	} else {
		message = "放送局が取得できませんでした";
	}
	return message;
};

```