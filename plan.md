# DIY Calendar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个面向个人使用的跨端日程待办管理系统，支持安卓 APK（含 2×2 可滚动桌面小组件）和电脑端网页同步，覆盖多日历管理、待办、日程、重复规则、多提醒、搜索、颜色分类、设置个性化、撤销操作、快捷创建与拖拽交互等核心能力，UI 与交互全面对标 Google Calendar，并为后续接入本地 AI 工具预留扩展接口。

**Architecture:** 一期采用移动端 + Android 桌面小组件 + Web 端 + 云端后端的四层结构。云端（Supabase）作为唯一事实源，移动端和 Web 端负责展示、编辑和本地缓存，小组件只读取移动端本地缓存。核心系统聚焦日历与待办同步能力；手机端调用本地 Codex/OpenClaw 的能力作为二期扩展。

**Tech Stack:** `Expo React Native`（`prebuild`/bare workflow）、`Kotlin + Jetpack Glance/AppWidget`、`Next.js`、`Supabase/PostgreSQL`、TypeScript、`rrule`、Expo Notifications、本地缓存（SQLite/MMKV）；二期可选 `desktop-agent`（Node.js）+ `Tailscale/ZeroTier` 或云端任务队列。

---

## Scope Check

该需求包含两个相关但独立的子系统：

1. `日历/待办核心系统`（一期）
2. `手机端与电脑本地 AI 工具联动系统`（二期）

一期交付 `日历/待办核心系统`，做到稳定可用。二期再接入 `Codex CLI/OpenClaw` 联动。

## Recommended Architecture

### Recommended Route

- [ ] `Expo React Native（prebuild/bare） + Android native widget module（Kotlin/Jetpack Glance） + Next.js + Supabase/PostgreSQL`

推荐原因：

- [ ] `Expo React Native` 适合快速生成安卓 APK
- [ ] Android 小组件需要原生能力，`prebuild` 或 bare workflow 承载 Kotlin 小组件模块
- [ ] `Next.js` 适合快速提供电脑端网页
- [ ] `Supabase` 适合个人项目快速落地账号、数据库、基础鉴权和同步能力

### Alternative Route

若后续需要更强控制力，可升级为：

- [ ] `React Native bare + Kotlin widget module + Next.js + NestJS/FastAPI + PostgreSQL + Redis`

## Project Structure

```text
apps/
  mobile/                安卓 App（Expo / React Native，含原生 Android 代码）
    android/
      widget/            Kotlin 小组件模块（Jetpack Glance / AppWidget）
    src/
      components/        UI 组件
      screens/           页面（日历、待办、设置、事件详情等）
      navigation/        导航配置（底部 Tab + 抽屉菜单 + Stack）
      notifications/     本地通知调度
      sync/              同步逻辑与本地缓存
      widget/            小组件数据桥接
  web/                   电脑端 Web（Next.js）
    src/
      components/        UI 组件
        calendar/        日历视图组件（TimeGrid、MonthGrid、AgendaList、MiniCalendar）
        event/           事件相关（EventBlock、EventPreview、EventForm）
        todo/            待办相关
        layout/          布局组件（TopBar、Sidebar、MainArea）
      pages/             页面路由
      hooks/             自定义 Hooks
  desktop-agent/         电脑本地 AI 代理（二期）
packages/
  shared/                共享代码
    src/
      types.ts           领域类型定义
      date-utils.ts      日期处理工具
      recurrence.ts      重复规则处理（基于 rrule）
      sync.ts            同步协议与冲突处理
      ics.ts             ICS 导入导出（二期）
supabase/
  migrations/            数据库迁移
  schema.sql             完整 Schema
  functions/             服务端函数
docs/                    设计文档
```

## Core Data Model

### 实体清单

```text
users              用户账号
calendars          日历（支持多日历）
events             日程事件
recurrence_rules   重复规则
event_exceptions   重复事件例外
todos              待办事项
reminders          提醒（支持一对多）
user_settings      用户偏好设置
ai_tasks           AI 任务（二期）
```

### 表结构设计

#### users

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| email | text UNIQUE | |
| password_hash | text | |
| display_name | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### calendars

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| name | text | 如"个人"、"工作"、"课程" |
| color | text | 十六进制色值，如 `#1a73e8` |
| is_visible | boolean | 是否在视图中显示，默认 true |
| is_default | boolean | 是否为默认日历，默认 false，不可删除 |
| sort_order | int | 排序权重 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### events

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| calendar_id | uuid FK → calendars | 所属日历 |
| title | text | |
| description | text | |
| location | text | |
| start_time | timestamptz | 开始时间 |
| end_time | timestamptz | 结束时间 |
| is_all_day | boolean | 是否全天事件 |
| color | text NULL | 事件独立颜色，为空时使用日历颜色 |
| recurrence_rule_id | uuid FK → recurrence_rules NULL | |
| deleted_at | timestamptz NULL | 软删除标记，配合撤销功能 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### recurrence_rules

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | 冗余字段，简化 RLS 规则 |
| rrule_string | text | RFC 5545 RRULE 字符串，由 `rrule` 库生成和解析 |
| created_at | timestamptz | |

支持的重复模式：每天、每周、每月、每年、指定工作日（周一至周五）、自定义周期。结束条件支持指定日期或指定次数。

#### event_exceptions

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | 冗余字段，简化 RLS 规则 |
| event_id | uuid FK → events | 原始重复事件 |
| original_date | date | 原始应出现的日期 |
| action | text | `skip` / `modify` |
| modified_title | text NULL | 修改后的标题 |
| modified_start_time | timestamptz NULL | |
| modified_end_time | timestamptz NULL | |
| modified_location | text NULL | |
| modified_description | text NULL | |
| modified_color | text NULL | 修改后的颜色 |
| modified_calendar_id | uuid FK → calendars NULL | 修改后的所属日历 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### todos

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| calendar_id | uuid FK → calendars | 所属日历 |
| title | text | |
| description | text | |
| due_date | date NULL | 关联日期 |
| due_time | time NULL | 截止时间 |
| is_completed | boolean | 完成状态 |
| completed_at | timestamptz NULL | |
| color | text NULL | 待办独立颜色 |
| deleted_at | timestamptz NULL | 软删除标记，配合撤销功能 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### reminders

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| event_id | uuid FK → events NULL | 关联事件 |
| todo_id | uuid FK → todos NULL | 关联待办 |
| offset_minutes | int | 提前多少分钟提醒（如 10、60、1440） |
| created_at | timestamptz | |

