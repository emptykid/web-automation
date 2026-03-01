---
name: web-automation
description: Automate various web platforms through CLI commands powered by Playwright. Use when users want to search questions, post answers, browse "waiting for answer" lists, or perform any web operations through natural language commands. Currently supports Zhihu operations.
---

# Web Automation Skill

Automate web platform operations through natural language by calling CLI commands.

## Overview

This skill enables LLM to operate Zhihu by running CLI commands that use Playwright browser automation:

1. **Search** — find questions matching a keyword
2. **Answer** — post an answer to a question (by URL or keyword)
3. **Waiting** — fetch the "waiting for your answer" question list
4. **Recommend** — fetch the "recommended for you" question list from Baidu Zhidao
5. **Save Session** — one-time login to save credentials (run by user manually)

## Prerequisites

Install the package globally:

```bash
npm install -g web-automation
```

Or use `npx`:

```bash
npx web-automation zhihu:search --keyword "..."
```

### One-Time Login Setup

Before running any command, the user must save a login session **once**:

```bash
npm run zhihu:save-session
```

This opens a Chrome window. The user logs in manually (supports QR code, SMS, etc.). The session is saved to `.session/` and reused by all subsequent commands.

> If a command outputs `❌ 未登录`, the user needs to run `zhihu-save-session` again.

## Commands

### 1. Search Questions — `zhihu:search`

Search Zhihu for questions matching a keyword.

```bash
npm run zhihu:search -- --keyword "<keyword>" [--count <n>]
```

**Parameters:**

- `--keyword` — search keyword (required, default: `知乎自动化`)
- `--count` — max number of results to return (default: `10`)

**Example:**

```bash
zhihu-search --keyword "人工智能" --count 5
zhihu-search --keyword "如何学习编程"
```

**Output format:**

```
🔍 搜索关键词: "人工智能"，最多显示 5 条结果

📋 搜索结果 (共 5 条):

1. [question] 人工智能会取代哪些职业？
   🔗 https://www.zhihu.com/question/123456

2. [question] 如何入门人工智能？
   🔗 https://www.zhihu.com/question/234567
...
```

Each result has:
- Index number
- Type tag: `[question]` or `[article]`
- Title
- URL (use this URL to post an answer)

---

### 2. Post Answer — `zhihu:answer`

Post an answer to a Zhihu question. The question can be specified by URL or found via keyword search.

```bash
npm run zhihu:answer -- --url "<question_url>" --content "<answer_text>" [--image "<filename>"] [--dry-run]
# or find question by keyword:
npm run zhihu:answer -- --keyword "<keyword>" --content "<answer_text>"
```

**Parameters:**

- `--url` — direct URL to the Zhihu question page (mutually exclusive with `--keyword`)
- `--keyword` — search keyword; automatically picks the first matching question (mutually exclusive with `--url`)
- `--content` — answer text (required)
- `--image` — fuzzy filename of an image from personal Zhihu material library to insert (optional)
- `--dry-run` — open editor and fill content but do NOT submit; keeps browser open 30s for review

**Examples:**

```bash
# Post by URL
zhihu-answer \
  --url "https://www.zhihu.com/question/123456" \
  --content "这是我的回答内容"

# Post by keyword search
zhihu-answer \
  --keyword "如何学习 Python" \
  --content "建议从官方文档开始，配合练习项目..."

# Post with image from personal materials
zhihu-answer \
  --url "https://www.zhihu.com/question/123456" \
  --content "这是我的回答" \
  --image "课程截图"

# Preview only (dry-run)
zhihu-answer \
  --keyword "人工智能" \
  --content "测试回答" \
  --dry-run
```

**Output on success:**

```
✅ 已验证登录状态
📖 打开问题: https://www.zhihu.com/question/123456
📌 问题标题: <title>
✍️  开始撰写并发布回答...
🎉 回答发布成功！
```

**Output on failure:**

```
❌ 回答发布失败，请手动检查浏览器状态
```

> **Note:** For answers longer than 200 characters, the skill automatically uses clipboard paste (faster); shorter answers use simulated typing (more human-like).

