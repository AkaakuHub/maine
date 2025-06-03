
# My Anime Storage

セルフホスト型のアニメ動画ストレージ＆ストリーミングWebアプリです。
クロスプラットフォーム（Windows/Mac/Linux）対応、2025年最新のNext.js 15/Tailwind CSS v4/Prisma ORM構成。

このプロジェクトは適切なアーキテクチャに基づいて設計され、保守性と拡張性を重視したモダンなコードベースとなっています。

## ✨ 特徴

- **🎬 高機能動画ストリーミング**: MP4動画のストリーミング（HLS変換不要、Rangeリクエスト対応）
- **🎨 モダンUI**: Tailwind CSS v4による2025年風の美しいダークテーマ
- **🔍 高度な検索**: リアルタイム検索・フィルタリング・ソート機能
- **📱 レスポンシブ**: デスクトップ・モバイル対応のレスポンシブデザイン
- **⚡ 高性能**: Prisma + SQLiteによる高速データベース操作
- **🔒 セキュリティ**: パストラバーサル対策・ファイルアクセス制御
- **🔄 自動同期**: ディレクトリスキャン＆データベース自動同期
- **🎮 キーボードショートカット**: 動画プレイヤーの豊富な操作機能

## 🏗️ アーキテクチャ

### ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (簡素化・最適化済み)
│   │   ├── animes/        # アニメデータAPI
│   │   ├── updateDatabase/ # データベース更新API
│   │   └── video/         # 動画ストリーミングAPI
│   ├── play/              # 動画再生ページ
│   ├── page.tsx           # メインページ (リファクタリング済み)
│   └── layout.tsx
├── components/            # UIコンポーネント
│   ├── ui/               # 再利用可能なUIコンポーネント
│   │   └── Button/       # 統一されたボタンコンポーネント
│   ├── features/         # 機能別コンポーネント
│   │   └── SearchAndFilterBar/  # 検索・フィルタ機能
│   ├── AnimeGrid/        # アニメ一覧表示
│   ├── AnimeCard/        # アニメカード
│   ├── LoadingState/     # ローディング状態
│   ├── EmptyState/       # 空状態表示
│   └── VideoPlayer/      # 動画プレイヤー
├── services/             # ビジネスロジック層
│   ├── animeService.ts   # アニメデータ関連のサービス
│   ├── videoScanService.ts # 動画スキャン関連のサービス
│   └── index.ts          # エクスポート管理
├── hooks/                # カスタムフック
│   ├── useAnimes.ts      # アニメデータ取得フック
│   ├── useDatabaseUpdate.ts # データベース更新フック
│   ├── useVideoPlayer.ts # 動画プレイヤーフック
│   └── index.ts          # エクスポート管理
├── utils/                # ユーティリティ関数
│   ├── validation.ts     # バリデーション関数
│   ├── constants.ts      # アプリケーション定数
│   └── index.ts          # エクスポート管理
├── libs/                 # 低レベルライブラリ
│   ├── prisma.ts         # Prismaクライアント
│   ├── fileUtils.ts      # ファイル操作ユーティリティ
│   ├── extractMetaData.ts # メタデータ抽出
│   └── formatTime.ts     # 時間フォーマット
└── types/                # 型定義
    ├── AnimeInfo.ts      # アニメ関連の型
    └── type.d.ts         # グローバル型定義
```

### 設計原則

#### 1. **レイヤードアーキテクチャ**
- **UI層**: Reactコンポーネント（状態管理のみ）
- **ロジック層**: カスタムフック（状態とビジネスロジック）
- **サービス層**: ビジネスロジック（データ操作）
- **データ層**: Prisma（データベースアクセス）

#### 2. **関心の分離**
- UIコンポーネントは表示に集中
- フックは状態管理とロジックを担当
- サービスはデータ操作を集約
- ユーティリティは純粋関数として実装

#### 3. **型安全性**
- TypeScript Strictモード
- 各層での適切な型定義
- Prismaの型システムとの連携

## 🚀 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript (Strict Mode)
- **スタイリング**: Tailwind CSS v4
- **データベース**: Prisma ORM + SQLite
- **UI**: Lucide Icons, Headless UI
- **開発ツール**: Biome (Linting/Formatting)

## 📦 セットアップ方法

### 1. **環境要件**
- Node.js 18+ 
- pnpm/npm/yarn
- 対応OS: Windows/Mac/Linux

### 2. **インストール**

```bash
# リポジトリをクローン
git clone <このリポジトリのURL>
cd my-anime-storage

