#!/usr/bin/env python3
"""
万智牌文章翻译工具
支持手动粘贴文章内容，生成翻译提示，保存翻译结果
"""

import sys
import os
import re
import json
from datetime import datetime
from pathlib import Path

class MTGArticleTranslator:
    """万智牌文章翻译管理器"""

    def __init__(self):
        self.articles_dir = Path(__file__).parent / 'articles'
        self.articles_dir.mkdir(exist_ok=True)

    def create_article(self, title: str, author: str = '', source_url: str = '', content: str = '') -> dict:
        """创建新文章条目"""
        article = {
            'title': title,
            'author': author,
            'source_url': source_url,
            'created_at': datetime.now().isoformat(),
            'original_content': content,
            'translated_content': '',
            'status': 'pending'  # pending, translating, completed
        }
        return article

    def save_article(self, article: dict, filename: str = None) -> str:
        """保存文章到文件"""
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_title = re.sub(r'[^\w\s-]', '', article.get('title', 'untitled'))[:40]
            filename = f"{timestamp}_{safe_title.replace(' ', '_')}.json"

        filepath = self.articles_dir / filename

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(article, f, ensure_ascii=False, indent=2)

        return str(filepath)

    def load_article(self, filename: str) -> dict:
        """加载文章"""
        filepath = self.articles_dir / filename
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def generate_translation_prompt(self, article: dict) -> str:
        """生成翻译提示词"""
        content = article.get('original_content', '')

        prompt = f"""请将以下万智牌(Magic: The Gathering)文章翻译成中文。

## 翻译要求

### 术语处理
- 所有万智牌**关键字异能**使用官方中文译名（如 Deathtouch → 死触, Trample → 践踏）
- **牌名**保持英文原文，首次出现时可在括号中标注中文译名
- **机制名称**使用官方中文译名（如 Commander → 指挥官/主将, Mana → 法术力）
- **赛制名称**使用官方中文译名（如 Standard → 标准, Modern → 现代）

### 格式保持
- 保持原有的段落结构
- 保持列表和编号格式
- 保留粗体、斜体等强调标记

### 翻译风格
- 策略分析保持专业性
- 保持原作者的语气（正式/轻松）
- 确保游戏术语的准确性

---

## 原文信息
- 标题: {article.get('title', 'N/A')}
- 作者: {article.get('author', 'N/A')}
- 来源: {article.get('source_url', 'N/A')}

---

## 原文内容

{content}

---

## 翻译后的中文内容

"""
        return prompt

    def save_translation_prompt(self, article: dict, filename: str = None) -> str:
        """保存翻译提示到文件"""
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_title = re.sub(r'[^\w\s-]', '', article.get('title', 'untitled'))[:40]
            filename = f"{timestamp}_{safe_title.replace(' ', '_')}_prompt.txt"

        filepath = self.articles_dir / filename
        prompt = self.generate_translation_prompt(article)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(prompt)

        return str(filepath)

    def update_translation(self, filename: str, translated_content: str) -> str:
        """更新文章的翻译内容"""
        article = self.load_article(filename)
        article['translated_content'] = translated_content
        article['status'] = 'completed'
        article['translated_at'] = datetime.now().isoformat()

        filepath = self.articles_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(article, f, ensure_ascii=False, indent=2)

        return str(filepath)

    def export_translation(self, filename: str, output_format: str = 'md') -> str:
        """导出翻译结果为指定格式"""
        article = self.load_article(filename)

        if output_format == 'md':
            return self._export_markdown(article)
        elif output_format == 'txt':
            return self._export_text(article)
        else:
            raise ValueError(f"不支持的格式: {output_format}")

    def _export_markdown(self, article: dict) -> str:
        """导出为 Markdown 格式"""
        timestamp = datetime.now().strftime('%Y%m%d')
        safe_title = re.sub(r'[^\w\s-]', '', article.get('title', 'untitled'))[:40]
        filename = f"{timestamp}_{safe_title.replace(' ', '_')}_translated.md"
        filepath = self.articles_dir / filename

        md_content = f"""# {article.get('title', '无标题')}

> **原文作者**: {article.get('author', '未知')}
> **原文链接**: {article.get('source_url', 'N/A')}
> **翻译时间**: {article.get('translated_at', datetime.now().isoformat())}

---

{article.get('translated_content', '尚未翻译')}

---

*本文档由 mtg-rules-agent/article-translator 工具生成*
"""

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(md_content)

        return str(filepath)

    def _export_text(self, article: dict) -> str:
        """导出为纯文本格式"""
        timestamp = datetime.now().strftime('%Y%m%d')
        safe_title = re.sub(r'[^\w\s-]', '', article.get('title', 'untitled'))[:40]
        filename = f"{timestamp}_{safe_title.replace(' ', '_')}_translated.txt"
        filepath = self.articles_dir / filename

        text_content = f"""标题: {article.get('title', '无标题')}
作者: {article.get('author', '未知')}
来源: {article.get('source_url', 'N/A')}
翻译时间: {article.get('translated_at', datetime.now().isoformat())}

{'='*60}

{article.get('translated_content', '尚未翻译')}

{'='*60}

本文档由 mtg-rules-agent/article-translator 工具生成
"""

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(text_content)

        return str(filepath)

    def list_articles(self) -> list:
        """列出所有文章"""
        articles = []
        for f in self.articles_dir.glob('*.json'):
            try:
                with open(f, 'r', encoding='utf-8') as file:
                    article = json.load(file)
                    articles.append({
                        'filename': f.name,
                        'title': article.get('title', 'N/A'),
                        'status': article.get('status', 'unknown'),
                        'created_at': article.get('created_at', 'N/A')
                    })
            except:
                pass
        return sorted(articles, key=lambda x: x['created_at'], reverse=True)


