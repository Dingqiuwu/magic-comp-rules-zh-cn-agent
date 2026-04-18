const el = {
  baseUrl: document.getElementById("baseUrl"),
  apiKey: document.getElementById("apiKey"),
  model: document.getElementById("model"),
  fetchModelsBtn: document.getElementById("fetchModelsBtn"),
  temperature: document.getElementById("temperature"),
  temperatureValue: document.getElementById("temperatureValue"),
  maxTokens: document.getElementById("maxTokens"),
  cardName: document.getElementById("cardName"),
  forceCardLookup: document.getElementById("forceCardLookup"),
  systemPrompt: document.getElementById("systemPrompt"),
  insertPromptBtn: document.getElementById("insertPromptBtn"),
  clearChatBtn: document.getElementById("clearChatBtn"),
  completionSound: document.getElementById("completionSound"),
  chatList: document.getElementById("chatList"),
  ruleEvidenceList: document.getElementById("ruleEvidenceList"),
  ruleEvidenceMeta: document.getElementById("ruleEvidenceMeta"),
  activeModel: document.getElementById("activeModel"),
  lookupState: document.getElementById("lookupState"),
  ruleFetchState: document.getElementById("ruleFetchState"),
  chatSearch: document.getElementById("chatSearch"),
  favoritesOnlyFilter: document.getElementById("favoritesOnlyFilter"),
  ruleOnlyFilter: document.getElementById("ruleOnlyFilter"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  chatSearchMeta: document.getElementById("chatSearchMeta"),
  chatForm: document.getElementById("chatForm"),
  userInput: document.getElementById("userInput"),
  stopBtn: document.getElementById("stopBtn"),
  retryBtn: document.getElementById("retryBtn"),
  sendBtn: document.getElementById("sendBtn"),
  status: document.getElementById("status"),
  msgTpl: document.getElementById("msgTpl"),
  promptSuggestions: Array.from(document.querySelectorAll(".prompt-chip"))
};

const LS_KEY = "geminiChatUI.settings.v1";
const MSG_KEY = "geminiChatUI.messages.v1";
const SEND_BUTTON_IDLE_TEXT = "发送";
const SEND_BUTTON_LOADING_TEXT = "发送中…";
const CARD_NAME_SEPARATOR = /\s*[|｜]\s*/;
const MAX_LOOKUP_CARDS = 6;
const RULE_REF_PATTERN = /\b([1-9]\d{2}\.\d+[a-z]?)\b/gi;
const RULE_REF_CHECK_PATTERN = /\b([1-9]\d{2}\.\d+[a-z]?)\b/i;

let messages = [];
let isBusy = false;
let audioContext = null;
let autoFilledCardName = "";
let activeRequestController = null;
let activeGenerationMode = "";
let activeLoadingBubble = null;
let ruleFetchStatus = "unknown";
let chatFilterEmptyNode = null;
let lastFailedUserText = "";
const cardAutocompleteCache = new Map();
let cardAutocompleteTimer = null;
const ruleFileCache = new Map();

function getModelValue() {
  return el.model.value.trim() || "";
}

function setRuleFetchStatus(nextStatus) {
  ruleFetchStatus = nextStatus;
  updateWorkspaceIndicators();
}

function getRuleFetchLabel() {
  if (window.location.protocol === "file:") {
    return "file 模式不可读";
  }

  if (ruleFetchStatus === "ready") {
    return "可读取";
  }

  if (ruleFetchStatus === "error") {
    return "读取失败";
  }

  return "等待检查";
}

function updateWorkspaceIndicators() {
  el.activeModel.textContent = getModelValue() || "—";
  el.lookupState.textContent = el.forceCardLookup.checked ? "已开启" : "已关闭";
  el.ruleFetchState.textContent = getRuleFetchLabel();
}

function escapeAttribute(text) {
  return escapeHtml(text).replaceAll("`", "&#96;");
}

function nowTime() {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getAudioContext() {
  if (audioContext) {
    return audioContext;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }

  audioContext = new AudioCtx();
  return audioContext;
}

async function unlockAudioContext() {
  if (!el.completionSound.checked) {
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Ignore resume errors caused by browser autoplay policies.
    }
  }
}

function playCompletionSound() {
  if (!el.completionSound.checked) {
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  if (ctx.state !== "running") {
    return;
  }

  const noteA = ctx.createOscillator();
  const noteB = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  noteA.type = "triangle";
  noteA.frequency.setValueAtTime(880, now);

  noteB.type = "sine";
  noteB.frequency.setValueAtTime(1174.66, now + 0.09);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.11, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  noteA.connect(gain);
  noteB.connect(gain);
  gain.connect(ctx.destination);

  noteA.start(now);
  noteA.stop(now + 0.15);
  noteB.start(now + 0.09);
  noteB.stop(now + 0.29);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSafeUrl(url) {
  return /^(https?:\/\/|mailto:)/i.test(url);
}

function formatInline(text) {
  let result = escapeHtml(text);

  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    const trimmedUrl = url.trim();
    if (!isSafeUrl(trimmedUrl)) {
      return `${label} (${trimmedUrl})`;
    }
    return `<a href="${escapeHtml(trimmedUrl)}" target="_blank" rel="noreferrer">${label}</a>`;
  });

  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");

  return result;
}

function renderTable(block) {
  const rows = block.split("\n").map((line) => line.trim());
  const headers = rows[0].split("|").map((cell) => cell.trim()).filter(Boolean);
  const bodyRows = rows.slice(2).map((row) => row.split("|").map((cell) => cell.trim()).filter(Boolean));

  const thead = `<thead><tr>${headers.map((cell) => `<th>${formatInline(cell)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${formatInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`;

  return `<div class="table-wrap"><table>${thead}${tbody}</table></div>`;
}

function renderList(block, ordered) {
  const lines = block.split("\n");
  const tag = ordered ? "ol" : "ul";
  const pattern = ordered ? /^\d+\.\s+/ : /^[-*+]\s+/;
  const items = lines.map((line) => `<li>${formatInline(line.replace(pattern, ""))}</li>`).join("");
  return `<${tag}>${items}</${tag}>`;
}

function renderMarkdownSafe(source) {
  const codeBlocks = [];
  const sourceWithTokens = source.replace(/```([\w-]+)?\n?([\s\S]*?)```/g, (match, language, code) => {
    const token = `@@CODEBLOCK_${codeBlocks.length}@@`;
    const label = language ? `<div class="code-label">${escapeHtml(language)}</div>` : "";
    codeBlocks.push(`<pre class="code-block">${label}<code>${escapeHtml(code.trim())}</code></pre>`);
    return token;
  });

  const blocks = sourceWithTokens.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const html = blocks.map((block) => {
    if (/^@@CODEBLOCK_\d+@@$/.test(block)) {
      return codeBlocks[Number(block.match(/\d+/)[0])];
    }

    if (/^#{1,4}\s+/.test(block)) {
      const lines = block.split("\n");
      return lines.map((line) => {
        if (!/^#{1,4}\s+/.test(line)) {
          return `<p>${formatInline(line)}</p>`;
        }
        const level = Math.min((line.match(/^#+/)[0] || "#").length, 4);
        const text = line.replace(/^#{1,4}\s+/, "");
        return `<h${level}>${formatInline(text)}</h${level}>`;
      }).join("");
    }

    if (/^(>\s?.+(\n|$))+/.test(block)) {
      const content = block.split("\n").map((line) => line.replace(/^>\s?/, "")).join("<br />");
      return `<blockquote>${formatInline(content)}</blockquote>`;
    }

    if (/^[-*_]{3,}$/.test(block.replace(/\s/g, ""))) {
      return "<hr />";
    }

    if (block.includes("|") && block.split("\n").length >= 2) {
      const lines = block.split("\n").map((line) => line.trim());
      if (/^\|?\s*[:-]+[-| :]*\|?\s*$/.test(lines[1])) {
        return renderTable(block);
      }
    }

    if (block.split("\n").every((line) => /^[-*+]\s+/.test(line))) {
      return renderList(block, false);
    }

    if (block.split("\n").every((line) => /^\d+\.\s+/.test(line))) {
      return renderList(block, true);
    }

    const paragraph = block.split("\n").map((line) => formatInline(line)).join("<br />");
    return `<p>${paragraph}</p>`;
  }).join("");

  return html.replace(/@@CODEBLOCK_(\d+)@@/g, (match, index) => codeBlocks[Number(index)] || "");
}

function chapterToRuleFile(chapter) {
  if (chapter >= 100 && chapter < 200) return 1;
  if (chapter >= 200 && chapter < 300) return 2;
  if (chapter >= 300 && chapter < 400) return 3;
  if (chapter >= 400 && chapter < 500) return 4;
  if (chapter >= 500 && chapter < 600) return 5;
  if (chapter >= 600 && chapter < 700) return 6;
  if (chapter >= 700 && chapter < 800) return 7;
  if (chapter >= 800 && chapter < 900) return 8;
  if (chapter >= 900) return 9;
  return null;
}

function extractRuleRefs(text) {
  const refs = [];
  let match;
  while ((match = RULE_REF_PATTERN.exec(text || "")) !== null) {
    refs.push(match[1]);
  }
  return [...new Set(refs)];
}

function ruleRefToBookmark(ruleRef) {
  return ruleRef.replace(/\./g, "-");
}

function buildRuleSourceHref(ruleFileNo, ruleRef) {
  return `https://mtgch.com/cr/${ruleFileNo}/#cr${ruleRefToBookmark(ruleRef)}`;
}

async function fetchRuleFile(ruleFileNo) {
  if (ruleFileCache.has(ruleFileNo)) {
    setRuleFetchStatus("ready");
    return ruleFileCache.get(ruleFileNo);
  }

  if (window.location.protocol === "file:") {
    setRuleFetchStatus("error");
    throw new Error("当前页面以 file:// 打开，浏览器会阻止本地规则文件读取。请使用静态服务器启动页面。");
  }

  const candidateUrls = [
    `../markdown/${ruleFileNo}.md`,
    `./markdown/${ruleFileNo}.md`,
    `/markdown/${ruleFileNo}.md`
  ];

  let lastError = "";
  let text = "";

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) {
        lastError = `${url} -> HTTP ${response.status}`;
        continue;
      }
      text = await response.text();
      if (text.trim()) {
        break;
      }
      lastError = `${url} -> 空文件`;
    } catch (err) {
      lastError = `${url} -> ${err?.message || "Failed to fetch"}`;
    }
  }

  if (!text) {
    setRuleFetchStatus("error");
    throw new Error(`无法读取规则文件 ${ruleFileNo}.md（${lastError || "无可用路径"}）`);
  }

  ruleFileCache.set(ruleFileNo, text);
  setRuleFetchStatus("ready");
  return text;
}

