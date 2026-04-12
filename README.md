# Project Calendar

个人跨端日程待办管理系统，支持 **Android APK + 桌面网页**，UI 对标 Google Calendar。

## 功能特性

- 多日历管理（颜色分类、显示/隐藏）
- 日程事件：日/周/月/议程四视图、重复规则、多提醒
- 待办事项：截止日期、关联日历、多提醒
- 拖拽创建/移动事件（桌面端）
- 撤销删除操作
- 搜索事件和待办
- 深色/浅色/跟随系统主题
- Android 桌面 2×2 可滚动小组件
- 双端实时同步（Supabase）

---

## 快速开始

### 前置条件

| 工具 | 版本要求 |
|------|----------|
| Node.js | 18+ |
| npm | 9+ |
| Git | 任意 |

### 1. 克隆并安装依赖

```bash
git clone https://github.com/LiaojunChen/calender-sync.git
cd calender-sync
npm install
```

---

## 桌面端（Windows 浏览器）

### 无需 Supabase 的演示模式

不需要任何配置，直接运行即可体验所有 UI 功能（数据存在内存中，刷新后重置）：

```bash
npm run dev
```

打开浏览器访问：**http://localhost:3000**

登录页面点击 **"演示模式"** 按钮，无需注册即可进入。

### 连接 Supabase（数据持久化）

