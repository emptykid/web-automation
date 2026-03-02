<div align="center">

# 🤖 Web Automation

**基于 Playwright 的多平台自动化操作工具**

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.58-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

*搜索 · 回答 · 提问 · 评论 · 赞同 · 关注 · 发布文章 · Session 持久化*

</div>

---

## ✨ 功能特性

### 知乎（zhihu.com）

- 🔍 **智能搜索** — 按关键词搜索问题，结构化输出结果
- ✍️ **自动回答** — 通过 URL 或关键词定位问题并发布回答，支持插入图片素材
- 📝 **发布文章** — 自动填写标题、正文，在指定位置插入图片，上传封面，一键发布专栏文章
- 📋 **等你来答** — 获取推荐 / 邀请 / 最新 / 热门问题列表
- ❓ **发起提问** — 在知乎提问，支持填写题目说明（选填），一键发布
- 👥 **关注 / 取消关注** — 通过用户 URL ID 关注或取消关注指定用户
- 💬 **评论回答** — 打开指定回答，展开评论区，输入内容并发布
- 👍 **赞同回答** — 打开指定回答，点击赞同按钮，自动检测是否已赞同

### 百度知道（zhidao.baidu.com）

- 🔍 **搜索问题** — 按关键词搜索问题，获取第一页问题列表
- ✍️ **回答问题** — 通过 URL 或关键词定位问题，自动填写并提交回答
- ❓ **发起提问** — 填写标题、说明，支持匿名提问，一键提交

### 通用能力

- 🔐 **Session 持久化** — 各站点独立 Session，一次登录持久复用
- 🛡️ **反检测机制** — 使用真实 Chrome 浏览器 + 模拟人工操作节奏
- 🧪 **Dry-run 模式** — 预览操作流程，不实际发布

---

## 🚀 快速开始

### 1. 安装依赖

```bash
git clone git@github.com:emptykid/web-automation.git
cd web-automation
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```ini
# 知乎账号（可选，也可以直接在浏览器中手动登录）
ZHIHU_USERNAME=your_phone_or_email
ZHIHU_PASSWORD=your_password

# 浏览器显示模式
HEADLESS=false   # false = 显示浏览器窗口（推荐），true = 后台运行

# 操作速度（毫秒），数值越大越像人工操作
SLOW_MO=100
```

### 3. 保存登录状态

> **首次使用某个站点前必须执行，各站点独立保存，只需执行一次。**

```bash
# 知乎
npm run zhihu:save-session

# 百度知道
npm run zhidao:save-session
```

浏览器会自动打开对应站点的登录页 → 在浏览器中 **手动完成登录**（支持扫码、短信验证码等）→ 脚本自动检测并保存 Session。

> ⚠️ `.session/` 目录包含各站点登录凭证，已加入 `.gitignore`，不会提交到仓库。

---

## 📖 使用指南

---

## 知乎（Zhihu）

### 🔍 搜索问题

```bash
npm run zhihu:search -- --keyword "关键词" [--count 数量]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--keyword` | 搜索关键词 | `知乎自动化` |
| `--count` | 返回结果数量 | `10` |

<details>
<summary>📌 示例 & 输出</summary>

```bash
# 搜索"人工智能"，返回前 5 条结果
npm run zhihu:search -- --keyword "人工智能" --count 5
```

```
🔍 搜索关键词: "人工智能"，最多显示 5 条结果

📋 搜索结果 (共 5 条):

1. [question] 人工智能会取代哪些职业？
   🔗 https://www.zhihu.com/question/123456

2. [question] 如何入门人工智能？
   🔗 https://www.zhihu.com/question/234567
```

</details>

---

### ✍️ 发布回答

```bash
# 通过问题 URL 发布
npm run zhihu:answer -- --url "问题URL" --content "回答内容"