function extractRuleSnippet(fileText, ruleRef) {
  const bookmark = `cr${ruleRefToBookmark(ruleRef)}`;
  const lines = fileText.split(/\r?\n/);
  let targetIndex = lines.findIndex((line) => line.includes(bookmark));

  if (targetIndex < 0) {
    targetIndex = lines.findIndex((line) => line.includes(`<b>${ruleRef}</b>`));
  }

  if (targetIndex < 0) {
    return "未在规则文件中定位到该条文。";
  }

  const start = Math.max(0, targetIndex);
  const end = Math.min(lines.length, targetIndex + 8);
  const raw = lines.slice(start, end).join("\n").trim();
  const clean = raw.replace(/<[^>]*>/g, "").trim();
  return clean || "未提取到可显示内容。";
}

function renderEvidenceLoading(refs) {
  el.ruleEvidenceMeta.textContent = `已识别 ${refs.length} 条规则，正在读取原文…`;
  el.ruleEvidenceList.innerHTML = `<div class="evidence-empty">正在从 markdown 规则文件抓取原文片段…</div>`;
}

function renderEvidenceEmpty() {
  el.ruleEvidenceMeta.textContent = window.location.protocol === "file:"
    ? "当前页面以 file 模式打开，规则原文面板无法读取本地 markdown。"
    : "当前回复未识别到明确规则号。";
  el.ruleEvidenceList.innerHTML = `<div class="evidence-empty">请让 AI 在回答中包含类似 702.19 或 613.8 的规则号。</div>`;
}