# 依存パッケージをインストール
pnpm install
# または npm install / yarn install
```

### 3. **環境設定**

`.env`ファイルを作成し、動画ディレクトリを指定：

```env
VIDEO_DIRECTORY=/path/to/your/anime/videos
```

### 4. **データベース初期化**

```bash
# Prisma DBを初期化
pnpm prisma db push

# (オプション) データベースブラウザで確認
pnpm prisma studio
```

### 5. **開発サーバー起動**

```bash
pnpm dev
# http://localhost:3000 でアクセス
```

## 🎯 使い方

### 基本操作

1. **初回アクセス**: 自動でディレクトリスキャンが実行され、動画ファイルがデータベースに登録されます
2. **検索・フィルタ**: 検索バーでリアルタイム検索、ジャンルや年でフィルタリング
3. **表示切替**: グリッド表示とリスト表示を切り替え可能
4. **動画再生**: カードをクリックして動画プレイヤーページへ移動

### 動画プレイヤー操作

| キー | 機能 |
|------|------|
| `Space` | 再生/一時停止 |
| `←/→` | 10秒戻る/進む |
| `↑/↓` | 音量調整 |
| `F` | フルスクリーン切替 |
| `M` | ミュート切替 |

### データベース管理

- **自動同期**: ページアクセス時に自動実行
- **手動更新**: ヘッダーの「データベース更新」ボタン
- **統計表示**: 追加・更新・削除されたファイル数を表示

## 🛠️ 開発ガイド

### コンポーネント開発

#### 新しいUIコンポーネントの追加

```typescript
// src/components/ui/NewComponent/NewComponent.tsx
interface NewComponentProps {
  // props定義
}

export const NewComponent = ({ ...props }: NewComponentProps) => {
  // 実装
}

// src/components/ui/NewComponent/index.ts
export { NewComponent } from './NewComponent'
```

#### 機能コンポーネントの追加

```typescript
// src/components/features/FeatureName/FeatureName.tsx
// ビジネスロジックを含む複合コンポーネント
```

### サービス開発

#### 新しいサービスの追加

```typescript
// src/services/newService.ts
export class NewService {
  static async someMethod() {
    // ビジネスロジック実装
  }
}

// src/services/index.ts
export { NewService } from './newService'
```

### フック開発

#### 新しいカスタムフックの追加

```typescript
// src/hooks/useNewFeature.ts
export const useNewFeature = () => {
  // 状態管理とロジック
  return { data, loading, error, methods }
}

