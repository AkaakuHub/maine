#!/bin/bash

# Tailwind通常色チェックスクリプト
# 禁止されているTailwindのデフォルト色クラスをsrcディレクトリから検索する

set -e

echo "🎨 Tailwindデフォルト色の使用をチェック中..."

# 色名定義
COLORS="white|black|gray|red|blue|green|yellow|purple|pink|indigo|teal|cyan|orange|lime|emerald|sky|violet|fuchsia|rose|amber|zinc|neutral|stone|slate"

# 禁止されている色クラスのパターン
FORBIDDEN_PATTERNS=(
    # 基本色
    "(bg|text|border)-($COLORS)(-[0-9]+)?(/[0-9]+)?"
    
    # グラデーション色
    "from-($COLORS)(-[0-9]+)?(/[0-9]+)?"
    "to-($COLORS)(-[0-9]+)?(/[0-9]+)?"
    "via-($COLORS)(-[0-9]+)?(/[0-9]+)?"
    
    # その他
    "(ring|divide|outline)-($COLORS)(-[0-9]+)?(/[0-9]+)?"
    "(shadow)-($COLORS)(-[0-9]+)?(/[0-9]+)?"
)

ERRORS_FOUND=0
TEMP_FILE=$(mktemp)

# srcディレクトリ内のTypeScript/JSXファイルを検索
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) | while read file; do
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        if grep -n -E "$pattern" "$file" > /dev/null; then
            echo "❌ 禁止されているTailwind色が見つかりました: $file"
            grep -n -E --color=always "$pattern" "$file" | head -5
            echo "echo 1" >> "$TEMP_FILE"
            echo ""
        fi
    done
done

# 結果の確認
if [ -f "$TEMP_FILE" ] && [ -s "$TEMP_FILE" ]; then
    echo "💥 Tailwindデフォルト色の使用が検出されました！"
    echo ""
    echo "📋 代わりに以下のセマンティック色を使用してください："
    echo "  背景: bg-surface, bg-surface-variant, bg-primary, bg-error など"
    echo "  テキスト: text-text, text-text-secondary, text-primary, text-error など"
    echo "  ボーダー: border-border, border-border-muted, border-primary など"
    echo ""
    echo "🎨 利用可能なセマンティック色の一覧は src/app/globals.css の @theme セクションを確認してください。"
    rm -f "$TEMP_FILE"
    exit 1
else
    echo "✅ Tailwindデフォルト色の使用は検出されませんでした。"
    rm -f "$TEMP_FILE"
    exit 0
fi