function renderEvidenceItems(items) {
  el.ruleEvidenceMeta.textContent = `已展示 ${items.length} 条规则原文（来源：本地 markdown 规则文件）`;

  const grouped = items.reduce((acc, item) => {
    const chapter = String(item.ruleRef || "").split(".")[0] || "其他";
    if (!acc.has(chapter)) {
      acc.set(chapter, []);
    }
    acc.get(chapter).push(item);
    return acc;
  }, new Map());

  el.ruleEvidenceList.innerHTML = Array.from(grouped.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([chapter, chapterItems]) => `
      <section class="evidence-group">
        <header class="evidence-group-head">
          <h3>章节 ${chapter}</h3>
          <span>${chapterItems.length} 条引用</span>
        </header>
        <div class="evidence-group-list">
          ${chapterItems
            .map((item) => `
              <article class="evidence-item">
                <header class="evidence-head">
                  <span class="evidence-rule">CR ${item.ruleRef}</span>
                  <a class="evidence-file evidence-ext-link" href="${escapeAttribute(item.href || "#")}" target="_blank" rel="noreferrer">mtgch.com/cr/${item.ruleFile}</a>
                </header>
                <pre class="evidence-quote">${escapeHtml(item.snippet)}</pre>
              </article>
            `)
            .join("")}
        </div>
      </section>
    `)
    .join("");
}

async function updateRuleEvidencePanel(answerText) {
  const refs = extractRuleRefs(answerText);
  if (refs.length === 0) {
    renderEvidenceEmpty();
    return;
  }

  const limitedRefs = refs.slice(0, 8);
  renderEvidenceLoading(limitedRefs);

  const items = [];
  for (const ruleRef of limitedRefs) {
    const chapter = Number(ruleRef.split(".")[0]);
    const ruleFile = chapterToRuleFile(chapter);
    if (!ruleFile) {
      items.push({ ruleRef, ruleFile: "?", snippet: "无法映射到章节文件。", href: "#" });
      continue;
    }

    try {
      const fileText = await fetchRuleFile(ruleFile);
      const snippet = extractRuleSnippet(fileText, ruleRef);
      items.push({ ruleRef, ruleFile, snippet, href: buildRuleSourceHref(ruleFile, ruleRef) });
    } catch (err) {
      items.push({ ruleRef, ruleFile, snippet: `读取失败: ${err.message || "未知错误"}`, href: buildRuleSourceHref(ruleFile, ruleRef) });
    }
  }

  renderEvidenceItems(items);
}

function autoresizeComposer() {
  el.userInput.style.height = "auto";
  const nextHeight = Math.min(Math.max(el.userInput.scrollHeight, 92), 280);
  el.userInput.style.height = `${nextHeight}px`;
}

function ensureChatFilterEmptyState(visibleCount) {
  if (visibleCount > 0) {
    if (chatFilterEmptyNode) {
      chatFilterEmptyNode.remove();
      chatFilterEmptyNode = null;
    }
    return;
  }

  if (!chatFilterEmptyNode) {
    chatFilterEmptyNode = document.createElement("div");
    chatFilterEmptyNode.className = "chat-empty";
  }

  chatFilterEmptyNode.textContent = "当前筛选条件下没有匹配消息。可以清空搜索词，或关闭“只看含规则号的回复”。";
  el.chatList.appendChild(chatFilterEmptyNode);
}

function applyChatFilters() {
  const query = (el.chatSearch.value || "").trim().toLowerCase();
  const ruleOnly = el.ruleOnlyFilter.checked;
  const favoritesOnly = el.favoritesOnlyFilter.checked;
  const cards = Array.from(el.chatList.querySelectorAll(".msg"));
  const pinnedCount = messages.filter((m) => m.pinned).length;
  let visibleCount = 0;

  cards.forEach((card) => {
    const text = card.querySelector(".msg-body")?.textContent?.toLowerCase() || "";
    const msgIndex = Number(card.dataset.msgIndex);
    const isPinned = Boolean(messages[msgIndex]?.pinned);
    const role = Array.from(card.classList).find((name) => ["user", "assistant", "system"].includes(name)) || "";
    const hasRuleRef = RULE_REF_CHECK_PATTERN.test(card.querySelector(".msg-body")?.textContent || "");
    const roleMatches = !ruleOnly || (role === "assistant" && hasRuleRef);
    const pinMatches = !favoritesOnly || isPinned;
    const queryMatches = !query || text.includes(query);
    const isVisible = roleMatches && pinMatches && queryMatches;
    card.hidden = !isVisible;
    if (isVisible) {
      visibleCount += 1;
    }
  });

  if (!query && !ruleOnly && !favoritesOnly) {
    el.chatSearchMeta.textContent = `显示全部消息 · ${cards.length} 条 · 收藏 ${pinnedCount} 条`;
  } else {
    el.chatSearchMeta.textContent = `当前显示 ${visibleCount} / ${cards.length} 条 · 收藏 ${pinnedCount} 条`;
  }

  ensureChatFilterEmptyState(visibleCount);
}

