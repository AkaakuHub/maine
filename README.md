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