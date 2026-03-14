#!/bin/bash

# 万智牌规则快速搜索脚本
# 用法: ./search.sh [选项] <关键词>

RULES_DIR="$(dirname "$0")/../markdown"
VERSION="2026年1月16日"

show_help() {
    echo "万智牌完整规则搜索工具 v$VERSION"
    echo ""
    echo "用法:"
    echo "  ./search.sh <关键词>           # 搜索关键词"
    echo "  ./search.sh -r <规则号>        # 按规则号查找 (如 702.19)"
    echo "  ./search.sh -k <关键词>        # 搜索关键字"
    echo "  ./search.sh -g <词汇>          # 查词汇表"
    echo "  ./search.sh -h                 # 显示帮助"
    echo ""
    echo "示例:"
    echo "  ./search.sh 践踏               # 搜索"践踏"相关内容"
    echo "  ./search.sh -r 702.19          # 查看践踏规则"
    echo "  ./search.sh -k 飞行            # 搜索飞行关键字"
    echo "  ./search.sh -g 主动牌手        # 查词汇表"
}

search_by_rule_number() {
    local rule=$1
    local chapter=$(echo $rule | cut -d. -f1)

    # 确定文件
    local file=""
    if [ "$chapter" = "701" ] || [ "$chapter" = "702" ] || [ "$chapter" = "703" ] || [ "$chapter" = "704" ] || [ $chapter -ge 705 ]; then
        file="$RULES_DIR/7.md"
    elif [ $chapter -ge 100 ] && [ $chapter -lt 200 ]; then
        file="$RULES_DIR/1.md"
    elif [ $chapter -ge 200 ] && [ $chapter -lt 300 ]; then
        file="$RULES_DIR/2.md"
    elif [ $chapter -ge 300 ] && [ $chapter -lt 400 ]; then
        file="$RULES_DIR/3.md"
    elif [ $chapter -ge 400 ] && [ $chapter -lt 500 ]; then
        file="$RULES_DIR/4.md"
    elif [ $chapter -ge 500 ] && [ $chapter -lt 600 ]; then
        file="$RULES_DIR/5.md"
    elif [ $chapter -ge 600 ] && [ $chapter -lt 700 ]; then
        file="$RULES_DIR/6.md"
    elif [ $chapter -ge 800 ] && [ $chapter -lt 900 ]; then
        file="$RULES_DIR/8.md"
    elif [ $chapter -ge 900 ]; then
        file="$RULES_DIR/9.md"
    fi

    if [ -n "$file" ] && [ -f "$file" ]; then
        echo "规则 $rule:"
        grep -A 1 "<b id='cr${rule//./-}'>" "$file" 2>/dev/null | head -3
        if [ $? -ne 0 ]; then
            grep -A 1 "cr${rule//./-}" "$file" 2>/dev/null | head -3
        fi
        echo ""
        echo "完整规则见: $file #cr${rule//./-}"
    else
        echo "未找到规则 $rule"
    fi
}

search_keyword() {
    local keyword=$1
    echo "搜索关键字: $keyword"
    echo "========================"

    # 在7.md中搜索（关键词章节）
    echo "【关键字动作/异能】"
    grep -n "span id=cr70[12]-[0-9]*>.*$keyword" "$RULES_DIR/7.md" 2>/dev/null | head -5

    # 搜索规则内容
    echo ""
    echo "【规则内容】"
    grep -n "$keyword" "$RULES_DIR/"*.md 2>/dev/null | head -10
}

search_glossary() {
    local term=$1
    echo "词汇表搜索: $term"
    echo "========================"

    # 在词汇表中搜索
    grep -B 2 -A 3 "$term" "$RULES_DIR/glossarycn.md" 2>/dev/null | head -20

    echo ""
    echo "--- 英文词汇表 ---"
    grep -B 2 -A 3 "$term" "$RULES_DIR/glossary.md" 2>/dev/null | head -20
}

general_search() {
    local term=$1
    echo "搜索: $term"
    echo "========================"

    # 先查词汇表
    echo "【词汇表】"
    grep -B 1 -A 2 "$term" "$RULES_DIR/glossarycn.md" 2>/dev/null | head -10

    # 查关键字
    echo ""
    echo "【关键字】"
    grep -n "span id=cr70[12]-[0-9]*>.*$term" "$RULES_DIR/7.md" 2>/dev/null | head -5

    # 查规则内容
    echo ""
    echo "【规则条目】(前10条)"
    grep -n "$term" "$RULES_DIR/"*.md 2>/dev/null | head -10
}

# 主程序
case "$1" in
    -h|--help)
        show_help
        ;;
    -r|--rule)
        if [ -z "$2" ]; then
            echo "错误: 请提供规则号"
            exit 1
        fi
        search_by_rule_number "$2"
        ;;
    -k|--keyword)
        if [ -z "$2" ]; then
            echo "错误: 请提供关键字"
            exit 1
        fi
        search_keyword "$2"
        ;;
    -g|--glossary)
        if [ -z "$2" ]; then
            echo "错误: 请提供词汇"
            exit 1
        fi
        search_glossary "$2"
        ;;
    "")
        show_help
        ;;
    *)
        general_search "$1"
        ;;
esac