function togglePinnedMessage(index) {
  const target = messages[index];
  if (!target) {
    return;
  }

  target.pinned = !target.pinned;
  const card = el.chatList.querySelector(`.msg[data-msg-index="${index}"]`);
  if (card) {
    card.classList.toggle("is-pinned", target.pinned);
    const pinBtn = card.querySelector(".pin-btn");
    if (pinBtn) {
      pinBtn.textContent = target.pinned ? "已收藏" : "收藏";
      pinBtn.setAttribute("aria-pressed", String(target.pinned));
      pinBtn.setAttribute("aria-label", target.pinned ? "取消收藏此条消息" : "收藏此条消息");
    }
  }

  saveMessages();
  applyChatFilters();
}

function createPinButton(index, pinned = false) {
  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "pin-btn";
  pinBtn.textContent = pinned ? "已收藏" : "收藏";
  pinBtn.setAttribute("aria-pressed", String(pinned));
  pinBtn.setAttribute("aria-label", pinned ? "取消收藏此条消息" : "收藏此条消息");
  pinBtn.addEventListener("click", () => {
    togglePinnedMessage(index);
  });
  return pinBtn;
}

function createEditButton(index) {
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "edit-btn";
  editBtn.textContent = "编辑";
  editBtn.setAttribute("aria-label", "在当前消息中直接编辑文本");
  editBtn.addEventListener("click", () => {
    enterUserMessageEditMode(index);
  });
  return editBtn;
}

function enterUserMessageEditMode(index) {
  const target = messages[index];
  if (!target || target.role !== "user") {
    return;
  }

  const card = el.chatList.querySelector(`.msg[data-msg-index="${index}"]`);
  if (!card || card.dataset.editing === "1") {
    return;
  }

  const bodyEl = card.querySelector(".msg-body");
  if (!bodyEl) {
    return;
  }

  const originalContent = target.content;
  card.dataset.editing = "1";

  const wrap = document.createElement("div");
  wrap.className = "user-edit-wrap";

  const textarea = document.createElement("textarea");
  textarea.value = originalContent;
  textarea.setAttribute("aria-label", "编辑用户消息");

  const actions = document.createElement("div");
  actions.className = "user-edit-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "ghost-btn";
  cancelBtn.textContent = "取消";

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.textContent = "保存";

  cancelBtn.addEventListener("click", () => {
    bodyEl.innerHTML = renderMarkdownSafe(originalContent);
    delete card.dataset.editing;
  });

  applyBtn.addEventListener("click", () => {
    const nextValue = textarea.value.trim();
    if (!nextValue) {
      setStatus("消息内容不能为空", "error");
      textarea.focus();
      return;
    }

    const now = nowTime();
    const isoNow = new Date().toISOString();
    target.content = nextValue;
    target.time = now;
    target.isoTime = isoNow;

    const timeEl = card.querySelector(".time");
    if (timeEl) {
      timeEl.textContent = now;
      timeEl.dateTime = isoNow;
    }

    bodyEl.innerHTML = renderMarkdownSafe(nextValue);
    delete card.dataset.editing;
    saveMessages();
    applyChatFilters();
    setStatus("已更新用户消息", "");
  });

  actions.append(cancelBtn, applyBtn);
  wrap.append(textarea, actions);

  bodyEl.innerHTML = "";
  bodyEl.appendChild(wrap);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function safeJsonSnippet(data, maxLength = 2400) {
  const text = JSON.stringify(data, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...` : text;
}

function normalizeCardCandidate(raw) {
  return raw
    .replace(/^[\s:：,，。.!?！？"“”'‘’\[\]【】()（）]+/, "")
    .replace(/[\s:：,，。.!?！？"“”'‘’\[\]【】()（）]+$/, "")
    .trim();
}

function parseCardNames(raw) {
  const names = (raw || "")
    .split(CARD_NAME_SEPARATOR)
    .map((item) => normalizeCardCandidate(item))
    .filter(Boolean);
  return [...new Set(names)];
}

function detectCardNamesForAutofill(text) {
  return detectCardCandidatesFromText(text).slice(0, MAX_LOOKUP_CARDS);
}

function maybeAutofillCardNamesFromInput() {
  if (!el.forceCardLookup.checked) {
    return;
  }

  const currentCardName = el.cardName.value.trim();
  if (currentCardName && currentCardName !== autoFilledCardName) {
    return;
  }

  const detected = detectCardNamesForAutofill(el.userInput.value || "");
  if (detected.length === 0) {
    if (currentCardName && currentCardName === autoFilledCardName) {
      el.cardName.value = "";
      autoFilledCardName = "";
      saveSettings();
    }
    return;
  }

  const nextValue = detected.join(" | ");
  if (nextValue !== currentCardName) {
    el.cardName.value = nextValue;
    autoFilledCardName = nextValue;
    saveSettings();
  }
}

function detectCardCandidatesFromText(text) {
  const seen = new Set();
  const candidates = [];

  const pushCandidate = (value) => {
    const cleaned = normalizeCardCandidate(value || "");
    if (cleaned.length < 2 || cleaned.length > 64) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(cleaned);
  };

  // 优先级 1：[[卡牌名]] — MTG 社区标准语法，零歧义
  for (const match of text.matchAll(/\[\[([^\]]{2,64})\]\]/g)) {
    pushCandidate(match[1]);
  }

  // 优先级 2：中文书名号与全角引号
  const wrappedPatterns = [
    /《([^》]{2,64})》/g,
    /「([^」]{2,64})」/g,
    /\u201c([^\u201d\n]{2,64})\u201d/g,
    /"([^"\n]{2,64})"/g
  ];
  wrappedPatterns.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) pushCandidate(match[1]);
  });

  // 优先级 3：线索词（可靠性较低，作为兜底）
  const cuePattern = /(?:卡牌|单卡|牌名|名为|叫做)\s*[:：]?\s*([A-Za-z][A-Za-z' -]{1,48}|[\u4e00-\u9fa5·]{2,24})/g;
  for (const match of text.matchAll(cuePattern)) pushCandidate(match[1]);

  // 优先级 4：全输入即卡名（仅当以上均无结果，且输入极短时）
  if (candidates.length === 0) {
    const compact = text.trim();
    if (compact.length >= 2 && compact.length <= 24 && /^[\u4e00-\u9fa5·A-Za-z' -]+$/.test(compact)) {
      pushCandidate(compact);
    }
  }

  return candidates;
}

async function fetchScryfallAutocomplete(query) {
  const key = `sf:${query.toLowerCase()}`;
  if (cardAutocompleteCache.has(key)) return cardAutocompleteCache.get(key);
  try {
    const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const names = (data.data || []).slice(0, 12);
    cardAutocompleteCache.set(key, names);
    return names;
  } catch {
    return [];
  }
}

async function fetchMtgchAutocomplete(query) {
  const key = `mtgch:${query.toLowerCase()}`;
  if (cardAutocompleteCache.has(key)) return cardAutocompleteCache.get(key);
  try {
    const res = await fetch(`https://mtgch.com/api/v1/result?q=${encodeURIComponent(query)}&page_size=12`);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items || [];
    const seen = new Set();
    const names = [];
    for (const item of items) {
      // 优先使用官方中文名，其次 zhs_name，再次英文名
      const zhName = item.atomic_official_name || item.zhs_name || item.atomic_translated_name;
      const candidate = zhName || item.name;
      if (candidate && !seen.has(candidate)) {
        seen.add(candidate);
        names.push(candidate);
      }
    }
    cardAutocompleteCache.set(key, names);
    return names;
  } catch {
    return [];
  }
}

async function fetchCardAutocomplete(query) {
  if (query.length < 2) return [];
  // 含中文字符 → MTGCH（支持中文卡名），否则 → Scryfall（英文卡名）
  const hasChinese = /[\u4e00-\u9fa5]/.test(query);
  return hasChinese ? fetchMtgchAutocomplete(query) : fetchScryfallAutocomplete(query);
}

function updateCardNameDatalist(names) {
  const datalist = document.getElementById("cardSuggestions");
  if (!datalist) return;
  datalist.innerHTML = names
    .map((n) => `<option value="${n.replace(/"/g, "&quot;")}"></option>`)
    .join("");
}

function triggerCardNameAutocomplete() {
  const query = el.cardName.value.trim();
  clearTimeout(cardAutocompleteTimer);
  if (query.length < 2) {
    updateCardNameDatalist([]);
    return;
  }
  cardAutocompleteTimer = setTimeout(async () => {
    const names = await fetchCardAutocomplete(query);
    updateCardNameDatalist(names);
  }, 280);
}

function formatScryfallCard(data) {
  const lines = [
    `name: ${data.name || ""}`,
    `mana_cost: ${data.mana_cost || ""}`,
    `type_line: ${data.type_line || ""}`,
    `oracle_text: ${data.oracle_text || ""}`,
    `power/toughness: ${data.power || ""}/${data.toughness || ""}`,
    `loyalty: ${data.loyalty || ""}`,
    `colors: ${(data.colors || []).join(", ")}`,
    `keywords: ${(data.keywords || []).join(", ")}`,
    `scryfall_uri: ${data.scryfall_uri || ""}`
  ];
  return lines.filter((line) => !line.endsWith(": ") && !line.endsWith("/")) .join("\n");
}

async function fetchScryfallCard(cardName) {
  const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.details || data?.object || `HTTP ${response.status}`);
  }
  return formatScryfallCard(data);
}