一个事件/待办可关联多条 reminders 记录，实现多提醒。`event_id` 和 `todo_id` 互斥，不同时为空。

#### user_settings

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users UNIQUE | 一个用户一条 |
| default_view | text | `day` / `week` / `month` / `agenda`，默认 `week` |
| week_start_day | text | `monday` / `sunday`，默认 `monday` |
| default_reminder_offsets | jsonb | 默认提醒，如 `[10, 1440]`（分钟） |
| default_event_duration | int | 默认事件时长（分钟），默认 60 |
| theme | text | `light` / `dark` / `system`，默认 `system` |
| updated_at | timestamptz | |

### 数据设计原则

- [ ] 服务端数据库作为唯一事实源
- [ ] 客户端保留必要缓存，但不作为最终真值
- [ ] 重复规则与例外规则分开存储
- [ ] 待办和日程逻辑分离，但可在 UI 上统一呈现
- [ ] 提醒为独立表，一个事件/待办可有多条提醒记录
- [ ] 日历为独立实体，事件和待办通过 `calendar_id` 关联
- [ ] 用户设置通过账号同步，双端保持一致

## Key Technical Decisions

### Sync Strategy

一期同步策略：

- [ ] 使用服务端统一存储，Supabase Realtime 订阅变更
- [ ] 每条记录保留 `updated_at`
- [ ] 冲突处理先采用 `last write wins`
- [ ] 客户端做增量拉取与提交
- [ ] 手机端下拉刷新触发手动同步

### Recurrence Strategy

- [ ] 使用 `rrule` 库处理所有重复规则
- [ ] 存储 RFC 5545 标准 RRULE 字符串
- [ ] 支持每天、每周、每月、每年、工作日、自定义周期
- [ ] 例外修改独立建模（`event_exceptions` 表）
- [ ] 支持"仅修改本次"、"跳过本次"、"修改此事件及后续所有"

### Reminder Strategy

- [ ] 手机端本地通知为主（Expo Notifications）
- [ ] 每个事件/待办支持多条提醒记录
- [ ] 新建事件时自动从 `user_settings.default_reminder_offsets` 填充
- [ ] 服务端只负责存储规则，客户端负责调度本地通知
- [ ] 同步后重新调度未来 14 天的通知

### Widget Strategy

- [ ] 小组件尺寸为 **2×2 格**（约 200×200dp）
- [ ] 使用 Android `RemoteViews + ListView`（或 Jetpack Glance `LazyColumn`）实现可滚动列表
- [ ] 列表按日期分组，默认加载未来 **14 天**的日程和待办
- [ ] **隐藏系统滚动条**，使用底部/顶部白色渐隐遮罩暗示可滚动
- [ ] 头部固定显示当天日期（大号字体 ~34px）、星期（~16px）、月份（~12px），右侧 "+" 按钮（~30px）
- [ ] 事件标题 ~14px，时间 ~11px
- [ ] 日程用左侧彩色竖条标识日历颜色，待办用勾选框图标
- [ ] 已完成待办在数据层过滤，不进入小组件
- [ ] 小组件跟随系统深色/浅色主题自动切换
- [ ] App 同步完成、待办完成、日程增删改后主动触发小组件刷新
- [ ] 小组件只读取移动端本地缓存，不直接访问云端

### Theme Strategy

- [ ] 支持浅色、深色、跟随系统三种模式
- [ ] 电脑端通过 CSS 变量 + `prefers-color-scheme` 实现
- [ ] 手机端通过 React Native 的 `useColorScheme` + 主题 Provider 实现
- [ ] 小组件通过 Android `isNightMode` 判断当前主题

### Undo Strategy

- [ ] 删除/修改操作后底部弹出 Snackbar，显示操作描述 + "撤销"按钮
- [ ] Snackbar 显示约 5 秒后自动消失
- [ ] 实现方式：删除操作先做软删除（标记 `deleted_at`），Snackbar 消失后再同步到服务端；撤销时清除标记
- [ ] 拖拽调整时间后同样支持撤销，记录操作前的原始值

## Major Risks

### Risk 1: Sync Conflicts

- [ ] 同一条数据被多端同时修改时产生冲突
- [ ] 控制：一期采用 `last write wins`，界面保留 `updated_at` 信息

### Risk 2: Repeat Event Exceptions

- [ ] 重复事件的"改单次""删单次""改此后所有"逻辑复杂
- [ ] 控制：例外逻辑独立建模，不修改原始规则；一期优先支持"改单次"和"跳过单次"

### Risk 3: Android Reminder Reliability

- [ ] 不同安卓厂商对后台通知限制不同
- [ ] 控制：优先使用系统本地通知，不承诺极端省电策略下的绝对可靠

### Risk 4: Widget Scroll & Refresh

- [ ] 2×2 小组件空间有限，可滚动列表在不同 Android 版本上行为可能不一致
- [ ] 控制：使用标准 `RemoteViews + ListView` 或 Glance `LazyColumn`，严格测试 Android 8+ 兼容性
- [ ] App 数据变更后必须主动调用 `AppWidgetManager.notifyAppWidgetViewDataChanged`

### Risk 5: Drag & Drop Complexity (Desktop)

