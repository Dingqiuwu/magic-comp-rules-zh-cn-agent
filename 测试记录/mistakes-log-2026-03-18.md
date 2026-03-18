# RulesGuru 测试错题记录

## 测试概览
- **测试日期**: 2026-03-18
- **测试来源**: [RulesGuru](https://rulesguru.org/)
- **题目数量**: 10
- **正确数量**: 5
- **准确率**: 50%

---

## 错题详情

### 第1题: Question 6528 - Roiling Vortex 触发条件

**题目**: Nathanael controls Roiling Vortex, and Alma casts Mishra's Bauble. Does Roiling Vortex deal them 5 damage?

**我的回答**: 不会。Roiling Vortex 需要"从非手牌区域施放"，而 Bauble 是从手牌施放的。

**正确答案**: **会**。Mishra's Bauble 费用为 {0}，意味着 Alma 不花费法术力来施放它。

**错误原因**: 误解了 Roiling Vortex 的触发条件。

**正确规则**: Roiling Vortex 的触发条件是"每当一个牌手施放一个咒语，且该咒语未花费法术力"。这与施放区域无关。

**相关规则**:
- 702.51a (Convoke 规则) - 说明召集可以替代法术力费用
- 需要查证 Roiling Vortex 完整异能文本

---

### 第2题: Question 6575 - Chord of Calling + Roiling Vortex

**题目**: If Ally casts Chord of Calling with X=2 by tapping 5 green creatures, does it trigger Roiling Vortex?

**我的回答**: 不会。Convoke 是从手牌施放，Roiling Vortex 需要"从非手牌区域施放"。

**正确答案**: **会**。没有法术力被花费来施放 Chord of Calling。(702.51a)

**错误原因**: 同上，持续误解 Roiling Vortex 触发条件。

**正确理解**: Convoke（召集）允许用横置生物来替代法术力费用。如果全部费用都用召集支付，则"未花费法术力"，触发 Roiling Vortex。

---

### 第3题: Question 6578 - 抽牌步骤优先权

**题目**: Does Noe have a chance to cast Extirpate after Ainsley has drawn for turn but before they have a chance to cast a sorcery?

**我的回答**: 没有。主动牌手先获得优先权。

**正确答案**: **有**。抽牌步骤中，牌手在抽牌后会获得优先权。(504.2/500.3)

**错误原因**: 忽略了抽牌步骤的优先权窗口。

**正确规则**:
- 504.2: 抽牌步骤中，主动牌手抽一张牌后，双方牌手获得优先权
- 这不是主阶段，但确实存在优先权传递
- Extirpate 是法术牌（Sorcery），通常只能在主阶段施放，但题目可能是指某个允许在抽牌步骤施放的情况（如 Vedalken Orrery 等）

**需要确认**: Extirpate 本身是否有特殊施放时机？查证确认。

---

### 第4题: Question 6590 - 延迟只能从手牌

**题目**: Ansley attacks with Ragavan, Nimble Pilferer and exiles Rift Bolt. Can Ansley suspend it? If so, what happens?

**我的回答**: 可以延迟。Ragavan 允许"施放"放逐的牌，延迟是施放的一种方式。

**正确答案**: **不能延迟**。牌只能从手牌中延迟，不能从放逐区。(702.62a)

**错误原因**: 误解了延迟（Suspend）的启动条件。

**正确规则**:
- 702.62a: 具有延迟异能的牌只能从其拥有者的手牌中延迟
- Ragavan 让你"施放"该牌，但延迟不是"施放"，而是一种特殊的起动式异能
- 从放逐区施放牌与从手牌延迟牌是不同的机制

---

### 第5题: Question 6594 - Dress Down 与获得异能的时间印记

**题目**: In their first main phase, Avery activates Sokenzan, Crucible of Defiance to create two tokens, and Noelle responds with Dress Down. What happens with the tokens?

**我的回答**: 衍生物正常进场为 1/1，不受 Dress Down 影响（因为 Dress Down 先结算）。

**正确答案**: 衍生物作为 1/1 被创造，然后**获得敏捷**。它们本回合可以攻击。

**错误原因**: 没有意识到"获得敏捷"是单独的持续性效应，需要应用时间印记规则。

**正确规则分析**:
1. Dress Down 在响应中施放，先结算 → 时间印记早
2. Sokenzan 的异能后结算，创造衍生物
3. Sokenzan 说衍生物"获得敏捷"（gain haste）→ 这是单独的持续性效应
4. 层系统中，Dress Down（移除异能）时间印记早于"获得敏捷"
5. 所以顺序：先移除所有异能 → 然后获得敏捷
6. 最终衍生物有敏捷，可以攻击

**关键规则引用**:
- 113.1a, 113.10, 608.2c: "获得敏捷"不是印刷文字，是单独的效应
- 613.7: 时间印记顺序
- 613.7a, 613.7d, 613.7b: 时间印记判定规则

---

## 错误模式分析

### 模式1: 对特定牌张异能理解不准确
- **Roiling Vortex**: 误记触发条件
- **Suspend**: 不了解延迟只能从手牌进行

### 模式2: 回合结构细节模糊
- **抽牌步骤**: 忘记了抽牌后存在优先权窗口

### 模式3: 复杂的层系统/时间印记交互
- **Dress Down + 获得异能**: 未能识别这是需要应用时间印记的层系统问题
- 把"创造衍生物并获得敏捷"当作原子操作，实际上分为两个步骤

---

## 学习行动计划

1. **重新阅读 Roiling Vortex 完整异能文本** - 确认触发条件的确切表述
2. **复习 Suspend 规则 702.62** - 明确延迟的启动条件和限制
3. **复习回合结构 504 步骤** - 特别是抽牌步骤的优先权传递
4. **深入理解层系统 613.7 时间印记** - 特别是创造衍生物后"获得异能"这类效应