def print_usage():
    print("""
万智牌文章翻译工具

用法:
  python3 translate.py new "标题" [作者] [来源URL]    - 创建新文章
  python3 translate.py prompt <文件名>                - 生成翻译提示
  python3 translate.py update <文件名>                - 更新翻译内容(交互式)
  python3 translate.py export <文件名> [md|txt]       - 导出翻译结果
  python3 translate.py list                           - 列出所有文章

示例:
  python3 translate.py new "The Gitrog Monster Primer" "User123" "https://moxfield.com/..."
  python3 translate.py prompt 20250405_The_Gitrog_Monster_Primer.json
  python3 translate.py export 20250405_The_Gitrog_Monster_Primer.json md
""")


def interactive_update(translator: MTGArticleTranslator, filename: str):
    """交互式更新翻译内容"""
    print(f"\n正在更新: {filename}")
    print("请粘贴翻译后的中文内容（输入 END 单独一行结束）:\n")

    lines = []
    while True:
        try:
            line = input()
            if line == "END":
                break
            lines.append(line)
        except EOFError:
            break

    translated_content = '\n'.join(lines)

    if translated_content.strip():
        filepath = translator.update_translation(filename, translated_content)
        print(f"\n翻译已保存: {filepath}")

        # 同时导出为 markdown
        md_path = translator.export_translation(filename, 'md')
        print(f"Markdown 导出: {md_path}")
    else:
        print("没有内容，取消更新")


def main():
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    command = sys.argv[1]
    translator = MTGArticleTranslator()

    if command == 'new':
        if len(sys.argv) < 3:
            print("错误: 需要提供标题")
            sys.exit(1)

        title = sys.argv[2]
        author = sys.argv[3] if len(sys.argv) > 3 else ''
        source_url = sys.argv[4] if len(sys.argv) > 4 else ''

        print(f"创建新文章: {title}")
        print("请粘贴原文内容（输入 END 单独一行结束）:\n")

        lines = []
        while True:
            try:
                line = input()
                if line == "END":
                    break
                lines.append(line)
            except EOFError:
                break

        content = '\n'.join(lines)
        article = translator.create_article(title, author, source_url, content)
        filepath = translator.save_article(article)
        print(f"\n文章已保存: {filepath}")

        # 同时生成翻译提示
        prompt_path = translator.save_translation_prompt(article)
        print(f"翻译提示已生成: {prompt_path}")

    elif command == 'prompt':
        if len(sys.argv) < 3:
            print("错误: 需要提供文件名")
            sys.exit(1)

        filename = sys.argv[2]
        prompt_path = translator.save_translation_prompt(translator.load_article(filename))
        print(f"翻译提示已保存: {prompt_path}")

    elif command == 'update':
        if len(sys.argv) < 3:
            print("错误: 需要提供文件名")
            sys.exit(1)

        interactive_update(translator, sys.argv[2])

    elif command == 'export':
        if len(sys.argv) < 3:
            print("错误: 需要提供文件名")
            sys.exit(1)

        filename = sys.argv[2]
        fmt = sys.argv[3] if len(sys.argv) > 3 else 'md'

        export_path = translator.export_translation(filename, fmt)
        print(f"已导出: {export_path}")

    elif command == 'list':
        articles = translator.list_articles()
        print(f"\n{'文件名':<50} {'状态':<12} {'标题'}")
        print('-' * 100)
        for a in articles:
            status_emoji = {'pending': '⏳', 'translating': '🔄', 'completed': '✅'}.get(a['status'], '❓')
            print(f"{a['filename']:<50} {status_emoji} {a['status']:<10} {a['title'][:40]}")

    else:
        print(f"未知命令: {command}")
        print_usage()
        sys.exit(1)


if __name__ == '__main__':
    main()
