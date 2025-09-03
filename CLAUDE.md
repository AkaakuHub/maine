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