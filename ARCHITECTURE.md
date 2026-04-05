# 项目架构

## 模块

```
mtg-rules-agent/
├── SKILL.md              # 主技能（规则问答）
├── article-translator/   # 文章翻译
│   └── mtg_translator.py
├── references/           # 专题参考
└── markdown/             # 完整规则库
```

## 翻译流程

```
粘贴文章 → 提取牌名 → mtgch API查证 → 术语对照 → Markdown输出
```

## 数据源

- 规则库: 本地 markdown/
- 牌名: mtgch API
- 英文牌面: Scryfall API