- [ ] 拖拽创建、拖拽移动、拖拽调整时长三种交互在周/日视图时间网格上并存，状态管理复杂
- [ ] 控制：统一拖拽状态机（idle → dragging → confirm），使用 `mousedown/mousemove/mouseup` 事件链，区分点击与拖拽的阈值

### Risk 6: Expo Prebuild + Kotlin Native Module Integration

- [ ] Expo 的 prebuild 机制对 `android/` 目录有自己的管理方式，手动添加 Kotlin widget 模块可能在 prebuild 重新生成时被覆盖或冲突
- [ ] 控制：使用 Expo Config Plugin 或 Expo Module API 注册原生模块，避免手动修改 `android/` 目录；在 Task 1 阶段即验证 Kotlin 模块可被 Expo prebuild 正确保留

### Risk 7: Supabase China Accessibility

- [ ] 项目核心动机是替代 Google Calendar 避免 VPN 依赖，但 Supabase 服务器通常部署在海外，在中国大陆可能同样面临访问不稳定的问题
- [ ] 控制：Task 1 阶段优先验证 Supabase 在目标网络环境下的连通性和延迟；若不可接受，备选方案为自建后端（NestJS/FastAPI + PostgreSQL 部署在国内云服务商）或使用国内 BaaS 替代

### Risk 8: Recurrence Expansion Performance

- [ ] 多个无结束日期的重复事件在月视图渲染时需实时展开所有实例，数量较多时可能导致性能问题
- [ ] 控制：限制单次展开的日期范围（仅展开视图可见范围 + 前后缓冲）；对高频查询结果做内存缓存

### Risk 9: Local AI Connectivity

- [ ] 手机跨公网调用电脑本地 CLI 涉及 NAT、安全控制、设备在线状态
- [ ] 控制：二期实现，采用"云端任务中转 + 本地 agent 执行"模式

## AI Integration Feasibility

### Judgment

- [ ] "手机端调用电脑端 Codex CLI/OpenClaw"技术上可行
- [ ] 最可行方案：云端任务中转 + 本地 agent 间接执行

### Recommended Flow

```text
手机 App → 云端任务表/队列 → 电脑本地 agent → Codex CLI/OpenClaw → 结果回传 → 手机查看结果
```

---

## Phased Delivery Plan

## Chunk 1: Foundation & Infrastructure

### Task 1: Establish Monorepo and Shared Foundations

**Files:**
- Create: `apps/mobile/` (Expo prebuild scaffold)
- Create: `apps/web/` (Next.js scaffold)
- Create: `packages/shared/`
- Create: root `package.json`, `tsconfig.json`, `.eslintrc`

**Acceptance:** `npm run dev` 在 web 端启动成功；`npx expo start` 在 mobile 端启动成功；shared 包可被两端引用。

- [ ] **Step 1: Initialize monorepo workspace**
  - 使用 npm/yarn/pnpm workspaces
  - 配置根 `tsconfig.json` 和 `eslint`
- [ ] **Step 2: Scaffold Expo React Native project (prebuild/bare)**
  - `npx create-expo-app apps/mobile`
  - 配置 `app.json` 启用 Android prebuild
- [ ] **Step 3: Scaffold Next.js project**
  - `npx create-next-app apps/web --typescript`
- [ ] **Step 4: Create shared package with domain types**
  - `packages/shared/src/types.ts`：定义 `User`, `Calendar`, `Event`, `Todo`, `RecurrenceRule`, `EventException`, `Reminder`, `UserSettings`, `WidgetItem` 类型
  - `packages/shared/src/date-utils.ts`：日期格式化、时间段计算工具
- [ ] **Step 5: Verify both projects start and import shared types successfully**
- [ ] **Step 6: Commit**