// src/hooks/index.ts
export { useNewFeature } from './useNewFeature'
```

### API開発

#### 新しいAPIルートの追加

```typescript
// src/app/api/new-endpoint/route.ts
export async function GET(request: NextRequest) {
  try {
    // サービス層を呼び出し
    const result = await SomeService.getData()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'エラーメッセージ' }, { status: 500 })
  }
}
```

## 🔧 実装詳細

### データベース設計

```sql
-- Animeモデル (prisma/schema.prisma)
model Anime {
  id          String   @id @default(cuid())
  title       String
  episode     String?
  year        Int?
  genre       String?
  filePath    String   @unique
  fileName    String
  fileSize    BigInt
  duration    Float?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### API層の設計

| エンドポイント | 機能 | 実装ファイル |
|---------------|------|-------------|
| `/api/animes` | アニメ一覧取得・検索・フィルタ | `src/app/api/animes/route.ts` |
| `/api/updateDatabase` | ディレクトリスキャン・DB同期 | `src/app/api/updateDatabase/route.ts` |
| `/api/video/[filePath]` | 動画ストリーミング配信 | `src/app/api/video/[filePath]/route.ts` |

### セキュリティ対策

- **パストラバーサル防止**: `fileUtils.ts`でパス正規化・検証
- **ファイルアクセス制御**: 指定ディレクトリ外のアクセス禁止
- **入力値検証**: バリデーション関数による型安全な変換
- **Range リクエスト対応**: 部分コンテンツ配信でメモリ効率化

## 🚀 パフォーマンス最適化

### フロントエンド最適化

- **React.memo**: コンポーネントの不要な再レンダリング防止
- **useCallback**: 関数の不要な再生成防止  
- **デバウンス**: 検索入力時のAPI呼び出し制御
- **ページネーション**: 大量データの効率的表示
- **仮想化**: 大規模リスト表示の最適化（今後実装予定）

### バックエンド最適化

- **Prismaクエリ最適化**: 必要なフィールドのみ取得
- **インデックス**: 検索頻度の高いフィールドにインデックス設定
- **キャッシュ**: ファイルメタデータのメモリキャッシュ（今後実装予定）
- **ストリーミング**: Range リクエストによる効率的動画配信

## 🔮 今後の拡張予定

### 短期的な改善
- [ ] サムネイル自動生成機能
- [ ] プレイリスト機能
- [ ] 視聴履歴・お気に入り機能
- [ ] 動画品質設定（解像度切替）

### 中期的な改善
- [ ] ユーザー認証・マルチユーザー対応
- [ ] 字幕ファイル対応
- [ ] 動画エンコード・変換機能
- [ ] モバイルアプリ（React Native）

### 長期的な改善
- [ ] AI による自動タグ付け
- [ ] レコメンド機能
- [ ] 分散ストレージ対応
- [ ] ライブストリーミング対応

## ⚠️ 注意点・制限事項

### 動画形式
- **推奨**: MP4 (H.264/H.265 + AAC)
- **対応**: ブラウザが対応する形式（環境依存）
- **非対応**: DRM保護されたコンテンツ

### システム要件
- **ストレージ**: 動画ファイルサイズに応じて必要
- **メモリ**: 最低2GB推奨（大量ファイル時は更に必要）
- **ネットワーク**: ローカルネットワーク推奨（ストリーミング品質確保）

### セキュリティ
- **アクセス制御**: 基本的なファイルアクセス制御のみ
- **認証**: 現在は実装なし（今後追加予定）
- **HTTPS**: 本番環境では必須（リバースプロキシ推奨）

## 🤝 コントリビューション

### 開発フロー

1. **Issue作成**: 機能追加・バグ報告
2. **ブランチ作成**: `feature/機能名` または `fix/バグ名`
3. **実装**: 適切な層に分離して実装
4. **テスト**: 動作確認とテストコード追加
5. **プルリクエスト**: レビュー後マージ

### コーディング規約

- **TypeScript Strict**: 型安全性を最優先
- **Biome**: コードフォーマット・リンティング統一
- **命名規則**: ケバブケース（ファイル）、パスカルケース（コンポーネント）
- **コメント**: JSDocスタイルの関数コメント推奨

### 新機能追加時のガイドライン

1. **適切な層への配置**: UI/Hook/Service/Utilの責務を明確化
2. **型定義**: インターフェース・型の適切な定義
3. **エラーハンドリング**: 各層での適切なエラー処理
4. **ドキュメント**: README更新・コメント追加

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 🙏 謝辞

このプロジェクトは以下のオープンソースプロジェクトを使用しています：
- [Next.js](https://nextjs.org/)
- [Prisma](https://prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

**My Anime Storage**は、モダンなWeb技術スタックを活用して、セルフホスト型のアニメ動画管理・視聴体験を最大化することを目標としています。

貢献・フィードバックをお待ちしています！🎬✨
