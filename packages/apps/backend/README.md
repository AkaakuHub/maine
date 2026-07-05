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

protoで指定バージョンを有効にしてから、管理者権限のPowerShellで実行する。

```powershell
proto install node 24.11.0
proto install pnpm 10.18.0
node --version
pnpm --version
```

`node --version`が`v24.11.0`ではない場合、サービス操作は失敗する。

```powershell
pnpm service:install
pnpm service:status
pnpm service:restart
pnpm service:stop
pnpm service:uninstall
```

`service:install`はバックエンドをビルドし、WinSWで`MaineBackend`サービスを登録して起動する。サービスはprotoが解決したNode24.11.0で`dist/main.js`を直接実行する。

ログレベルは`error`、`warn`、`info`、`debug`、`trace`を指定できる。未指定時は`error`になる。

```powershell
pnpm service:configure -- -LogLevel error
```

`service:configure`はWinSWのサービス設定XMLに`MAINE_BACKEND_LOG_LEVEL`を書き込み、サービスを再起動する。PowerShellセッションの一時環境変数は使用しない。