async function fetchMtgchCard(cardName) {
  const url = `https://mtgch.com/api/v1/result?q=${encodeURIComponent(cardName)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || `HTTP ${response.status}`);
  }
  return safeJsonSnippet(data);
}

async function buildExternalCardContext(userText) {
  if (!el.forceCardLookup.checked) {
    return "";
  }

  const manualCardNames = parseCardNames(el.cardName.value.trim());
  const detectedCandidates = manualCardNames.length > 0 ? [] : detectCardCandidatesFromText(userText || "");
  let cardNames = manualCardNames;

  if (cardNames.length === 0 && detectedCandidates.length > 0) {
    cardNames = [...new Set(detectedCandidates)];
    el.cardName.value = cardNames.join(" | ");
    saveSettings();
  }

  if (cardNames.length === 0) {
    return [
      "单卡查询约束：",
      "- 当前启用了‘涉及单卡时必须先查 Scryfall 和 MTGCH API’。",
      "- 但本次没有提供可识别的卡名，因此你不得凭记忆断言任何具体卡牌的 Oracle 文本、费用、类别或勘误。",
      "- 你可以提示用户在“单卡名称”框填入一个或多个卡名，并使用 | 分隔。"
    ].join("\n");
  }

  const truncated = cardNames.slice(0, MAX_LOOKUP_CARDS);
  const skippedCount = cardNames.length - truncated.length;

  const detectHint = manualCardNames.length > 0 ? "手动指定卡名" : "自动识别卡名";
  setStatus(`正在查询 Scryfall 与 MTGCH（${detectHint}，${truncated.length} 张）...`, "loading");

  const lookupResults = await Promise.all(
    truncated.map(async (cardName) => {
      const [scryfallResult, mtgchResult] = await Promise.allSettled([
        fetchScryfallCard(cardName),
        fetchMtgchCard(cardName)
      ]);
      return { cardName, scryfallResult, mtgchResult };
    })
  );

  const sections = [
    "多卡外部查询结果：",
    `查询卡名: ${truncated.join(" | ")}`,
    `卡名来源: ${manualCardNames.length > 0 ? "用户手动输入" : "系统自动识别"}`,
    "回答要求：你必须优先依据以下查询结果回答，不得只凭记忆复述卡牌文本。"
  ];

  if (skippedCount > 0) {
    sections.push(`说明：本次共提供 ${cardNames.length} 张卡，当前只查询前 ${MAX_LOOKUP_CARDS} 张，其余 ${skippedCount} 张被暂时忽略。`);
  }

  lookupResults.forEach((result, index) => {
    sections.push("", `--- 第 ${index + 1} 张：${result.cardName} ---`);

    if (result.scryfallResult.status === "fulfilled") {
      sections.push("[Scryfall]", result.scryfallResult.value);
    } else {
      sections.push(`[Scryfall 查询失败] ${result.scryfallResult.reason?.message || "未知错误"}`);
    }

    if (result.mtgchResult.status === "fulfilled") {
      sections.push("[MTGCH API]", `json\n${result.mtgchResult.value}`);
    } else {
      sections.push(`[MTGCH API 查询失败] ${result.mtgchResult.reason?.message || "未知错误"}`);
    }
  });

  sections.push(
    "",
    "约束补充：如果两边结果存在冲突，请明确指出冲突点，并优先把英文 Oracle 与中文资料分开说明；若涉及多卡互动，请按卡牌逐一引用后再给结论。"
  );

  return sections.join("\n");
}

function setStatus(text, type = "") {
  el.status.textContent = text;
  el.status.className = `status ${type}`.trim();
}

function createLoadingBubble() {
  const node = el.msgTpl.content.cloneNode(true);
  const wrapper = node.querySelector(".msg");
  const roleEl = node.querySelector(".role");
  const timeEl = node.querySelector(".time");
  const bodyEl = node.querySelector(".msg-body");

  wrapper.classList.add("assistant", "is-loading-bubble");
  roleEl.textContent = "Gemini";
  timeEl.textContent = "生成中";
  timeEl.dateTime = new Date().toISOString();
  bodyEl.innerHTML = `
    <div class="loader-box" aria-hidden="true">
      <span class="loader-dot"></span>
      <span class="loader-dot"></span>
      <span class="loader-dot"></span>
    </div>
    <p class="loader-text">正在生成回复，请稍候…</p>
  `;

  return wrapper;
}

function showLoadingBubble() {
  clearLoadingBubble();
  activeLoadingBubble = createLoadingBubble();
  el.chatList.appendChild(activeLoadingBubble);
  el.chatList.scrollTop = el.chatList.scrollHeight;
}

function clearLoadingBubble() {
  if (!activeLoadingBubble) {
    return;
  }
  activeLoadingBubble.remove();
  activeLoadingBubble = null;
}

function beginGenerationUI(mode) {
  isBusy = true;
  activeGenerationMode = mode;
  el.sendBtn.disabled = true;
  el.sendBtn.textContent = mode === "regen" ? "重生成中…" : (mode === "retry" ? "重试中…" : SEND_BUTTON_LOADING_TEXT);
  el.stopBtn.hidden = false;
  el.retryBtn.hidden = true;
  if (mode === "send" || mode === "retry") {
    showLoadingBubble();
  }
  setStatus(mode === "regen" ? "Gemini 正在重新生成…" : (mode === "retry" ? "Gemini 正在重试请求…" : "Gemini 正在思考…"), "loading");
}

function endGenerationUI(nextStatusText = "请求成功", nextStatusType = "") {
  isBusy = false;
  activeGenerationMode = "";
  activeRequestController = null;
  clearLoadingBubble();
  el.sendBtn.disabled = false;
  el.sendBtn.textContent = SEND_BUTTON_IDLE_TEXT;
  el.stopBtn.hidden = true;
  el.retryBtn.hidden = !lastFailedUserText;
  setStatus(nextStatusText, nextStatusType);
}

function stopActiveGeneration() {
  if (!activeRequestController) {
    return;
  }
  activeRequestController.abort();
}

function getLatestUserPromptBefore(index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      return messages[i].content;
    }
  }
  return "";
}

function updateAssistantMessageAt(index, content) {
  const msg = messages[index];
  if (!msg || msg.role !== "assistant") {
    return;
  }

  const now = nowTime();
  const isoNow = new Date().toISOString();
  msg.content = content;
  msg.time = now;
  msg.isoTime = isoNow;

  const card = el.chatList.querySelector(`.msg[data-msg-index="${index}"]`);
  if (card) {
    const bodyEl = card.querySelector(".msg-body");
    const timeEl = card.querySelector(".time");
    if (bodyEl) {
      bodyEl.innerHTML = renderMarkdownSafe(content);
    }
    if (timeEl) {
      timeEl.textContent = now;
      timeEl.dateTime = isoNow;
    }
  }

  saveMessages();
  updateRuleEvidencePanel(content);
}

function setAssistantRegeneratingState(index, isRegenerating) {
  const card = el.chatList.querySelector(`.msg[data-msg-index="${index}"]`);
  if (!card) {
    return;
  }
  card.classList.toggle("is-regenerating", isRegenerating);
}

async function regenerateAssistantMessage(index) {
  if (isBusy) {
    return;
  }

  const target = messages[index];
  if (!target || target.role !== "assistant") {
    return;
  }

  const prompt = getLatestUserPromptBefore(index);
  if (!prompt) {
    addMessage("system", "无法重新生成：没有找到对应的用户提问。", true);
    return;
  }

  beginGenerationUI("regen");
  setAssistantRegeneratingState(index, true);
  activeRequestController = new AbortController();

  try {
    const externalContext = await buildExternalCardContext(prompt);
    const answer = await callAPI(externalContext, activeRequestController.signal);
    updateAssistantMessageAt(index, answer);
    playCompletionSound();
    endGenerationUI("重生成完成", "");
  } catch (err) {
    if (err?.name === "AbortError") {
      endGenerationUI("已停止生成", "");
    } else {
      endGenerationUI(err.message || "重生成失败", "error");
      addMessage("system", `重生成错误: ${err.message || "未知错误"}`);
    }
  } finally {
    setAssistantRegeneratingState(index, false);
  }
}

function saveSettings() {
  const payload = {
    baseUrl: el.baseUrl.value.trim(),
    apiKey: el.apiKey.value.trim(),
    model: getModelValue(),
    temperature: el.temperature.value,
    maxTokens: el.maxTokens.value,
    cardName: el.cardName.value.trim(),
    forceCardLookup: el.forceCardLookup.checked,
    completionSound: el.completionSound.checked,
    systemPrompt: el.systemPrompt.value
  };
  localStorage.setItem(LS_KEY, JSON.stringify(payload));
}

function loadSettings() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    el.systemPrompt.value = "你是一个精准、简洁、结构化的 AI 助手。";
    return;
  }

  try {
    const data = JSON.parse(raw);
    el.baseUrl.value = data.baseUrl || "";
    el.apiKey.value = data.apiKey || "";
    el.model.value = data.model || "";
    el.temperature.value = data.temperature || "0.7";
    el.maxTokens.value = data.maxTokens || "2048";
    el.cardName.value = data.cardName || "";
    el.forceCardLookup.checked = data.forceCardLookup !== false;
    el.completionSound.checked = data.completionSound !== false;
    el.systemPrompt.value = data.systemPrompt || "";
  } catch {
    setStatus("本地设置损坏，已忽略", "error");
  }
}

function saveMessages() {
  localStorage.setItem(MSG_KEY, JSON.stringify(messages));
}

function loadMessages() {
  const raw = localStorage.getItem(MSG_KEY);
  if (!raw) {
    addMessage("system", "欢迎使用 AI 规则助手。请先填写 API 基础 URL 和 Key，获取模型列表后选择模型，再开始对话。", false);
    return;
  }

  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      data.forEach((msg) => addMessage(msg.role, msg.content, false, msg.time, msg.isoTime, msg.pinned));
    }
  } catch {
    addMessage("system", "历史记录损坏，已重置。", false);
  }
}

function addMessage(role, content, save = true, time = nowTime(), isoTime = new Date().toISOString(), pinned = false) {
  const node = el.msgTpl.content.cloneNode(true);
  const wrapper = node.querySelector(".msg");
  const roleEl = node.querySelector(".role");
  const timeEl = node.querySelector(".time");
  const bodyEl = node.querySelector(".msg-body");

  wrapper.classList.add(role);

  const roleMap = {
    user: "你",
    assistant: "AI",
    system: "系统"
  };

  roleEl.textContent = roleMap[role] || role;
  timeEl.textContent = time;
  timeEl.dateTime = isoTime;
  bodyEl.innerHTML = renderMarkdownSafe(content);
  messages.push({ role, content, time, isoTime, pinned: Boolean(pinned) });
  const index = messages.length - 1;
  wrapper.dataset.msgIndex = String(index);
  wrapper.classList.toggle("is-pinned", Boolean(pinned));

  const head = wrapper.querySelector(".msg-head");
  if (head && role !== "system") {
    head.appendChild(createPinButton(index, Boolean(pinned)));
    if (role === "user") {
      head.appendChild(createEditButton(index));
    }
  }

  if (role === "assistant") {
    const regenBtn = document.createElement("button");
    regenBtn.type = "button";
    regenBtn.className = "regen-btn";
    regenBtn.textContent = "重新生成";
    regenBtn.setAttribute("aria-label", "重新生成这一条 AI 回复");
    regenBtn.addEventListener("click", async () => {
      await unlockAudioContext();
      await regenerateAssistantMessage(index);
    });
    if (head) {
      head.appendChild(regenBtn);
    }

    updateRuleEvidencePanel(content);
  }

  el.chatList.appendChild(node);
  el.chatList.scrollTop = el.chatList.scrollHeight;
  applyChatFilters();

  if (save) {
    saveMessages();
  }
}

function resetChat() {
  messages = [];
  el.chatList.innerHTML = "";
  addMessage("system", "对话已清空。", false);
  saveMessages();
  applyChatFilters();
}

function getBaseUrl() {
  return el.baseUrl.value.trim().replace(/\/+$/, "");
}

function buildMessages(externalContext = "") {
  const msgs = [];

  const sysPrompt = el.systemPrompt.value.trim() || "你是一个有帮助的 AI 助手。";
  msgs.push({ role: "system", content: sysPrompt });

  messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .forEach((m) => msgs.push({ role: m.role, content: m.content }));

  if (externalContext) {
    msgs.push({ role: "user", content: externalContext });
  }

  return msgs;
}

async function callAPI(externalContext = "", signal) {
  const apiKey = el.apiKey.value.trim();
  const baseUrl = getBaseUrl();
  const model = getModelValue();

  if (!baseUrl) throw new Error("请先填写 API 基础 URL");
  if (!apiKey)  throw new Error("请先填写 API Key");
  if (!model)   throw new Error("请先选择或填写模型名称");

  const url = `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(externalContext),
      temperature: Number(el.temperature.value),
      max_tokens: Number(el.maxTokens.value)
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || `请求失败: HTTP ${response.status}`;
    throw new Error(msg);
  }

  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("API 没有返回可读文本，请重试。");
  }

  return text;
}

