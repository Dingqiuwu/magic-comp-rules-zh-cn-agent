# MTG Rules Agent 项目架构

## 项目目标

构建大中华区最专业的万智牌规则、裁判、内容翻译一体化工具集。

## 核心模块

### 1. 规则裁判助手 (mtg-judge-zh)
- **功能**: 回答万智牌规则问题、分析牌张互动
- **入口**: `skill.md`
- **数据源**: 
  - 本地规则库 (`markdown/`)
  - mtgch API (中文牌名)
  - Scryfall API (英文牌面、FAQ)

### 2. 内容翻译系统 (article-translator)
- **功能**: 专业翻译万智牌文章、套牌指南
- **特点**:
  - 自动查证牌名 (mtgch API)
  - 术语标准化 (本地规则库)
  - 输出专业格式 (Markdown + 对照表)

### 3. 规则参考库 (references/)
- 堆叠与优先权
- 触发式异能
- 层系统与持续性效应
- 替代式/防止式效应
- 复制效应

## 工作流程

```
用户提问/请求
    ↓
[技能路由]
    ↓
┌─────────────┬─────────────┬─────────────┐
↓             ↓             ↓             ↓
规则问答      牌张查询      文章翻译      赛事规则
(mtg-judge)   (card-lookup) (translator)  (tournament)
    ↓             ↓             ↓             ↓
规则库         mtgch        mtgch+规则库   MTR/IPG
+ mtgch       + Scryfall    + 专业术语     文档
```

## 文件组织

```
mtg-rules-agent/
├── skill.md                    # Claude Code Skill 入口
├── ARCHITECTURE.md             # 本文件
├── README.md                   # 项目说明
├── TODO.md                     # 待办事项
│
├── markdown/                   # 完整规则库
│   ├── 1.md ~ 9.md            # CR 章节
│   ├── glossarycn.md          # 中文词汇表
│   └── ...
│
├── references/                 # 专题参考文档
│   ├── stack-priority.md
│   ├── triggered-abilities.md
│   ├── continuous-effects.md
│   ├── replacement-effects.md
│   ├── prevention-effects.md
│   └── copy-effects.md
│
├── article-translator/         # 内容翻译系统
│   ├── README.md
│   ├── mtg_translator.py      # 核心翻译工具
│   └── articles/              # 翻译成果 (gitignored)
│
├── scripts/                    # 数据处理脚本
│   ├── plain2json.py
│   ├── json2md.py
│   └── ...
│
└── .claude/skills/            # Claude 技能链接
    └── mtg-judge-zh.md        # 指向 skill.md
```

## 整合方案

### 方案 A: 扩展现有 Skill (推荐)

在 `skill.md` 中增加翻译工作流程：

```markdown
## 内容翻译工作流程

当用户需要翻译 MTG 文章时：

1. **接收内容**
   - 用户提供文章文本/链接
   - 如果提供链接，尝试通过 fetch 获取

2. **牌名查证**
   - 提取所有疑似牌名
   - 使用 mtgch API 查证官方中文译名
   - 建立牌名对照表

3. **术语标准化**
   - 从规则库查询关键字译名
   - 识别赛制术语、机制名称

4. **专业翻译**
   - 保持原文结构
   - 牌名格式: 中文译名 (英文原名)
   - 术语使用官方译名

5. **输出格式**
   - Markdown 文档
   - 包含牌名对照表
   - 包含术语对照表
   - 保存到 article-translator/articles/
```

### 方案 B: 独立 Agent

创建专门的 `mtg-translator` agent：
- 专注于长文翻译
- 保留完整上下文
- 适合复杂套牌指南

## 更新计划

### Phase 1: 整合翻译功能
- [x] 创建 article-translator 工具
- [ ] 更新 skill.md 增加翻译流程
- [ ] 添加翻译示例到 README

### Phase 2: 自动化增强
- [ ] 支持 URL 自动抓取 (绕过限制)
- [ ] 批量牌名查证优化
- [ ] 翻译质量检查

### Phase 3: 内容管理
- [ ] 翻译成果索引
- [ ] 版本控制
- [ ] 质量反馈收集

## 技术栈

- **数据存储**: 本地 JSON/Markdown
- **API 集成**: mtgch, Scryfall
- **文本处理**: Python + 正则
- **版本控制**: Git (排除 articles/)

## 质量保障

1. **牌名准确性**: 必须通过 mtgch API 验证
2. **术语一致性**: 参考本地规则库
3. **专业规范**: 符合大中华区裁判社群标准
4. **可追溯性**: 保留原文、来源、翻译时间
