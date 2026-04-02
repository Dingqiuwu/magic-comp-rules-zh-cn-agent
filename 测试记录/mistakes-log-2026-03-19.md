# RulesGuru 测试错题记录

**测试日期：** 2026-03-18
**测试范围：** RulesGuru 10道规则题目
**正确率：** 8/10 (80%)

---

## 错题1：Q6528 - Roiling Vortex 与 {0} 费用咒语

**题目：** Nola controls Roiling Vortex, and Aspen casts Gustha's Scepter. Does Roiling Vortex deal them 5 damage?

**我的答案：** 不会造成5点伤害

**正确答案：** Yes. Gustha's Scepter costs {0}, which means Aspen doesn't spend any mana to cast it.

**错误分析：**
- Roiling Vortex 触发条件："if no mana was spent to cast that spell"
- 我误以为{0}费用 = 花费0点法术力
- 实际上，{0}费用意味着**不花费任何法术力**（doesn't spend any mana）
- 这是万智牌规则中的一个特殊设定：费用为{0}的咒语在施放时被视为"未花费法术力"

**规则引用：** Roiling Vortex 异能描述中 "if no mana was spent" 的判定

---

## 错题2：Q6583 - Veil of Summer 与咒语目标检查

**题目：** Anton casts Thought Scour targeting Nora. In response, Nora casts Veil of Summer. Anton responds with their own Veil of Summer. What happens?

**我的答案：** Thought Scour仍然会结算，对Nora生效

**正确答案：** Thought Scour tries to resolve and fails, since it has an illegal target. (608.2b)

**错误分析：**
- 我以为"不能被指定为目标"只影响新施放的咒语
- 实际上，咒语结算时会**重新检查目标合法性**（规则608.2b）
- 当Nora的Veil结算后，她有辟邪，不能被指定为目标
- Thought Scour结算时目标非法，被规则反击

**规则引用：** 608.2b - 如果咒语的所有目标都非法，该咒语被反击

---

## 总结

**薄弱环节：**
1. 法术力费用的"0"与"未花费"的区别
2. 咒语结算时的目标重新检查机制

**需要加强的知识点：**
- 602/608 咒语结算流程
- 702.51 Convoke与法术力花费的关系
- 目标指定与检查的完整流程