async function fetchModels() {
  const baseUrl = getBaseUrl();
  const apiKey = el.apiKey.value.trim();

  if (!baseUrl) { setStatus("请先填写 API 基础 URL", "error"); return; }
  if (!apiKey)  { setStatus("请先填写 API Key", "error"); return; }

  el.fetchModelsBtn.disabled = true;
  el.fetchModelsBtn.textContent = "获取中…";

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `HTTP ${response.status}`);
    }

    const modelIds = (data?.data || [])
      .map((m) => m.id || m.model || "")
      .filter(Boolean)
      .sort();

    const datalist = document.getElementById("modelOptions");
    datalist.innerHTML = modelIds.map((id) => `<option value="${escapeAttribute(id)}"></option>`).join("");

    if (modelIds.length > 0) {
      if (!el.model.value.trim()) {
        el.model.value = modelIds[0];
      }
      saveSettings();
      updateWorkspaceIndicators();
      setStatus(`已获取 ${modelIds.length} 个模型`, "");
    } else {
      setStatus("未获取到模型列表，请检查 URL 或 Key", "error");
    }
  } catch (err) {
    setStatus(`获取模型失败：${err.message || "网络错误"}`, "error");
  } finally {
    el.fetchModelsBtn.disabled = false;
    el.fetchModelsBtn.textContent = "获取模型";
  }
}