### Task 2: Build Authentication and Data Storage

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/schema.sql`
- Modify: `packages/shared/src/types.ts`

**Acceptance:** Supabase 本地或云端实例运行，所有表创建成功，RLS 规则生效，可通过 API 完成 CRUD。

- [ ] **Step 1: Create all database tables**
  - `users`, `calendars`, `events`, `recurrence_rules`, `event_exceptions`, `todos`, `reminders`, `user_settings`
  - 严格按照 Core Data Model 章节定义字段和类型
- [ ] **Step 2: Add Row-Level Security (RLS) rules**
  - 所有表启用 RLS
  - 规则：用户只能读写自己的数据（`user_id = auth.uid()`）
- [ ] **Step 3: Create seed data**
  - 创建默认日历（"个人"）在用户注册时自动生成
  - 创建默认 `user_settings` 记录
- [ ] **Step 4: Implement auth flow**
  - 使用 Supabase Auth（邮箱+密码）
  - 生成共享的 auth helper（`packages/shared/src/auth.ts`）
- [ ] **Step 5: Create API/RPC wrappers for CRUD**
  - 日历 CRUD、事件 CRUD、待办 CRUD、提醒 CRUD、设置读写
- [ ] **Step 6: Verify schema and RLS locally**
- [ ] **Step 7: Commit**

---

## Chunk 2: Desktop Core UI

### Task 3: Desktop Layout Shell & Multi-Calendar Management

**Files:**
- Create: `apps/web/src/components/layout/TopBar.tsx`
- Create: `apps/web/src/components/layout/Sidebar.tsx`
- Create: `apps/web/src/components/layout/MainArea.tsx`
- Create: `apps/web/src/components/calendar/MiniCalendar.tsx`
- Create: `apps/web/src/components/calendar/CalendarList.tsx`
- Create: `apps/web/src/pages/index.tsx`

**Acceptance:** 电脑端显示完整的 Google Calendar 风格布局，左侧栏含创建按钮、迷你月历、可勾选的日历列表；顶部栏含今天按钮、前后翻页、搜索框、视图切换。

- [ ] **Step 1: Implement TopBar**
  - 汉堡菜单（控制 Sidebar 展开/收起）
  - 产品名称/Logo
  - "今天"按钮
  - 前/后翻页箭头
  - 当前日期范围标题（如"2026年4月6日 – 12日"）
  - 搜索框
  - 视图切换下拉（日/周/月/议程）
  - 设置入口
- [ ] **Step 2: Implement Sidebar**
  - 创建按钮（大圆角 + "+" 图标）
  - MiniCalendar 组件：小型月历网格，点击日期跳转主视图，当天高亮
  - CalendarList 组件：展示所有日历，每行含颜色色块 + 勾选框 + 日历名称
- [ ] **Step 3: Implement multi-calendar CRUD**
  - 新建日历（名称 + 颜色选择）
  - 编辑日历（改名、换颜色）
  - 删除日历（确认弹窗，关联事件和待办移动到默认日历；默认日历标记 `is_default=true`，不可删除）
  - 点击勾选框切换日历可见性，联动主视图过滤
- [ ] **Step 4: Implement MainArea container**
  - 根据当前视图类型渲染对应视图组件（占位）
  - 接入认证流程，未登录显示登录页
- [ ] **Step 5: Implement theme switching**
  - CSS 变量定义浅色/深色主题
  - `prefers-color-scheme` 媒体查询支持跟随系统
  - 设置中可手动切换
- [ ] **Step 6: Commit**

### Task 4: Day & Week Views (Shared Time Grid)

**Files:**
- Create: `apps/web/src/components/calendar/TimeGrid.tsx`
- Create: `apps/web/src/components/calendar/DayView.tsx`
- Create: `apps/web/src/components/calendar/WeekView.tsx`
- Create: `apps/web/src/components/calendar/AllDayArea.tsx`
- Create: `apps/web/src/components/event/EventBlock.tsx`

**Acceptance:** 日视图和周视图正确渲染时间网格、事件块、全天区域；当天列高亮；事件颜色匹配所属日历。

- [ ] **Step 1: Build TimeGrid base component**
  - 左侧时间标签列（0:00–23:00，每小时一行）
  - 右侧为 N 列日历列（日视图 N=1，周视图 N=7）
  - 半小时网格线
  - 当前时间红色指示线
- [ ] **Step 2: Build AllDayArea component**
  - 时间网格上方的全天事件区域
  - 全天事件以横条展示，跨天事件横跨多列
- [ ] **Step 3: Build EventBlock component**
  - 根据 start_time 和 end_time 计算绝对定位（top + height）
  - 背景色取事件自身 color，若为空取所属日历 color
  - 显示标题、时间、地点（空间允许时）
  - 处理同一时段多事件重叠的列宽分配
- [ ] **Step 4: Build DayView**
  - 顶部显示日期 + 星期
  - TimeGrid columns=1
  - 从数据层获取当天事件渲染
- [ ] **Step 5: Build WeekView**
  - 顶部显示 7 天的日期和星期，当天数字高亮（蓝色圆形背景）
  - TimeGrid columns=7
  - 当天列淡蓝色背景
- [ ] **Step 6: Connect to Supabase data and apply calendar visibility filter**
- [ ] **Step 7: Commit**

### Task 5: Month View & Agenda View

**Files:**
- Create: `apps/web/src/components/calendar/MonthView.tsx`
- Create: `apps/web/src/components/calendar/AgendaView.tsx`

**Acceptance:** 月视图展示每天的事件概要，跨天事件横条显示；议程视图按日分组纵向列表展示。

- [ ] **Step 1: Build MonthView**
  - 6 行 × 7 列网格
  - 每个日期格内展示事件条目（最多显示 N 条 + "+X more"）
  - 跨天事件以横条跨越多个日期格
  - 当天日期数字高亮
  - 点击日期可快速跳转日视图
- [ ] **Step 2: Build AgendaView**
  - 按日期分组的纵向列表
  - 每组显示日期标签 + 当天所有事件和待办
  - 事件显示时间、标题、日历颜色
  - 待办显示勾选框、标题、截止时间
- [ ] **Step 3: Integrate view switching**
  - TopBar 视图下拉切换日/周/月/议程
  - "今天"按钮跳转当天
  - 前后翻页按钮按视图类型切换日期范围
- [ ] **Step 4: Commit**

---

## Chunk 3: Data CRUD & Interactions

### Task 6: Event CRUD

**Files:**
- Create: `apps/web/src/components/event/EventForm.tsx`
- Create: `apps/web/src/components/event/EventPreview.tsx`
- Modify: `apps/web/src/components/calendar/TimeGrid.tsx`
- Modify: `apps/web/src/components/event/EventBlock.tsx`

**Acceptance:** 可完整创建/编辑/删除事件，支持多提醒、日历选择、颜色覆盖。事件预览弹窗可在点击事件块时显示。

- [ ] **Step 1: Build EventForm dialog**
  - 标题、描述、地点
  - 开始时间 + 结束时间（日期选择器 + 时间选择器）
  - 全天事件开关
  - 所属日历选择下拉
  - 颜色覆盖选择（可选，默认跟随日历）
  - 提醒列表（可添加/删除多条，每条选择提前时间）
  - 重复规则选择（占位，Task 13 实现）
  - 保存 / 取消按钮
- [ ] **Step 2: Build EventPreview popover**
  - 点击日历中的事件块弹出
  - 显示：标题、时间、地点、所属日历名称+颜色
  - 操作：编辑（打开 EventForm）、删除
  - 点击弹窗外部关闭
- [ ] **Step 3: Implement click-to-create on time slot**
  - 点击周/日视图空白时间槽，弹出 EventForm，自动填入对应日期和时间
  - 默认时长取 `user_settings.default_event_duration`
  - 默认提醒取 `user_settings.default_reminder_offsets`
- [ ] **Step 4: Implement drag-to-create**
  - 在周/日视图空白区域按住拖拽，选中一段时间范围
  - 松开后弹出 EventForm，开始和结束时间自动填入
- [ ] **Step 5: Implement drag-to-move and drag-to-resize**
  - 拖拽事件块整体 → 移动到新时间
  - 拖拽事件块底边 → 调整结束时间（改变时长）
  - 拖拽过程中显示时间预览
- [ ] **Step 6: Connect all CRUD operations to Supabase**
- [ ] **Step 7: Commit**

### Task 7: Todo CRUD

**Files:**
- Create: `apps/web/src/components/todo/TodoList.tsx`
- Create: `apps/web/src/components/todo/TodoForm.tsx`
- Create: `apps/web/src/components/todo/TodoItem.tsx`

**Acceptance:** 可创建/编辑/删除/完成待办，待办关联日历，在议程视图和月视图中正确显示。

- [ ] **Step 1: Build TodoForm dialog**
  - 标题、描述
  - 关联日期 + 截止时间
  - 所属日历选择
  - 提醒设置（多提醒）
- [ ] **Step 2: Build TodoList component**
  - 展示未完成待办列表
  - 勾选完成 / 取消完成
  - 按日历颜色标识
- [ ] **Step 3: Integrate todos into calendar views**
  - 议程视图中在对应日期下显示待办
  - 月视图中在对应日期格中显示
  - 待办使用勾选框图标区分于日程
- [ ] **Step 4: Connect to Supabase**
- [ ] **Step 5: Commit**

### Task 8: Undo Operations

**Files:**
- Create: `apps/web/src/components/common/Snackbar.tsx`
- Create: `apps/web/src/hooks/useUndo.ts`

**Acceptance:** 删除事件/待办后出现底部 Snackbar，点击撤销可恢复；拖拽调整后可撤销。

- [ ] **Step 1: Build Snackbar component**
  - 底部居中弹出
  - 显示操作描述 + "撤销"按钮
  - 5 秒后自动消失，带淡出动画
  - 支持同时只显示一条（新的覆盖旧的）
- [ ] **Step 2: Implement useUndo hook**
  - 记录操作类型 + 操作前数据快照
  - 删除操作：先做本地软删除，Snackbar 消失后再提交到服务端
  - 拖拽调整：记录原始 start_time/end_time，撤销时恢复
  - 修改日历归属：记录原始 calendar_id
- [ ] **Step 3: Apply undo to all destructive operations**
  - 事件删除、待办删除
  - 事件拖拽移动/调整时长
- [ ] **Step 4: Commit**

---

## Chunk 4: Mobile

### Task 9: Mobile Navigation, Layout & Auth

**Files:**
- Create: `apps/mobile/src/navigation/`
- Create: `apps/mobile/src/screens/LoginScreen.tsx`
- Create: `apps/mobile/src/components/layout/`

**Acceptance:** 手机端可登录，导航结构完整（底部 Tab、抽屉菜单、Stack），顶部栏、FAB、主题切换可用。

- [ ] **Step 1: Connect to Supabase and implement login flow**
  - 邮箱+密码登录/注册
  - Token 安全存储（`expo-secure-store`）
- [ ] **Step 2: Configure navigation structure**
  - 底部 Tab：日历 / 待办
  - 左侧抽屉菜单：视图切换（日/周/月/议程）、日历列表管理（含创建/编辑/删除入口和显示/隐藏勾选）、设置入口
  - Stack Navigator：事件详情、事件编辑、待办编辑、设置页
- [ ] **Step 3: Implement top bar**
  - 左侧汉堡菜单图标（打开抽屉）
  - 中间当前月份/年份标题
  - 右侧搜索图标 + "今天"按钮
- [ ] **Step 4: Implement FAB (Floating Action Button)**
  - 右下角常驻悬浮按钮
  - 点击展开两个选项："新建日程"、"新建待办"
  - 选择后跳转对应创建页面
- [ ] **Step 5: Implement theme (dark/light/system) for mobile**
  - `useColorScheme` + ThemeProvider
- [ ] **Step 6: Commit**

### Task 10: Mobile Views & Gesture Interactions

**Files:**
- Create: `apps/mobile/src/components/calendar/`
- Create: `apps/mobile/src/screens/CalendarScreen.tsx`

**Acceptance:** 月视图收缩/展开、日/周/议程视图、左右滑动切换日期、下拉刷新均可正常工作。

- [ ] **Step 1: Implement month view with expand/collapse**
  - 收缩态：显示当前一周行 + 下方当天事件列表
  - 拖拽手柄向下展开为完整月历
  - 展开态月历中日期下方显示彩色圆点（对应日历颜色）
  - 点击日期切换下方事件列表
- [ ] **Step 2: Implement day, week, and agenda views for mobile**
  - 复用 shared 的日期计算逻辑
  - 适配手机屏幕宽度
- [ ] **Step 3: Implement gesture interactions**
  - 左右滑动切换日期范围（月视图切换月、周视图切换周、日视图切换天）
  - 下拉刷新触发数据同步，显示加载指示器
- [ ] **Step 4: Apply calendar visibility filter**
  - 隐藏的日历下的事件和待办不在视图中显示
- [ ] **Step 5: Commit**

### Task 11: Mobile Event/Todo CRUD & Undo

**Files:**
- Create: `apps/mobile/src/screens/EventFormScreen.tsx`
- Create: `apps/mobile/src/screens/TodoFormScreen.tsx`
- Create: `apps/mobile/src/screens/EventDetailScreen.tsx`
- Create: `apps/mobile/src/components/common/Snackbar.tsx`

**Acceptance:** 手机端可完整创建/编辑/删除事件和待办，表单字段校验逻辑与电脑端一致，撤销操作可用。

注意：表单校验逻辑（必填校验、时间范围校验等）应提取到 `packages/shared/src/validators.ts`，双端复用，避免在手机端重新实现。

- [ ] **Step 1: Extract shared form validation logic**
  - `packages/shared/src/validators.ts`：事件/待办表单校验规则
- [ ] **Step 2: Implement event creation and editing screens**
  - 全屏表单页，字段同 EventForm（标题、时间、日历、颜色、提醒等）
  - 使用 shared validators
- [ ] **Step 3: Implement todo creation and editing screens**
  - 全屏表单页，字段同 TodoForm
- [ ] **Step 4: Implement event detail screen**
  - 显示事件完整信息
  - 编辑/删除操作入口
- [ ] **Step 5: Implement Snackbar undo for mobile**
  - 同 web 端逻辑：软删除 → Snackbar → 超时后提交
- [ ] **Step 6: Commit**

### Task 12: Android Home Screen Widget

**Files:**
- Create: `apps/mobile/android/app/src/main/java/.../widget/`
- Create: `apps/mobile/src/widget/`
- Modify: `apps/mobile/android/app/src/main/AndroidManifest.xml`

**Acceptance:** 2×2 小组件可添加到安卓桌面，显示头部日期+可滚动事件列表，支持上下滑动浏览 14 天日程，点击跳转 App。

- [ ] **Step 1: Define widget summary data model**
  - `WidgetDayGroup { date, label, items: WidgetItem[] }`
  - `WidgetItem { id, type: 'event'|'todo', title, timeText, color, isCompleted }`
  - 过滤已完成待办，按日期分组，加载未来 14 天
- [ ] **Step 2: Implement widget data bridge (React Native → Native)**
  - App 同步完成后将摘要数据写入本地存储（SharedPreferences 或 SQLite）
  - Native 小组件从本地存储读取数据
- [ ] **Step 3: Implement Kotlin widget provider**
  - 注册 `AppWidgetProvider` 或 Glance `GlanceAppWidget`
  - 配置 2×2 尺寸（`minWidth=110dp, minHeight=110dp`）
- [ ] **Step 4: Implement widget layout**
  - 头部区域：日期数字（~34sp）、星期（~16sp）、月份（~12sp）、"+" 按钮（圆形 ~30dp）
  - 列表区域：使用 `RemoteViews` + `ListView`（或 Glance `LazyColumn`）
  - 每个列表项：日期标签行 / 事件行（彩色竖条 + 标题 + 时间）/ 待办行（勾选框 + 标题 + 截止时间）
  - 事件标题 ~14sp，时间 ~11sp
- [ ] **Step 5: Hide scrollbar and implement fade hints**
  - ListView 设置 `scrollbars="none"`
  - 头部下方和列表底部通过渐变遮罩实现渐隐效果
- [ ] **Step 6: Implement click actions**
  - 点击事件/待办条目 → `PendingIntent` 跳转 App 对应详情页
  - 点击 "+" → 跳转 App 新建页面
- [ ] **Step 7: Implement theme support**
  - 根据 `Configuration.uiMode & UI_MODE_NIGHT_MASK` 判断深色/浅色
  - 分别定义两套颜色方案
- [ ] **Step 8: Implement refresh triggers**
  - App 同步完成后调用 `AppWidgetManager.notifyAppWidgetViewDataChanged`
  - 待办完成状态变更后触发
  - 事件增删改后触发
- [ ] **Step 9: Verify on Android 8+ emulator and physical device**
- [ ] **Step 10: Commit**

---

## Chunk 5: Advanced Calendar Features

### Task 13: Recurrence Rules & Exceptions

**Files:**
- Create: `packages/shared/src/recurrence.ts`
- Modify: `packages/shared/src/types.ts`
- Modify: `apps/web/src/components/event/EventForm.tsx`
- Modify: `apps/mobile/src/screens/`

**Acceptance:** 可创建每天/每周/每月/每年/工作日重复事件，可修改单次或跳过单次，日历视图正确展开重复实例。

- [ ] **Step 1: Implement recurrence module**
  - 封装 `rrule` 库：输入规则参数 → 输出 RRULE 字符串
  - 封装实例展开：输入 RRULE + 日期范围 → 输出该范围内的所有出现日期
  - 预设模板：每天、每周、每月、每年、每工作日
  - 自定义：每 N 天/周/月
  - 结束条件：指定日期 / 指定次数 / 永不
- [ ] **Step 2: Add recurrence UI to EventForm**
  - 重复规则选择下拉
  - 自定义重复弹窗（频率 + 间隔 + 结束条件）
- [ ] **Step 3: Implement exception handling**
  - 编辑重复事件时弹窗询问："仅修改本次" / "修改此事件及后续所有"
  - 删除重复事件时弹窗询问："仅删除本次" / "删除此事件及后续所有" / "删除所有"
  - "仅修改本次"→ 写入 `event_exceptions` 表（action=modify）
  - "仅跳过本次"→ 写入 `event_exceptions` 表（action=skip）
- [ ] **Step 4: Update all views to expand recurrence instances**
  - 查询视图日期范围内的事件时，展开重复规则为具体实例
  - 仅展开视图可见范围 + 前后缓冲（如前后各 1 个月），避免无限展开
  - 对高频查询的展开结果做内存缓存，事件修改时清除缓存
  - 应用 exceptions 覆盖或排除
- [ ] **Step 5: Verify on both web and mobile**
- [ ] **Step 6: Commit**

### Task 14: Reminder System

**Files:**
- Create: `apps/mobile/src/notifications/scheduler.ts`
- Modify: `packages/shared/src/types.ts`
- Modify: `apps/mobile/src/sync/`
- Modify: `apps/web/src/components/event/EventForm.tsx`

**Acceptance:** 事件/待办可设置多个提醒，手机端在指定时间弹出本地通知，新建事件自动使用默认提醒。

- [ ] **Step 1: Implement reminder CRUD**
  - 事件表单中的提醒列表组件
  - 可添加/删除提醒条目
  - 每条选择提前时间（5分钟/10分钟/30分钟/1小时/1天/自定义）
- [ ] **Step 2: Implement default reminders**
  - 新建事件时从 `user_settings.default_reminder_offsets` 自动填充
  - 用户可在表单中修改
- [ ] **Step 3: Integrate Expo Notifications (mobile)**
  - 请求通知权限
  - 同步完成后重新调度未来 14 天的所有通知
  - 使用 `Notifications.scheduleNotificationAsync` 设置本地通知
  - 通知内容：事件标题 + 时间 + "即将开始"
- [ ] **Step 4: Handle notification lifecycle**
  - 同步后清除旧通知、调度新通知
  - 事件被删除/修改时取消对应通知
  - 重复事件只调度最近 14 天内的实例通知
- [ ] **Step 5: Test foreground and background notification behavior**
- [ ] **Step 6: Commit**

### Task 15: Search, Settings Page & Color Classification

**Files:**
- Create: `apps/web/src/components/search/SearchPanel.tsx`
- Create: `apps/web/src/pages/settings.tsx`
- Create: `apps/mobile/src/screens/SettingsScreen.tsx`
- Create: `apps/mobile/src/screens/SearchScreen.tsx`

**Acceptance:** 搜索可按关键词查找事件和待办；设置页面可配置默认视图、起始日、默认提醒、默认时长、主题；双端设置同步。

- [ ] **Step 1: Implement search**
  - 电脑端：TopBar 搜索框，输入关键词后展开搜索结果面板
  - 手机端：搜索图标点击后进入搜索页面
  - 搜索范围：事件标题 + 描述 + 地点，待办标题 + 描述
  - 结果按时间排序，显示所属日历颜色
  - 点击搜索结果跳转到对应日期的视图（日视图或周视图）
  - Supabase 全文搜索或 `ilike` 查询
- [ ] **Step 2: Implement settings page (web)**
  - 默认视图选择（日/周/月/议程）
  - 每周起始日选择（周一/周日）
  - 默认提醒时间配置（可多个）
  - 默认事件时长选择
  - 主题切换（浅色/深色/跟随系统）
  - 保存时写入 `user_settings` 表
- [ ] **Step 3: Implement settings page (mobile)**
  - 同 web 端设置项
  - 通过 Supabase 同步，两端保持一致
- [ ] **Step 4: Implement color picker for calendars and events**
  - 预设 12 种颜色（对标 Google Calendar 调色板）
  - 日历创建/编辑时选择默认颜色
  - 事件创建/编辑时可选覆盖颜色
- [ ] **Step 5: Commit**

---

## Chunk 6: Sync Robustness & Non-Functional

### Task 16: Data Sync Robustness

**Files:**
- Create: `packages/shared/src/sync.ts`
- Modify: `apps/mobile/src/sync/`
- Modify: `apps/web/src/hooks/`

**Acceptance:** 双端编辑后数据正确同步，手机端下拉刷新有效，小组件在同步后自动刷新。

- [ ] **Step 1: Implement incremental sync**
  - 客户端记录最后同步时间戳
  - 拉取 `updated_at > last_sync_at` 的记录
  - 推送本地修改到服务端
- [ ] **Step 2: Implement Supabase Realtime subscription (web)**
  - Web 端订阅 events/todos/calendars 表变更
  - 变更时自动刷新本地状态
- [ ] **Step 3: Implement conflict resolution**
  - `last write wins` 策略
  - 冲突时保留 `updated_at` 较新的版本
  - 界面中显示"最后更新时间"供用户参考
- [ ] **Step 4: Implement widget refresh hooks**
  - 同步完成 → 更新本地缓存 → 触发 widget 刷新
  - 待办完成/取消 → 触发 widget 刷新
  - 事件增删改 → 触发 widget 刷新
- [ ] **Step 5: Verify cross-device sync**
  - 手机端修改 → 电脑端收到更新
  - 电脑端修改 → 手机端下拉刷新收到更新
  - 同步后小组件内容更新
- [ ] **Step 6: Commit**

### Task 17: Non-Functional Requirements

**Files:**
- Modify: `apps/web/src/` (error handling, loading states)
- Modify: `apps/mobile/src/` (error handling, loading states)
- Modify: `supabase/` (security rules)

**Acceptance:** 所有通信走 HTTPS，token 安全存储，网络异常有明确提示，恢复后自动重试同步。

- [ ] **Step 1: Security hardening**
  - 确认 Supabase 项目使用 HTTPS
  - 手机端 token 存储使用 `expo-secure-store`
  - Web 端 token 使用 httpOnly cookie 或安全的 localStorage 管理
  - 确认密码不以明文存储（Supabase Auth 默认满足）
- [ ] **Step 2: Error handling & loading states**
  - 所有数据操作添加 loading 状态指示
  - 网络请求失败时显示明确的错误提示（toast/snackbar）
  - 同步失败时显示"同步失败，请检查网络"提示
- [ ] **Step 3: Auto-retry on reconnect**
  - 手机端监听网络状态变化（`NetInfo`）
  - 网络恢复后自动尝试同步
  - 本地操作在离线时暂存队列，恢复后批量提交
- [ ] **Step 4: Performance checks**
  - 视图切换无明显卡顿
  - 大量事件（100+/月）时月视图渲染正常
  - 小组件滚动流畅
- [ ] **Step 5: Commit**

---

## Chunk 7: Phase 2 — Enhancements & AI

### Task 18: Offline Cache & Recovery

**Files:**
- Modify: `apps/mobile/src/sync/`
- Create: `packages/shared/src/offline-queue.ts`

- [ ] **Step 1: Cache recent 30 days data locally (SQLite/MMKV)**
- [ ] **Step 2: Queue offline edits with operation log**
- [ ] **Step 3: Flush queued edits after reconnect, handle conflicts**
- [ ] **Step 4: Verify no data loss in airplane mode → edit → reconnect flow**
- [ ] **Step 5: Commit**

### Task 19: Import/Export (ICS)

**Files:**
- Create: `packages/shared/src/ics.ts`
- Modify: `apps/web/src/pages/settings.tsx`

- [ ] **Step 1: Support ICS export for events (including recurrence)**
- [ ] **Step 2: Support basic ICS import**
- [ ] **Step 3: Validate imported time, recurrence, and reminder fields**
- [ ] **Step 4: Verify round-trip for common event shapes**
- [ ] **Step 5: Commit**

### Task 20: Keyboard Shortcuts (Desktop)

**Files:**
- Create: `apps/web/src/hooks/useKeyboardShortcuts.ts`
- Modify: `apps/web/src/pages/index.tsx`

- [ ] **Step 1: Implement global keyboard listener**
  - `c` → 打开新建事件表单
  - `t` → 跳转今天
  - `d` → 切换日视图，`w` → 周视图，`m` → 月视图，`a` → 议程视图
  - `Delete/Backspace` → 删除选中事件
  - `Esc` → 关闭弹窗/表单
- [ ] **Step 2: Show keyboard shortcuts help dialog**
  - `?` 键打开快捷键帮助弹窗
- [ ] **Step 3: Commit**

### Task 21: Timezone Support

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `apps/web/src/pages/settings.tsx`
- Modify: `apps/mobile/src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Add timezone fields to user_settings**
  - `default_timezone text`（如 `Asia/Shanghai`）
  - `secondary_timezone text NULL`（显示第二时区，可选）
