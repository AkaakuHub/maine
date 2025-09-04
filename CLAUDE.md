# CLAUDE.md

**Styling:**
- Tailwind CSS with custom gradient backgrounds
- Dark theme throughout
- Responsive design with mobile-first approach

## Development Notes

### Package Manager
- **ALWAYS use `pnpm` for package management** - never manually edit package.json
- Add dependencies: `pnpm add package-name`
- Add dev dependencies: `pnpm add -D package-name`
- Remove dependencies: `pnpm remove package-name`

### Development vs Production Environment
- **Development**: macOS (current environment)
- **Production**: Windows 11 
- Database migrations and schema changes can be applied safely in development environment
- Development and production databases are separate

### マジックナンバー
特定の数値など、マジックナンバーは全て`/src/utils/constants.ts`にまとめること


### ファイル構成
1つのファイルが長くなりすぎないよう、適切に分割すること

### コードスタイル
- 使用しない変数は、アンダーバーつけは禁止で、削除すること
- エラーは、ide diagnosticsを使用して検出すること
- anyは禁止
- 型定義は厳密に行うこと
- biome-ignoreなど、lint無効化は禁止
- anyや、eslint-disableなどを使わずに、型安全に書くこと
- SVG禁止。アイコンライブラリを使用