# 通过关键词搜索后发布
npm run zhihu:answer -- --keyword "搜索关键词" --content "回答内容"
```

| 参数 | 说明 | 必填 |
|------|------|------|
| `--url` | 知乎问题页面 URL（与 `--keyword` 二选一） | 二选一 |
| `--keyword` | 搜索关键词，自动匹配第一个问题（与 `--url` 二选一） | 二选一 |
| `--content` | 回答内容 | ✅ |
| `--image` | 插入个人素材中的图片，值为文件名（支持模糊匹配） | ❌ |
| `--dry-run` | 预览模式，只打开页面不实际发布 | ❌ |

<details>
<summary>📌 示例</summary>

```bash
# 通过问题 URL 直接发布回答
npm run zhihu:answer -- \
  --url "https://www.zhihu.com/question/123456" \
  --content "这是我的回答内容"

# 通过关键词搜索后发布
npm run zhihu:answer -- \
  --keyword "如何学习 Python" \
  --content "建议从官方文档开始，配合练习项目..."

# 带图片的回答（插入个人素材中文件名含「课程」的图片）
npm run zhihu:answer -- \
  --url "https://www.zhihu.com/question/123456" \
  --content "这是我的回答内容" \
  --image "课程"

# Dry-run：只打开问题页面，不实际发布（用于验证）
npm run zhihu:answer -- \
  --keyword "人工智能" \
  --content "测试回答" \
  --dry-run
```

</details>

> 💡 回答超过 200 字时自动使用粘贴方式输入（更快）；200 字以内使用模拟打字（更像人工操作）。

---

### 📝 发布专栏文章

在知乎专栏发布图文文章，支持在正文任意位置插入本地图片，以及上传文章封面。

```bash
npm run zhihu:article -- --title "标题" --content "正文内容" [选项]
```

| 参数 | 说明 | 必填 |
|------|------|------|
| `--title` | 文章标题 | ✅ |
| `--content` | 正文内容，支持 `[IMAGE:路径]` 内联图片标记 | ✅ |
| `--image` | 追加到正文末尾的图片路径（可多次使用） | ❌ |
| `--cover` | 文章封面图片路径（本地文件） | ❌ |
| `--topic` | 文章话题标签（可多次使用，例如 `--topic "教育" --topic "职场"`） | ❌ |
| `--column` | 要发布到的专栏名称（与知乎后台一致，不填则发布到个人主页） | ❌ |
| `--dry-run` | 预览模式，填入内容但不实际发布 | ❌ |

#### 在正文指定位置插入图片

在 `--content` 中用 `[IMAGE:路径]` 标记图片插入的位置，脚本会按顺序将文字和图片交替写入编辑器：

```bash
npm run zhihu:article -- \
  --title "课程体系介绍" \
  --content "我们的课程涵盖多个方向，以下逐一介绍。

一、基础指法练习
适合零基础学员，从键盘基本功开始。
[IMAGE:./Assets/基础指法练习课程列表.png]

二、编程课程
系统学习编程思维与实战项目。
[IMAGE:./Assets/编程课程列表.png]

欢迎扫码了解更多详情。" \
  --cover "./Assets/语文课内同步课程列表.png"
```

#### 其他示例

<details>
<summary>📌 更多示例</summary>

```bash
# 仅发布纯文字文章
npm run zhihu:article -- \
  --title "我的第一篇文章" \
  --content "这是文章正文内容..."

# 图片追加到正文末尾（不指定位置）
npm run zhihu:article -- \
  --title "产品介绍" \
  --content "以下是产品截图：" \
  --image "./Assets/图1.png" \
  --image "./Assets/图2.png" \
  --cover "./Assets/封面.png"

# 添加话题标签
npm run zhihu:article -- \
  --title "我的文章" \
  --content "正文内容..." \
  --topic "编程" \
  --topic "职场"

# 发布到指定专栏（专栏名称需与知乎后台一致）
npm run zhihu:article -- \
  --title "我的文章" \
  --content "正文内容..." \
  --column "我的专栏"

