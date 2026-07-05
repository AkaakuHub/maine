# Maine - Backend

## dev

まず、データベースを初期化する

```bash
pnpm run db:setup
pnpm run db:migrate
```

その後、開発サーバーを起動する
```bash
pnpm run start:dev
```

## Windowsサービス

管理者権限のPowerShellで実行する。

```powershell
pnpm service:install
pnpm service:status
pnpm service:restart
pnpm service:stop
pnpm service:uninstall
```

`service:install`はバックエンドをビルドし、WinSWで`MaineBackend`サービスを登録して起動する。サービスは`node dist/main.js`を直接実行する。
