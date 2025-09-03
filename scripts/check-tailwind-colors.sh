#!/bin/bash

# Tailwind通常色チェックスクリプト
# 禁止されているTailwindのデフォルト色クラスをsrcディレクトリから検索する

set -e

echo "🎨 Tailwindデフォルト色の使用をチェック中..."

# 禁止されている色クラスのパターン
FORBIDDEN_PATTERNS=(
    # 背景色
    "bg-white\b"
    "bg-black\b"
    "bg-gray-[0-9]+"
    "bg-red-[0-9]+"
    "bg-blue-[0-9]+"
    "bg-green-[0-9]+"
    "bg-yellow-[0-9]+"
    "bg-purple-[0-9]+"
    "bg-pink-[0-9]+"
    "bg-indigo-[0-9]+"
    "bg-teal-[0-9]+"
    "bg-cyan-[0-9]+"
    "bg-orange-[0-9]+"
    "bg-lime-[0-9]+"
    "bg-emerald-[0-9]+"
    "bg-sky-[0-9]+"
    "bg-violet-[0-9]+"
    "bg-fuchsia-[0-9]+"
    "bg-rose-[0-9]+"
    "bg-amber-[0-9]+"
    "bg-zinc-[0-9]+"
    "bg-neutral-[0-9]+"
    "bg-stone-[0-9]+"
    "bg-slate-[0-9]+"
    
    # テキスト色
    "text-white\b"
    "text-black\b"
    "text-gray-[0-9]+"
    "text-red-[0-9]+"
    "text-blue-[0-9]+"
    "text-green-[0-9]+"
    "text-yellow-[0-9]+"
    "text-purple-[0-9]+"
    "text-pink-[0-9]+"
    "text-indigo-[0-9]+"
    "text-teal-[0-9]+"
    "text-cyan-[0-9]+"
    "text-orange-[0-9]+"
    "text-lime-[0-9]+"
    "text-emerald-[0-9]+"
    "text-sky-[0-9]+"
    "text-violet-[0-9]+"
    "text-fuchsia-[0-9]+"
    "text-rose-[0-9]+"
    "text-amber-[0-9]+"
    "text-zinc-[0-9]+"
    "text-neutral-[0-9]+"
    "text-stone-[0-9]+"
    "text-slate-[0-9]+"
    
    # ボーダー色
    "border-white\b"
    "border-black\b"
    "border-gray-[0-9]+"
    "border-red-[0-9]+"
    "border-blue-[0-9]+"
    "border-green-[0-9]+"
    
    # その他
    "ring-gray-[0-9]+"
    "ring-blue-[0-9]+"
    "divide-gray-[0-9]+"
    "outline-gray-[0-9]+"
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