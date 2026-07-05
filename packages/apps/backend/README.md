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

ログレベルは`error`、`warn`、`info`、`debug`、`trace`を指定できる。未指定時は`error`になる。

```powershell
pnpm service:configure -- -LogLevel error
```

`service:configure`はWinSWのサービス設定XMLに`MAINE_BACKEND_LOG_LEVEL`を書き込み、サービスを再起動する。PowerShellセッションの一時環境変数は使用しない。