async function handleSend(userText) {
  if (isBusy) {
    return;
  }

  beginGenerationUI("send");
  activeRequestController = new AbortController();

  try {
    addMessage("user", userText);
    saveSettings();
    const externalContext = await buildExternalCardContext(userText);
    const answer = await callAPI(externalContext, activeRequestController.signal);
    clearLoadingBubble();
    addMessage("assistant", answer);
    playCompletionSound();
    lastFailedUserText = "";
    endGenerationUI("请求成功", "");
  } catch (err) {
    if (err?.name === "AbortError") {
      endGenerationUI("已停止生成", "");
    } else {
      lastFailedUserText = userText;
      endGenerationUI(err.message || "请求失败", "error");
      addMessage("system", `错误: ${err.message || "未知错误"}\n\n可点击“重试失败发送”立即重试。`);
    }
  }
}

async function retryFailedSend() {
  if (isBusy || !lastFailedUserText) {
    return;
  }

  beginGenerationUI("retry");
  activeRequestController = new AbortController();

  try {
    const externalContext = await buildExternalCardContext(lastFailedUserText);
    const answer = await callAPI(externalContext, activeRequestController.signal);
    clearLoadingBubble();
    addMessage("assistant", answer);
    playCompletionSound();
    lastFailedUserText = "";
    endGenerationUI("重试成功", "");
  } catch (err) {
    if (err?.name === "AbortError") {
      endGenerationUI("已停止生成", "");
    } else {
      endGenerationUI(err.message || "重试失败", "error");
      addMessage("system", `重试错误: ${err.message || "未知错误"}`);
    }
  }
}

