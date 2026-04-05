# MTG Rules Agent - 项目状态报告

**日期**: 2026-04-06  
**版本**: v2.0 (翻译系统整合完成)

---

## 项目概览

大中华区最专业的万智牌规则、裁判、内容翻译一体化工具集。

## 核心功能模块

### 1. 规则裁判助手 (mtg-judge-zh) ✅

**功能**: 回答万智牌规则问题、分析牌张互动

**特性**:
- 基于本地完整规则库 (CR 中文译本)
- 集成 mtgch API 查证中文牌名
- 集成 Scryfall 查询英文牌面和 FAQ
- 专题参考文档 (层系统、堆叠、触发等)

**使用**:
```bash
/skill load /path/to/mtg-rules-agent/SKILL.md
```

### 2. 内容翻译系统 (article-translator) ✅ NEW

**功能**: 专业翻译万智牌文章、套牌指南(primer)

**特性**:
- 自动提取并查证牌名 (mtgch API)
- 术语标准化 (规则库对照)
- 专业 Markdown 输出 (含对照表)
- 符合大中华区裁判社群规范

**工作流程**:
```
用户粘贴文章 → 提取牌名 → API查证 → 术语对照 → 专业翻译 → Markdown输出
```

**示例成果**:
- `Ulalek_Nightmare_Stacks_primer_translated.md` - 完整的套牌指南翻译，包含66张牌名对照

### 3. 规则参考库 (references/) ✅

专题参考文档:
- `stack-priority.md` - 堆叠与优先权
- `triggered-abilities.md` - 触发式异能
- `continuous-effects.md` - 持续性效应与层系统
- `replacement-effects.md` - 替代式效应
- `prevention-effects.md` - 防止式效应
- `copy-effects.md` - 复制效应

### 4. 完整规则库 (markdown/) ✅

《万智牌完整规则》中文译本:
- 1.md ~ 9.md - 全 9 章
- glossarycn.md - 中文词汇表
- 最新更新: 2026年1月16日 (洛温：暗影笼罩)

---

## 技术架构

```
用户请求
    ↓
┌─────────────────────────────────────────────┐
│  技能路由 (SKILL.md)                         │
│  ┌─────────────┬─────────────┬─────────────┐│
│  │ 规则问答    │ 牌张查询    │ 文章翻译    ││
│  │ (judge)     │ (card)      │ (translate) ││
│  └──────┬──────┴──────┬──────┴──────┬──────┘│
└─────────┼─────────────┼─────────────┼───────┘
          ↓             ↓             ↓
    markdown/      mtgch API     mtgch API
    (规则库)     + Scryfall      + 规则库
```

---

## 文件组织结构

```
mtg-rules-agent/
├── SKILL.md                    # 主技能定义
├── README.md                   # 项目说明
├── ARCHITECTURE.md             # 架构文档
├── TODO.md                     # 待办事项
├── PROJECT_STATUS.md           # 本文件
│
├── markdown/                   # 完整规则库
├── references/                 # 专题参考文档
│
├── article-translator/         # 内容翻译系统
│   ├── mtg_translator.py      # 核心翻译工具
│   ├── README.md              # 使用说明
│   └── articles/              # 翻译成果 (gitignored)
│
├── scripts/                    # 数据处理脚本
└── .claude/skills/            # Claude 技能链接
    └── mtg-judge-zh.md
```

---

## 翻译系统详细说明

### 核心能力

1. **牌名自动查证**
   ```python
   # 使用 mtgch API
   GET https://mtgch.com/api/v1/autocomplete/?q=Ulalek&size=1
   # 返回: 残暴合体钨拉雷
   ```

2. **术语标准化**
   - 关键字异能: 死触、践踏、敏捷、辟邪...
   - 赛制名称: 指挥官/主将、标准、摩登...
   - 机制术语: 堆叠、优先权、触发式异能...

3. **输出格式**
   - 原文信息 (标题、作者、来源)
   - 牌名对照表 (英文 → 官方中文)
   - 术语对照表
   - 翻译正文 (保持原文结构)

### 翻译示例

**原文**:
> "Ulalek, Fused Atrocity is a representation of what happens when two Titans dip into the same plane at the same location and time."

**译文**:
> "残暴合体钨拉雷 (Ulalek, Fused Atrocity) 展现的是当两位泰坦同时在一个时空的同一地点现身时会发生什么。"

---

## 使用指南

### 规则问答

```
用户: 裁判，践踏是怎么运作的？
系统: 查询规则库 → 返回 702.19 践踏详细说明
```

### 牌张查询

```
用户: 残暴合体钨拉雷的异能是什么？
系统: 
1. mtgch API 确认牌名
2. Scryfall 获取英文异能
3. 规则库查询相关机制
4. 返回完整解释
```

### 文章翻译

```
用户: 请翻译这篇套牌指南 [粘贴内容]
系统:
1. 分析文本提取牌名
2. mtgch API 查证66张牌
3. 识别术语建立对照表
4. 专业翻译生成Markdown
5. 保存到 articles/ 目录
```

---

## 质量保证

1. **牌名准确性**: 100% 通过 mtgch API 验证
2. **术语一致性**: 严格遵循《万智牌完整规则》中文译本
3. **专业规范**: 符合大中华区裁判社群标准
4. **可追溯性**: 所有翻译保留原文、来源、时间

---

## 待办事项

### 高优先级
- [ ] 接入牌张 FAQ 数据 (Scryfall rulings)
- [ ] 接入 MTR/IPG 赛事规则文档

### 中优先级
- [ ] 优化翻译工具 (批量查证缓存)
- [ ] 支持更多输入格式 (HTML, PDF解析)

### 低优先级
- [ ] 翻译成果 Web 展示
- [ ] 社区贡献指南

---

## 贡献者

- **规则翻译**: 大中华区裁判社群志愿者
- **AI 技能开发**: Claude Code + 项目维护者
- **术语标准化**: 参考《万智牌完整规则》中文译本

---

## 参考资源

- **mtgch**: https://mtgch.com/api/v1/ - 中文卡牌查询
- **Scryfall**: https://api.scryfall.com/ - 英文卡牌查询
- **裁判Wiki**: https://wiki.mtgjudge.cn/ - 中文规则资源
- **大学院废墟**: https://lib.sbwsz.com/cr - CR 在线查看

---

*本项目旨在服务大中华区万智牌社区，提供专业、准确的规则和翻译支持。*
