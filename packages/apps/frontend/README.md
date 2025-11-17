# Maine - Frontend

## dev

環境変数は`.env.development`を参照する

開発サーバーを起動する(ファイル保存API等のため、httpsで起動)
```bash
pnpm run dev
```

また、wranglerのデバッグ
```bash
pnpm run preview
```

## CF workersにデプロイ

環境変数は`.env.production`を参照する

```bash
pnpm run deploy
```