function bindEvents() {
  el.temperature.addEventListener("input", () => {
    el.temperatureValue.textContent = Number(el.temperature.value).toFixed(1);
    saveSettings();
  });

  [el.baseUrl, el.apiKey, el.model, el.maxTokens, el.cardName, el.systemPrompt].forEach((item) => {
    item.addEventListener("change", () => {
      saveSettings();
      updateWorkspaceIndicators();
    });
  });

  el.baseUrl.addEventListener("input", saveSettings);

  el.fetchModelsBtn.addEventListener("click", fetchModels);

  el.model.addEventListener("input", () => {
    saveSettings();
    updateWorkspaceIndicators();
  });
  el.cardName.addEventListener("input", () => {
    autoFilledCardName = "";
    saveSettings();
    triggerCardNameAutocomplete();
  });
  el.forceCardLookup.addEventListener("change", () => {
    saveSettings();
    updateWorkspaceIndicators();
  });
  el.completionSound.addEventListener("change", saveSettings);
  el.userInput.addEventListener("input", () => {
    maybeAutofillCardNamesFromInput();
    autoresizeComposer();
  });
  el.stopBtn.addEventListener("click", stopActiveGeneration);
  el.retryBtn.addEventListener("click", retryFailedSend);
  el.chatSearch.addEventListener("input", applyChatFilters);
  el.favoritesOnlyFilter.addEventListener("change", applyChatFilters);
  el.ruleOnlyFilter.addEventListener("change", applyChatFilters);
  el.clearSearchBtn.addEventListener("click", () => {
    el.chatSearch.value = "";
    el.favoritesOnlyFilter.checked = false;
    el.ruleOnlyFilter.checked = false;
    applyChatFilters();
    el.chatSearch.focus();
  });

  el.promptSuggestions.forEach((button) => {
    button.addEventListener("click", () => {
      const prompt = button.dataset.prompt || "";
      el.userInput.value = prompt;
      el.userInput.focus();
      maybeAutofillCardNamesFromInput();
      autoresizeComposer();
      setStatus("已填入示例问题，可直接发送或继续修改", "");
    });
  });

  el.insertPromptBtn.addEventListener("click", () => {
    el.systemPrompt.value = [
      "你是万智牌完整规则中文助手。",
      "回答必须：",
      "1. 先给结论。",
      "2. 再引用具体规则号（如 702.19、613.1）。",
      "3. 若有多个效应，按时序逐步解释。",
      "4. 涉及单卡时，必须优先基于 Scryfall 与 MTGCH API 查询结果，不得只凭记忆断言 Oracle 文本。",
      "5. 对不确定内容明确标注假设。"
    ].join("\n");
    saveSettings();
    setStatus("已填入模板提示词", "");
  });

  el.clearChatBtn.addEventListener("click", () => {
    if (window.confirm("确定清空当前对话吗？")) {
      resetChat();
      setStatus("对话已清空", "");
    }
  });

  el.chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = el.userInput.value.trim();
    if (!text) {
      return;
    }
    await unlockAudioContext();
    el.userInput.value = "";
    autoresizeComposer();
    await handleSend(text);
  });

  el.userInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const text = el.userInput.value.trim();
      if (!text) {
        return;
      }
      await unlockAudioContext();
      el.userInput.value = "";
      autoresizeComposer();
      await handleSend(text);
    }
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      el.chatSearch.focus();
      el.chatSearch.select();
    }
  });
}

function init() {
  loadSettings();
  el.sendBtn.textContent = SEND_BUTTON_IDLE_TEXT;
  el.temperatureValue.textContent = Number(el.temperature.value).toFixed(1);
  updateWorkspaceIndicators();
  bindEvents();
  loadMessages();
  autoresizeComposer();
  applyChatFilters();
  el.retryBtn.hidden = true;

  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (latestAssistant) {
    updateRuleEvidencePanel(latestAssistant.content);
  } else {
    renderEvidenceEmpty();
  }
}

init();