---

### 3. Waiting for Answer List — `zhihu:waiting`

Fetch questions from the "waiting for your answer" (等你来答) page.

```bash
npm run zhihu:waiting [-- --count <n>] [-- --type <category>]
```

**Parameters:**

- `--count` — number of questions to fetch (default: `10`)
- `--type` — question category (default: `recommend`):
  - `recommend` — recommended for you (为你推荐)
  - `invite` — invited to answer (邀请回答)
  - `new` — newest questions (最新问题)
  - `hot` — popular questions (人气问题)

**Examples:**

```bash
# Default: top 10 recommended
zhihu-waiting

# Top 5 invited questions
zhihu-waiting --type invite --count 5

# Top 20 hot questions
zhihu-waiting --type hot --count 20
```

**Output format:**

```
📋 获取「等你来答」列表 — 为你推荐，最多 10 条

✅ 已验证登录状态

共获取到 10 个问题：

1. 哪款输入法最适合日常办公和社交？
   📊 2,243 浏览 · 27 回答 · 29 关注 · 1 年前的提问
   🔗 https://www.zhihu.com/question/123456

2. 如何快速提高打字速度？
   📊 58,962 浏览 · 1,843 回答 · 1,859 关注 · 2 个月前的提问
   🔗 https://www.zhihu.com/question/234567
...
```

Each question has:
- Index number
- Title
- Stats (views, answers, followers, age)
- URL (can be passed to `zhihu-answer --url`)

---

### 4. Recommend Question List — `zhidao:recommendquestion`

Fetch the "recommended for you" (为我推荐) question list from Baidu Zhidao's personal homepage.

```bash
npm run zhidao:recommendquestion [-- --keyword "<keyword>"] [-- --count <n>]
```

**Parameters:**

- `--keyword` — filter questions by typing a keyword into the on-page search box (optional)
- `--count` — max number of results to return (default: `20`)

**Examples:**

```bash
# Default: top 20 recommended questions
npm run zhidao:recommendquestion

# Filter by keyword
npm run zhidao:recommendquestion -- --keyword "健康"

# Limit count
npm run zhidao:recommendquestion -- --count 10

# Keyword + count
npm run zhidao:recommendquestion -- --keyword "编程" --count 5
```

**Output format:**

```
📋 获取「为我推荐」问题列表，最多显示 20 条

✅ 已验证登录状态

共获取到 20 个推荐问题：

1. 永生高血压治疗。高血压血遗传病。
   🔗 https://zhidao.baidu.com/question/1317166535946393259.html

2. 如何快速学会编程？
   🔗 https://zhidao.baidu.com/question/...
```

Each result has:
- Index number
- Title
- URL (can be passed to `zhidao:answer --url`)

---

## Typical Workflow

**Scenario: Find a trending question and post an LLM-generated answer**

```bash
# Step 1: Get hot questions
zhihu-waiting --type hot --count 5

# Step 2: Pick a question URL from the output, then post an answer
zhihu-answer \
  --url "https://www.zhihu.com/question/123456" \
  --content "<LLM-generated answer here>"
```

**Scenario: Search and answer by topic**

```bash
# Step 1: Search for questions on a topic
zhihu-search --keyword "机器学习入门" --count 3

# Step 2: Post answer to the first result URL
zhihu-answer \
  --url "https://www.zhihu.com/question/XXXXX" \
  --content "<answer>"
```

---

## Error Handling

| Error message | Cause | Resolution |
|---|---|---|
| `❌ 未登录` | No valid session | Run `zhihu-save-session` |
| `❌ 未找到关于 "..." 的问题` | Keyword didn't match any question | Try a different keyword |
| `❌ 回答发布失败` | Editor issue or network error | Retry or use `--dry-run` to inspect |
| `😕 未获取到问题` | Page structure changed or not logged in | Re-login, then retry |

> All commands require Google Chrome to be installed at `/Applications/Google Chrome.app`.
> Set `HEADLESS=false` (default) to see the browser window during operation.