# 话题 + 专栏 + 封面一起配置
npm run zhihu:article -- \
  --title "完整配置示例" \
  --content "正文..." \
  --cover "./Assets/封面.png" \
  --topic "教育" \
  --column "我的专栏"

# Dry-run：填入内容预览效果，不发布（按 Ctrl+C 退出）
npm run zhihu:article -- \
  --title "测试文章" \
  --content "第一段[IMAGE:./Assets/图1.png]第二段" \
  --cover "./Assets/封面.png" \
  --topic "编程" \
  --dry-run
```

</details>

> 💡 正文超过 200 字时自动切换为粘贴模式输入（更快）。`[IMAGE:]` 标记和 `--image` 参数可以同时使用，后者的图片追加在内联图片之后。`--topic` 和 `--column` 会在填写完正文和封面后统一处理，选择专栏时会自动展开发布设置面板。

---

### 📋 等你来答

获取知乎「等你来答」列表中待回答的问题。

```bash
npm run zhihu:waiting [-- --count 数量] [-- --type 分类]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--count` | 获取问题数量 | `10` |
| `--type` | 问题分类（见下方） | `recommend` |

**`--type` 可选值：**

| 值 | 含义 |
|------|------|
| `recommend` | 为你推荐 |
| `invite` | 邀请回答 |
| `new` | 最新问题 |
| `hot` | 人气问题 |

<details>
<summary>📌 示例 & 输出</summary>

```bash
# 获取默认「为你推荐」前 10 条
npm run zhihu:waiting

# 获取「邀请回答」前 5 条
npm run zhihu:waiting -- --type invite --count 5

# 获取「人气问题」前 20 条
npm run zhihu:waiting -- --type hot --count 20
```

```
📋 获取「等你来答」列表 — 为你推荐，最多 5 条

✅ 已验证登录状态

共获取到 5 个问题：

1. 哪款输入法最适合日常办公和社交？
   📊 2,243 浏览 · 27 回答 · 29 关注 · 1 年前的提问
   🔗 https://www.zhihu.com/question/123456

2. 如何快速提高打字速度？
   📊 58,962 浏览 · 1,843 回答 · 1,859 关注 · 2 个月前的提问
   🔗 https://www.zhihu.com/question/234567
```

</details>

---

### ❓ 知乎提问

```bash
npm run zhihu:ask -- --title "问题标题" [--content "问题说明"] [--dry-run]
```

| 参数 | 说明 | 必填 |
|------|------|------|
| `--title` | 问题标题 | ✅ |
| `--content` | 问题说明 / 补充内容（选填） | ❌ |
| `--dry-run` | 预览模式，填写内容但不实际发布 | ❌ |

<details>
<summary>📌 示例</summary>

```bash
# 只填标题
npm run zhihu:ask -- --title "如何看待 AI 对软件工程师职业的影响？"

# 带问题说明
npm run zhihu:ask -- \
  --title "如何看待 AI 对软件工程师职业的影响？" \
  --content "随着 LLM 和代码生成工具的普及，软件工程师的核心竞争力会发生哪些转变？"

# Dry-run 预览
npm run zhihu:ask -- --title "测试提问" --dry-run
```

</details>

> 💡 操作流程：点击顶部「创作」按钮 → 下拉菜单选「提问题」→ 弹窗填写标题（必填）→ 等待说明框出现后填写说明（选填）→ 点击「发布问题」。

---

### 👥 关注 / 取消关注用户

```bash
npm run zhihu:follow -- --user "用户ID" [--unfollow] [--dry-run]
```

| 参数 | 说明 | 必填 |
|------|------|------|
| `--user` | 目标用户的知乎 URL ID（即 `zhihu.com/people/{user}` 中的部分） | ✅ |
| `--unfollow` | 取消关注（不加此参数默认为关注） | ❌ |
| `--dry-run` | 预览模式，打开用户主页但不实际点击 | ❌ |

<details>
<summary>📌 示例</summary>

```bash
# 关注用户
npm run zhihu:follow -- --user "cai-jonathan"

