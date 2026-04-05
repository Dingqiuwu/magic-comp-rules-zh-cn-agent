#!/usr/bin/env python3
"""
万智牌文章抓取与翻译工具
用于抓取万智牌相关文章并进行中文翻译
"""

import sys
import os
import re
import json
import urllib.request
import urllib.parse
from datetime import datetime
from html.parser import HTMLParser

class ArticleFetcher:
    """文章抓取器"""

    def __init__(self):
        self.articles_dir = os.path.join(os.path.dirname(__file__), 'articles')
        os.makedirs(self.articles_dir, exist_ok=True)

    def fetch(self, url: str) -> dict:
        """抓取文章并返回结构化数据"""
        print(f"正在抓取: {url}")

        # 根据URL类型选择抓取策略
        if 'moxfield.com' in url:
            return self._fetch_moxfield(url)
        else:
            return self._fetch_generic(url)

    def _fetch_moxfield(self, url: str) -> dict:
        """抓取Moxfield文章"""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as response:
                html = response.read().decode('utf-8')
        except Exception as e:
            print(f"抓取失败: {e}")
            return None

        # 提取文章信息
        article = {
            'source_url': url,
            'fetched_at': datetime.now().isoformat(),
            'platform': 'moxfield'
        }

        # 提取牌组名称
        title_match = re.search(r'<title>(.*?)</title>', html)
        if title_match:
            article['title'] = title_match.group(1).strip()

        # 提取作者
        author_match = re.search(r'"author":\s*"([^"]+)"', html)
        if author_match:
            article['author'] = author_match.group(1)

        # 提取primer内容 - Moxfield的primer通常在特定脚本标签中
        primer_match = re.search(r'"primer":\s*"([^"]+)"', html)
        if primer_match:
            # 可能需要进一步解析
            article['primer_raw'] = primer_match.group(1)

        # 提取牌组信息
        deck_match = re.search(r'"name":\s*"([^"]+)"', html)
        if deck_match:
            article['deck_name'] = deck_match.group(1)

        # 提取描述/介绍
        desc_match = re.search(r'"description":\s*"([^"]+)"', html)
        if desc_match:
            article['description'] = desc_match.group(1).replace('\\n', '\n')

        # 提取牌表
        cards_match = re.search(r'"cards":\s*(\[.*?\])', html, re.DOTALL)
        if cards_match:
            article['has_card_list'] = True

        return article

    def _fetch_generic(self, url: str) -> dict:
        """通用文章抓取"""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as response:
                html = response.read().decode('utf-8')
        except Exception as e:
            print(f"抓取失败: {e}")
            return None

        article = {
            'source_url': url,
            'fetched_at': datetime.now().isoformat(),
            'platform': 'generic',
            'html': html[:50000]  # 限制大小
        }

        # 尝试提取标题
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        if title_match:
            article['title'] = title_match.group(1).strip()

        return article

    def save(self, article: dict, filename: str = None) -> str:
        """保存文章到文件"""
        if filename is None:
            # 使用时间戳生成文件名
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_title = re.sub(r'[^\w\s-]', '', article.get('title', 'untitled'))[:50]
            filename = f"{timestamp}_{safe_title.replace(' ', '_')}.json"

        filepath = os.path.join(self.articles_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(article, f, ensure_ascii=False, indent=2)

        print(f"文章已保存: {filepath}")
        return filepath


class ArticleTranslator:
    """文章翻译器 - 集成Claude API进行翻译"""

    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')

    def translate(self, article: dict) -> str:
        """翻译文章内容为中文"""
        # 构建翻译提示
        content = self._extract_content(article)

        prompt = f"""请将以下万智牌(Magic: The Gathering)相关文章翻译成中文。

翻译要求：
1. 保持原有的格式结构（标题、段落、列表等）
2. 所有万智牌专用术语使用官方中文译名（如 "commander" → "主将/指挥官"）
3. 牌名保持英文原文，可在括号中标注中文译名
4. 保留原有的分段和层次结构
5. 对于策略分析部分，保持专业性和准确性

原文内容：
{content}

请输出翻译后的中文内容："""

        return prompt

    def _extract_content(self, article: dict) -> str:
        """从文章数据中提取需要翻译的内容"""
        parts = []

        if 'title' in article:
            parts.append(f"标题: {article['title']}")

        if 'description' in article:
            parts.append(f"描述: {article['description']}")

        if 'primer_raw' in article:
            parts.append(f"Primer: {article['primer_raw']}")

        return '\n\n'.join(parts)

    def save_translation_prompt(self, article: dict, filepath: str):
        """保存翻译提示到文件，供手动或API使用"""
        prompt = self.translate(article)

        prompt_file = filepath.replace('.json', '_translation_prompt.txt')
        with open(prompt_file, 'w', encoding='utf-8') as f:
            f.write(prompt)

        print(f"翻译提示已保存: {prompt_file}")
        return prompt_file


def main():
    if len(sys.argv) < 2:
        print("用法: python3 fetch_article.py <URL>")
        print("示例: python3 fetch_article.py 'https://moxfield.com/decks/...'")
        sys.exit(1)

    url = sys.argv[1]

    # 抓取文章
    fetcher = ArticleFetcher()
    article = fetcher.fetch(url)

    if not article:
        print("抓取失败")
        sys.exit(1)

    # 打印基本信息
    print(f"\n{'='*50}")
    print(f"标题: {article.get('title', 'N/A')}")
    print(f"作者: {article.get('author', 'N/A')}")
    print(f"平台: {article.get('platform', 'N/A')}")
    print(f"{'='*50}\n")

    # 保存文章
    filepath = fetcher.save(article)

    # 生成翻译提示
    translator = ArticleTranslator()
    prompt_file = translator.save_translation_prompt(article, filepath)

    print(f"\n翻译提示已生成: {prompt_file}")
    print("你可以：")
    print(f"1. 将 {prompt_file} 的内容复制给 Claude 进行翻译")
    print(f"2. 或直接查看保存的文章数据: {filepath}")


if __name__ == '__main__':
    main()