1. 注册 [Supabase](https://supabase.com) 免费账号，新建项目
2. 进入项目 → **SQL Editor**，粘贴并执行以下文件内容：
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. 在项目根目录 `apps/web/` 下创建 `.env.local`：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_key
   ```
   （URL 和 Key 在 Supabase 控制台 → Project Settings → API 中找到）
4. 重新启动：
   ```bash
   npm run dev
   ```
5. 在登录页使用邮箱注册新账号

### 生产构建

```bash
npm run build        # 构建
npm start            # 启动生产服务器（apps/web/）
```

### 部署到 GitHub Pages

仓库已支持通过 GitHub Actions 自动部署 `apps/web` 到 GitHub Pages。默认行为如下：

- 推送到 `main` 分支后自动重新构建并发布
- 项目仓库默认部署到 `https://<用户名>.github.io/<仓库名>/`
- 若仓库名是 `<用户名>.github.io`，则自动部署到站点根路径
- 若未配置 Supabase 环境变量，网站仍可用演示模式打开

#### 需要的仓库配置

1. 进入 GitHub 仓库 → **Settings** → **Pages**
2. 在 **Build and deployment** 中选择 **Source = GitHub Actions**
3. 进入 **Settings** → **Secrets and variables** → **Actions**，添加以下 secrets：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_key
   ```
4. 如果你使用自定义域名，或需要手动覆盖默认子路径，在 **Variables** 中添加：
   ```env
   PAGES_BASE_PATH_OVERRIDE=/你的子路径
   ```
   若仓库使用自定义域名并部署在根路径，可将 `PAGES_BASE_PATH_OVERRIDE` 设为 `/`。

#### 部署流程

```bash
git add apps/web/next.config.ts .github/workflows/deploy-pages.yml README.md
git commit -m "chore: deploy web to github pages"
git push
```

首次推送后，打开 GitHub 的 **Actions** 页面，等待 `Deploy GitHub Pages` 工作流完成。

---

## Android APK

### 方式一：使用 Expo Go 快速预览（无需构建）

1. 手机安装 [Expo Go](https://expo.dev/go)（Android / iOS 均可）
2. 电脑运行：
   ```bash
   npm run dev:mobile
   ```
3. 用 Expo Go 扫描终端中的二维码

> **注意：** 此方式无法使用 Android 桌面小组件，小组件需要构建原生 APK。

### 方式二：构建 APK（EAS Build，推荐）

#### 前置要求

- 安装 EAS CLI：
  ```bash
  npm install -g eas-cli
  ```
- 注册 [Expo 账号](https://expo.dev)

#### 步骤

1. 配置环境变量（可选，连接 Supabase）：

   在 `apps/mobile/` 下创建 `.env`：
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=你的anon_key
   ```

2. 登录 EAS：
   ```bash
   eas login
   ```

3. 在 `apps/mobile/` 目录下初始化 EAS 配置（首次使用）：
   ```bash
   cd apps/mobile
   eas build:configure
   ```

4. 构建 APK：
   ```bash
   # 构建 .apk（可直接安装，无需 Google Play）
   eas build --platform android --profile preview
   ```
   构建完成后会提供下载链接，下载 `.apk` 文件。

5. 安装到 Android 手机：
   - 将 APK 传输到手机（USB / 微信文件传输等）
   - 手机开启"允许安装未知来源应用"
   - 点击 APK 文件安装

#### 本地构建（需要本机安装 Android SDK）

```bash
cd apps/mobile
npx expo prebuild --platform android   # 生成 android/ 原生代码
npx expo run:android                   # 编译并安装到已连接设备/模拟器
```

> **Windows 用户注意：** 需要安装 Android Studio 并配置 ANDROID_HOME 环境变量。

---

## 桌面小组件（Android）

安装 APK 后：
1. 长按桌面空白区域 → 小组件
2. 找到 **Project Calendar** → 选择 2×2 尺寸
3. 放置到桌面

小组件显示未来 14 天的日程和待办，支持上下滚动，点击条目跳转 App。

---

## 运行测试

```bash
npm test                    # 运行所有单元测试（packages/shared）
npm run test:coverage       # 带覆盖率报告
```

当前测试：**285 个测试，8 个测试文件**，覆盖：
- 日期工具函数（date-utils）
- 表单校验（validators）
- 小组件数据聚合（widgetUtils）
- 重复规则展开（recurrence）
- 通知调度（notificationUtils）
- 搜索过滤（searchUtils）
- 数据同步合并（sync）
- 网络重连检测（networkUtils）

---

## 项目结构

```
apps/
  mobile/          Android App（Expo React Native）
    android/         原生 Android 代码（含 Kotlin 小组件）
    src/
      screens/       页面（日历、待办、表单、设置等）
      components/    UI 组件
      navigation/    导航配置
      notifications/ 本地通知调度
      widget/        小组件数据桥接
  web/             桌面 Web（Next.js）
    src/
      app/           页面路由
      components/    UI 组件（calendar/event/todo/layout/common）
      contexts/      全局状态（AppContext）
      hooks/         自定义 Hooks
      lib/           工具库（Supabase 客户端等）
packages/
  shared/          双端共享代码
    src/
      types.ts         领域类型定义
      date-utils.ts    日期工具
      recurrence.ts    重复规则（rrule）
      sync.ts          同步与冲突处理
      validators.ts    表单校验
      searchUtils.ts   搜索过滤
      widgetUtils.ts   小组件数据聚合
      notificationUtils.ts  通知调度逻辑
      auth.ts          认证封装
      api.ts           Supabase CRUD 封装
supabase/
  migrations/      数据库迁移 SQL
  schema.sql       完整 Schema 参考
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面端 | Next.js 16 (App Router) + TypeScript |
| 移动端 | Expo SDK 54 + React Native 0.81 |
| Android 小组件 | Kotlin + Jetpack AppWidget / RemoteViews |
| 后端/数据库 | Supabase (PostgreSQL + Auth + Realtime) |
| 共享逻辑 | TypeScript monorepo (npm workspaces) |
| 重复规则 | rrule (RFC 5545) |
| 本地通知 | Expo Notifications |
| 测试 | Vitest |

---

## 常见问题

**Q: 演示模式的数据会保存吗？**
不会，演示模式数据存在内存中，刷新页面后重置。需要连接 Supabase 才能持久化。

**Q: Supabase 在国内访问慢怎么办？**
Supabase 服务器在海外，国内访问可能有延迟。如不可接受，可自建后端（NestJS/FastAPI + PostgreSQL 部署到国内云服务商）并替换 Supabase 客户端调用。

**Q: APK 安装时提示"解析包时出现问题"？**
确认手机 Android 版本 ≥ 8.0（API 26）。如使用本地构建，确认 `minSdkVersion` 设置正确。

**Q: 小组件不显示数据？**
小组件读取 App 写入的本地缓存。需先打开 App 并加载一次数据，小组件才会有内容显示。