# 取消关注
npm run zhihu:follow -- --user "cai-jonathan" --unfollow
```

</details>

> 💡 幂等安全：关注时若已关注则跳过；取消关注时若本就未关注也跳过。

---

### 💬 评论回答

```bash
npm run zhihu:comment -- --url "回答URL" --content "评论内容" [--dry-run]
```

| 参数 | 说明 | 必填 |
|------|------|------|
| `--url` | 目标回答的完整 URL（`/question/xxx/answer/yyy` 格式） | ✅ |
| `--content` | 评论内容 | ✅ |
| `--dry-run` | 预览模式，填写内容但不实际发布 | ❌ |

<details>
<summary>📌 示例</summary>

```bash
npm run zhihu:comment -- \
  --url "https://www.zhihu.com/question/1929952636016268030/answer/2004676372434547404" \
  --content "非常有见地的回答，受益匪浅！"

# Dry-run 预览
npm run zhihu:comment -- --url "..." --content "测试评论" --dry-run
```

</details>

> 💡 操作流程：打开回答页 → 点击「X 条评论」按钮展开评论区 → 点击顶部输入框 → 输入内容 → 点击「发布」。

---

### 👍 赞同回答

```bash
npm run zhihu:upvote -- --url "回答URL" [--dry-run]
```

| 参数 | 说明 | 必填 |
|------|------|------|
| `--url` | 目标回答的完整 URL（`/question/xxx/answer/yyy` 格式） | ✅ |
| `--dry-run` | 预览模式，打开页面但不实际点击赞同 | ❌ |

<details>
<summary>📌 示例</summary>

```bash
npm run zhihu:upvote -- \
  --url "https://www.zhihu.com/question/1979609139266213083/answer/2001327186213360634"
```

</details>

> 💡 幂等安全：若该回答已赞同（按钮含 `VoteButton--up` class），则自动跳过，不会重复点击。

---

## 百度知道（Zhidao）

### 🔐 保存登录状态

```bash
npm run zhidao:save-session
```

浏览器会打开百度登录页，手动完成登录后 Session 自动保存到 `.session/zhidao/`。

---

### 🔍 搜索问题

```bash
npm run zhidao:search -- --keyword "关键词" [--count 数量]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--keyword` | 搜索关键词 | `打字练习` |
| `--count` | 返回结果数量 | `10` |

<details>
<summary>📌 示例 & 输出</summary>

```bash
npm run zhidao:search -- --keyword "打字练习" --count 10
```

```
🔍 搜索关键词: "打字练习"，最多显示 10 条结果

📋 搜索结果 (共 10 条):

1. 怎么学打字？
   💬 简单易学的五笔学法如下：1、要背字根...
   📊 2个回答
   🔗 https://zhidao.baidu.com/question/145679...
```

</details>

---

### ✍️ 回答问题

```bash
# 通过问题 URL 回答
npm run zhidao:answer -- --url "问题URL" --content "回答内容"

# 通过关键词搜索后回答（自动取第一条）
npm run zhidao:answer -- --keyword "搜索关键词" --content "回答内容"
```

| 参数 | 说明 | 必填 |
|------|------|------|
| `--url` | 问题页面 URL（与 `--keyword` 二选一） | 二选一 |
| `--keyword` | 搜索关键词，自动匹配第一个问题（与 `--url` 二选一） | 二选一 |
| `--content` | 回答内容 | ✅ |
| `--dry-run` | 预览模式，填写内容但不实际提交 | ❌ |

<details>
<summary>📌 示例</summary>

```bash
# 通过 URL 直接回答
npm run zhidao:answer -- \
  --url "https://zhidao.baidu.com/question/145679429430052885.html" \
  --content "建议下载金山打字通，每天练习 30 分钟，一个月可以明显提速。"