- [ ] **Step 2: Implement timezone selector in settings page**
- [ ] **Step 3: Display secondary timezone in day/week view time labels**
- [ ] **Step 4: Commit**

### Task 22: Desktop Agent Prototype

**Files:**
- Create: `apps/desktop-agent/`
- Create: `apps/desktop-agent/src/main.ts`

- [ ] **Step 1: Implement task polling from Supabase `ai_tasks` table**
- [ ] **Step 2: Execute whitelisted local commands via child_process**
- [ ] **Step 3: Capture stdout/stderr and exit status**
- [ ] **Step 4: Upload execution result back to Supabase**
- [ ] **Step 5: Commit**

### Task 23: Mobile AI Task Submission

**Files:**
- Modify: `apps/mobile/src/screens/`
- Create: `packages/shared/src/ai-task.ts`
- Modify: `supabase/migrations/`

- [ ] **Step 1: Add `ai_tasks` table (id, user_id, command, status, result, created_at, completed_at)**
- [ ] **Step 2: Add AI task creation UI in mobile app**
- [ ] **Step 3: Show task status and result history**
- [ ] **Step 4: Verify behavior when desktop agent is offline**
- [ ] **Step 5: Commit**

---

## Delivery Recommendation

> **重要：Task 1 – Task 17 共同构成一期完整交付。** 以下阶段划分是开发顺序建议，而非发布优先级。一期完整交付需要全部 17 个 Task 完成后才满足需求.md 12.1 的所有一期需求。

