# リファクタリングガイド

## 概要

このプロジェクトは、アニメ動画管理システムのコードベースを適切に分割し、保守性と拡張性を向上させるためにリファクタリングされました。

## 新しいアーキテクチャ

### 1. ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (簡素化済み)
│   ├── page.tsx           # メインページ (リファクタリング済み)
│   └── layout.tsx
├── components/            # UIコンポーネント
│   ├── ui/               # 再利用可能なUIコンポーネント
│   │   └── Button/       # ボタンコンポーネント
│   ├── features/         # 機能別コンポーネント
│   │   └── SearchAndFilterBar/  # 検索・フィルタ機能
│   ├── AnimeGrid/        # 既存のコンポーネント
│   ├── AnimeCard/
│   ├── LoadingState/
│   └── EmptyState/
├── services/             # ビジネスロジック層 (新規)
│   ├── animeService.ts   # アニメデータ関連のサービス
│   ├── videoScanService.ts # 動画スキャン関連のサービス
│   └── index.ts          # エクスポート管理
├── hooks/                # カスタムフック (新規)
│   ├── useAnimes.ts      # アニメデータ取得フック
│   ├── useDatabaseUpdate.ts # データベース更新フック
│   └── index.ts          # エクスポート管理
├── utils/                # ユーティリティ関数 (新規)
│   ├── validation.ts     # バリデーション関数
│   ├── constants.ts      # アプリケーション定数
│   └── index.ts          # エクスポート管理
├── libs/                 # 既存のライブラリ
│   ├── fileUtils.ts
│   ├── prisma.ts
│   └── ...
└── types/                # 型定義
    └── type.d.ts
```

### 2. 主要な改善点

#### A. サービス層の導入

**AnimeService** (`src/services/animeService.ts`)
- アニメデータのCRUD操作を集約
- 検索・フィルタリング・ソート機能
- データベースクエリの最適化

**VideoScanService** (`src/services/videoScanService.ts`)
- 動画ファイルスキャン機能
- データベース同期処理
- ファイル情報抽出

#### B. カスタムフックの活用

**useAnimes** (`src/hooks/useAnimes.ts`)
- アニメデータの状態管理
- 自動リフェッチ機能
- ページネーション対応

**useDatabaseUpdate** (`src/hooks/useDatabaseUpdate.ts`)
- データベース更新の状態管理
- エラーハンドリング
- 更新統計の表示

#### C. UIコンポーネントの体系化

**Button** (`src/components/ui/Button/`)
- 再利用可能なボタンコンポーネント
- バリアント（primary, secondary, danger, ghost）
- ローディング状態対応

**SearchAndFilterBar** (`src/components/features/SearchAndFilterBar/`)
- 検索・フィルタリング機能の統合
- デバウンス処理
- リアルタイム検索

#### D. ユーティリティの整理

**validation.ts** (`src/utils/validation.ts`)
- 入力値のバリデーション
- セキュリティチェック
- 型安全な変換

**constants.ts** (`src/utils/constants.ts`)
- アプリケーション全体の定数
- エラーメッセージの一元管理
- 設定値の集約

### 3. API層の簡素化

#### Before (リファクタリング前)
```typescript
// 100行以上の複雑なAPIルート
export async function GET(request: NextRequest) {
  // 複雑なクエリ構築
  // データベース操作
  // エラーハンドリング
  // レスポンス整形
}
```

#### After (リファクタリング後)
```typescript
// 30行程度のシンプルなAPIルート
export async function GET(request: NextRequest) {
  const filters = parseFilters(searchParams)
  const result = await AnimeService.getAnimes(filters, sorting, pagination)
  return NextResponse.json(result)
}
```

### 4. 型安全性の向上

- 各サービス・フック・コンポーネントで適切な型定義
- インターフェースの分離と再利用
- 型エクスポートの一元管理

### 5. エラーハンドリングの改善

- 各層での適切なエラーキャッチ
- ユーザーフレンドリーなエラーメッセージ
- リトライ機能の実装

### 6. パフォーマンスの最適化

- React.memoとuseCallbackの適切な使用
- デバウンス処理による不要なAPI呼び出しの削減
- ページネーションによるデータ量の制御

## 使用方法

### 新しいコンポーネントの追加

1. 適切なディレクトリに配置
   - UI部品: `src/components/ui/`
   - 機能コンポーネント: `src/components/features/`

2. index.tsでエクスポート管理

### 新しいサービスの追加

1. `src/services/` にサービスクラスを作成
2. `src/services/index.ts` でエクスポート
3. 対応するフックを `src/hooks/` に作成

### 新しいユーティリティの追加

1. `src/utils/` に関数を作成
2. `src/utils/index.ts` でエクスポート

## 今後の拡張予定

- [ ] キャッシュ機能の実装
- [ ] オフライン対応
- [ ] 動画プレイヤーの改善
- [ ] 検索機能の高度化
- [ ] ユーザー設定の保存

## 注意事項

- 型エラーが発生している場合は、必要な依存関係（@types/node, @types/react等）をインストールしてください
- 環境変数（VIDEO_DIRECTORY）が適切に設定されていることを確認してください
- データベースマイグレーションが必要な場合があります

## 貢献方法

1. 新機能は適切な層（Service/Hook/Component）に分離して実装
2. 型定義を必ず追加
3. エラーハンドリングを適切に実装
4. テストコードの追加（今後実装予定） 