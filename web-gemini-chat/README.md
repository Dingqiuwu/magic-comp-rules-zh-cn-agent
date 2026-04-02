# Gemini AI 前端交互页

这是一个纯前端聊天页面，可直接连接 Gemini API。

## 文件说明

- `index.html`：页面结构
- `styles.css`：视觉与响应式样式
- `app.js`：聊天逻辑、本地存储、Gemini API 调用

## 使用方式

1. 使用任意静态服务器打开 `index.html`（不要直接双击以 `file://` 方式打开）。
2. 在左侧填入 Gemini API Key。
3. 选择模型并调整参数后即可发送消息。

## 说明

- API Key 和聊天记录保存在浏览器 `localStorage`。
- 本页通过浏览器直接请求 Gemini 接口：
  - `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- 右侧“规则引用原文”会读取仓库中的 `markdown/*.md`，因此必须通过 HTTP/HTTPS 访问页面。

## 建议

- 生产环境建议改为后端代理方式，避免把密钥长期放在浏览器端。
