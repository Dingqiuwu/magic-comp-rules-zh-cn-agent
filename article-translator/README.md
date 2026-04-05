# 万智牌文章翻译工具

此文件夹用于管理万智牌相关文章的翻译工作流。

## 为什么用这种方式？

由于大多数 MTG 网站（如 Moxfield、MTGGoldfish、EDHRec 等）都有 Cloudflare 保护，直接抓取会被拦截。因此本工具采用**手动粘贴 + 结构化翻译**的工作流。

## 文件结构

```
article-translator/
├── .gitignore              # 确保 articles/ 不被git管理
├── README.md               # 本说明文件
├── translate.py            # 主翻译工具
├── fetch_article.py        # 网页抓取工具（备用，大多数网站不可用）
└── articles/               # 文章存储目录（被git忽略）
    ├── 20260406_xxx.json              # 文章数据
    ├── 20260406_xxx_prompt.txt        # 翻译提示
    ├── 20260406_xxx_translated.md     # 翻译结果(Markdown)
    └── ...
```

## 使用方法

### 1. 创建新文章

```bash
python3 translate.py new "文章标题" "作者" "来源URL"
```

然后粘贴原文内容，输入 `END` 结束。

示例：
```bash
python3 translate.py new "The Gitrog Monster Primer" "Player123" "https://moxfield.com/decks/xxx"
# 粘贴文章内容...
# 输入 END 结束
```

### 2. 生成翻译提示

创建文章时会自动生成翻译提示文件 `_prompt.txt`。你也可以随时重新生成：

```bash
python3 translate.py prompt <文件名>
```

### 3. 获取翻译

将生成的 `_prompt.txt` 文件内容发送给 Claude，即可获取专业的万智牌文章中文翻译。

翻译提示已针对万智牌术语优化，会自动处理：
- 牌名（保留英文，括号内可标注中文）
- 关键字异能（死触、践踏、敏捷等）
- 赛制名称（指挥官/主将、标准、摩登等）
- 机制术语（法术力、献力、召集等）

### 4. 保存翻译结果

获取翻译后，更新文章：

```bash
python3 translate.py update <文件名>
# 粘贴翻译内容...
# 输入 END 结束
```

### 5. 导出翻译结果

```bash
# 导出为 Markdown
python3 translate.py export <文件名> md

# 导出为纯文本
python3 translate.py export <文件名> txt
```

### 6. 列出所有文章

```bash
python3 translate.py list
```

## 完整工作流示例

```bash
# 1. 创建文章（手动粘贴Moxfield内容）
python3 translate.py new "Gitrog Combo Primer" "EDHMaster" "https://moxfield.com/decks/xxx"
# 粘贴文章内容，输入 END

# 2. 将生成的 prompt 文件内容发给 Claude 翻译
# cat articles/2026xxx_Gitrog_Combo_Primer_prompt.txt

# 3. 获取翻译后，保存回文章
python3 translate.py update articles/2026xxx_Gitrog_Combo_Primer.json
# 粘贴Claude的翻译，输入 END

# 4. 导出为 Markdown
python3 translate.py export articles/2026xxx_Gitrog_Combo_Primer.json md
```

## 注意事项

1. **此文件夹为测试用途**，`articles/` 目录已被 `.gitignore` 排除
2. 重要翻译结果请及时导出并保存到项目其他位置
3. 由于 Cloudflare 保护，自动抓取功能（fetch_article.py）对大多数 MTG 网站不可用

## 抓取网页内容的替代方案

对于受保护的网站，建议使用以下方式获取原文：

1. **浏览器手动复制**：打开网页，选中内容复制粘贴
2. **Reader Mode**：使用浏览器的阅读模式获取纯净文本
3. **打印为 PDF**：然后使用 PDF 转文本工具