建议开发顺序：

- [ ] **阶段 A（Desktop MVP）：** Task 1 → Task 8（Foundation + Desktop UI + CRUD + Undo）
- [ ] **阶段 B（Mobile）：** Task 9 → Task 12（Mobile 导航/视图/CRUD + Widget）
- [ ] **阶段 C（Advanced）：** Task 13 → Task 15（重复规则 + 提醒 + 搜索/设置）
- [ ] **阶段 D（Quality）：** Task 16 → Task 17（同步健壮性 + 非功能性）
- [ ] **阶段 E（Phase 2 Enhancement）：** Task 18 → Task 21（离线 + 导入导出 + 键盘快捷键 + 时区，按需）
- [ ] **阶段 F（Phase 2 AI）：** Task 22 → Task 23（确定核心日历稳定后启动）

注意事项：
- 阶段 A 期间用户设置使用数据库默认值（Task 2 seed data），设置 UI 在阶段 C（Task 15）实现
- 阶段 B 的手机端表单校验逻辑需从 shared 包复用，不在手机端重新实现

## Requirements Coverage Check

一期需求（需求.md 12.1）→ 任务对照：

| 需求项 | 覆盖任务 |
|--------|----------|
| 手机端 APK 可用 | Task 1, 9 |
| 安卓桌面小组件（2×2 可滚动，14 天） | Task 12 |
| 电脑端可用 | Task 1, 3 |
| 双端同步 | Task 2, 16 |
| 待办功能 | Task 7, 11 |
| 日程功能（含多提醒） | Task 6, 11, 14 |
| 多日历管理 | Task 3, 9（手机端抽屉菜单入口） |
| 重复规则（含年/工作日） | Task 13 |
| 提醒（多提醒 + 默认提醒） | Task 14 |
| 日视图 | Task 4 |
| 月视图 | Task 5, 10 |
| 周视图 | Task 4, 10 |
| 议程视图 | Task 5, 10 |
| 搜索 | Task 15（含点击搜索结果跳转到对应日期视图） |
| 颜色分类（日历级 + 事件级） | Task 3, 6, 15 |
| 全天/跨天事件 | Task 4, 5 |
| 拖拽调整时间与时长 | Task 6 |
| 点击时间槽快速创建 | Task 6 |
| 拖拽选区创建事件 | Task 6 |
| 事件快速预览弹窗 | Task 6 |
| 撤销操作 | Task 8, 11 |
| 设置页面 | Task 15 |
| 电脑端完整布局（顶部栏/迷你月历/日历列表/今天按钮） | Task 3 |
| 手机端完整交互（FAB/月视图收缩展开/滑动/下拉刷新/抽屉菜单） | Task 9, 10 |
| 整体 UI 接近 Google Calendar | Task 3-12 |
| 性能 / 安全 / 容错 | Task 17 |

## Final Recommendation

- [ ] 项目整体可行，一期聚焦"跨端同步 + 多日历 + 稳定提醒 + Google Calendar 级交互体验 + 2×2 可滚动小组件"
- [ ] 首发不必完全复刻 Google Calendar 所有细节，但核心布局和高频交互应高度接近
- [ ] 优先目标：尽快做出一个自己能每天使用的版本，在真实使用中迭代
- [ ] AI 联动有价值但放在二期，避免分散一期精力