# 通过关键词搜索后回答
npm run zhidao:answer -- \
  --keyword "如何学打字" \
  --content "从基础指法开始，配合专业练习软件..."

# Dry-run 预览
npm run zhidao:answer -- \
  --url "https://zhidao.baidu.com/question/145679429430052885.html" \
  --content "测试回答" \
  --dry-run
```

</details>

---

### ❓ 发起提问

```bash
npm run zhidao:ask -- --title "提问标题" [--description "补充说明"] [--anonymous] [--dry-run]
```

| 参数 | 说明 | 必填 |
|------|------|------|
| `--title` | 提问标题 | ✅ |
| `--description` | 补充说明（选填） | ❌ |
| `--anonymous` | 匿名提问（flag，不需要值） | ❌ |
| `--dry-run` | 预览模式，填写内容但不实际提交 | ❌ |

<details>
<summary>📌 示例</summary>

```bash
# 基础提问
npm run zhidao:ask -- --title "如何快速提高打字速度？"

# 带说明的提问
npm run zhidao:ask -- \
  --title "如何快速提高打字速度？" \
  --description "我目前每分钟只能打40个字，想提升到100字以上，有什么好的方法？"

# 匿名提问
npm run zhidao:ask -- \
  --title "如何快速提高打字速度？" \
  --description "我目前每分钟只能打40个字..." \
  --anonymous

# Dry-run 预览填写效果
npm run zhidao:ask -- \
  --title "如何快速提高打字速度？" \
  --anonymous \
  --dry-run
```

</details>

---

### 📬 获取为我推荐的问题列表

```bash
npm run zhidao:recommendquestion [-- --keyword "关键词"] [-- --count 数量]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--keyword` | 在推荐页搜索框中输入关键词并回车检索，筛选含该关键词的推荐问题（选填） | 无 |
| `--count` | 最多返回的问题数量 | `20` |

> **说明：** 传入 `--keyword` 后，脚本会在页面搜索框中输入关键词并模拟回车触发检索，等待结果返回（约 3–4 秒）后再抓取问题列表。

<details>
<summary>📌 示例 & 输出</summary>

```bash
# 获取默认推荐问题（前 20 条）
npm run zhidao:recommendquestion

# 按关键词筛选（输入后自动回车检索）
npm run zhidao:recommendquestion -- --keyword "健康"

# 指定数量
npm run zhidao:recommendquestion -- --count 10

# 关键词 + 数量组合
npm run zhidao:recommendquestion -- --keyword "编程" --count 5
```

```
📋 获取「为我推荐」问题列表，关键词筛选: "编程"，最多显示 5 条

✅ 已验证登录状态

共获取到 5 个推荐问题：

1. 如何快速学会编程？
   🔗 https://zhidao.baidu.com/question/1317166535946393259.html?entry=uhome_homecenter_recommend

2. 零基础学编程从哪里开始？
   🔗 https://zhidao.baidu.com/question/...
```

</details>

---

## 🗂️ 项目结构

```
web-automation/
├── src/
│   ├── index.ts               # 模块入口（导出所有公共 API）
│   ├── config.ts              # 全局配置（读取 .env）
│   ├── browser/
│   │   └── BrowserManager.ts  # 浏览器管理（持久化 Session、反检测）
│   └── pages/
│       ├── zhihu/             # 知乎页面实现
│       │   ├── BasePage.ts
│       │   ├── LoginPage.ts
│       │   ├── SearchPage.ts
│       │   ├── QuestionPage.ts
│       │   ├── ArticlePage.ts
│       │   ├── WaitingPage.ts
│       │   ├── AskPage.ts
│       │   ├── FollowPage.ts
│       │   ├── CommentPage.ts
│       │   └── UpvotePage.ts
│       └── zhidao/            # 百度知道页面实现
│           ├── BasePage.ts
│           ├── LoginPage.ts
│           ├── SearchPage.ts
│           ├── QuestionPage.ts
│           ├── AskPage.ts
│           └── RecommendQuestionPage.ts
├── scripts/                   # 开发用脚本
│   ├── zhihu/                 # 知乎相关脚本
│   └── zhidao/                # 百度知道相关脚本
├── .session/                  # 各站点登录 Session（已加入 .gitignore）
│   ├── zhihu/
│   └── zhidao/
├── .env.example               # 环境变量模板
├── package.json
└── tsconfig.json
```

---

## 📋 指令速查

### 知乎（Zhihu）

| 指令 | 说明 | 关键参数 |
|------|------|----------|
| `npm run zhihu:save-session` | 保存登录状态 | — |
| `npm run zhihu:search` | 搜索问题 | `--keyword` `--count` |
| `npm run zhihu:answer` | 发布回答 | `--url` / `--keyword`，`--content` |
| `npm run zhihu:article` | 发布专栏文章 | `--title` `--content` `--cover` `--topic` `--column` |
| `npm run zhihu:waiting` | 等你来答列表 | `--type` `--count` |
| `npm run zhihu:ask` | 发起提问 | `--title` `--content` |
| `npm run zhihu:follow` | 关注 / 取消关注用户 | `--user` `--unfollow` |
| `npm run zhihu:comment` | 评论回答 | `--url` `--content` |
| `npm run zhihu:upvote` | 赞同回答 | `--url` |

### 百度知道（Zhidao）

| 指令 | 说明 | 关键参数 |
|------|------|----------|
| `npm run zhidao:save-session` | 保存登录状态 | — |
| `npm run zhidao:search` | 搜索问题 | `--keyword` `--count` |
| `npm run zhidao:answer` | 回答问题 | `--url` / `--keyword`，`--content` |
| `npm run zhidao:ask` | 发起提问 | `--title` `--description` `--anonymous` |
| `npm run zhidao:recommendquestion` | 为我推荐问题列表 | `--keyword` `--count` |

> 所有指令均支持 `--dry-run` 参数，用于预览操作流程而不实际提交。

---

## ❓ 常见问题

<details>
<summary><b>运行脚本提示"未登录"？</b></summary>

各站点需要分别保存一次登录状态：
- 知乎：`npm run zhihu:save-session`
- 百度知道：`npm run zhidao:save-session`

Session 分别保存在 `.session/zhihu/` 和 `.session/zhidao/` 目录中。

</details>

<details>
<summary><b>浏览器下载失败？</b></summary>

本项目配置为使用系统已安装的 Google Chrome，无需额外下载。请确认已安装 Chrome（macOS 路径：`/Applications/Google Chrome.app`）。

</details>

<details>
<summary><b>登录时遇到验证码？</b></summary>

脚本默认运行在非无头模式（`HEADLESS=false`），浏览器窗口会正常显示，在窗口中手动完成验证码即可，脚本会自动等待。

</details>

<details>
<summary><b>发布回答后提示"无法确认发布状态"？</b></summary>

知乎编辑器使用 Draft.js 富文本框，部分情况下发布后编辑器不会立即关闭，可手动检查浏览器确认是否成功。使用 `--dry-run` 参数可以先预览操作流程。

</details>

<details>
<summary><b>如何修改操作速度？</b></summary>

在 `.env` 中调整 `SLOW_MO` 值（单位毫秒）：
- `0` — 最快速度
- `100` — 默认，较像人工操作
- `300` — 更慢，适合调试

</details>

---

## ⚠️ 免责声明

本项目仅供学习和研究使用。使用本工具时请遵守各平台的用户协议和相关法律法规，请勿用于任何违规操作。因使用本工具产生的一切后果由使用者自行承担。

- 知乎用户协议：[https://www.zhihu.com/term/zhihu-terms](https://www.zhihu.com/term/zhihu-terms)
- 百度知道用户协议：[https://zhidao.baidu.com/](https://zhidao.baidu.com/)

## 📄 License

[MIT](LICENSE)
