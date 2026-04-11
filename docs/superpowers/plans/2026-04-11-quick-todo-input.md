# Quick Todo Input Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Web todo panel's top-level `新建待办` button with an inline input that creates a default-calendar todo with no assigned deadline when the user presses Enter.

**Architecture:** Keep the change narrow by making `TodoList` own only the transient quick-create input state and keyboard interaction, while `MainArea` remains the single persistence coordinator. Reuse the existing todo creation branches for demo mode and Supabase mode so quick-create and form-based create stay behaviorally aligned.

**Tech Stack:** TypeScript, React, Next.js, existing shared todo types and Web component styles

---

## Chunk 1: Quick-Create Panel UI

### Task 1: Replace the primary panel button with an inline quick-create input

**Files:**
- Modify: `apps/web/src/components/todo/TodoList.tsx`
- Modify: `apps/web/src/components/todo/TodoList.module.css`

- [ ] **Step 1: Review the current todo panel creation affordances**

Confirm where the top-level `新建待办` button and empty-state button are rendered, and note which props currently drive creation.

- [ ] **Step 2: Write the failing test or define the smallest verifiable behavior**

Because there is no existing Web component test harness in this repo, lock the behavior as an implementation checklist before coding:
- The top CTA becomes an input
- Enter on non-empty trimmed text calls a new quick-create callback
- Empty text does nothing
- The input only clears after a successful callback result
- The empty state uses the same input interaction instead of a button

- [ ] **Step 3: Write minimal UI implementation**

Update `TodoList.tsx` to:
- replace `onNewTodo` with a new quick-create prop
- add local title state plus submitting state
- submit on Enter only
- preserve the typed title if quick create fails
- keep the existing detailed edit flow for clicking todo rows

Update `TodoList.module.css` to:
- replace button styles with an inline input container
- add focus, placeholder, and disabled/loading affordances consistent with the panel's current visual language
- style the empty-state quick-create input so it feels like the same pattern

- [ ] **Step 4: Perform local code review of UI state handling**

Check for:
- duplicate submissions while a request is in flight
- trimmed-title handling
- no accidental removal of the close button, filters, pinned grouping, or completed section

## Chunk 2: Default-Calendar Quick Create Flow

### Task 2: Add a `MainArea` quick-create handler that persists an unscheduled todo

**Files:**
- Modify: `apps/web/src/components/layout/MainArea.tsx`
- Use: `apps/web/src/components/todo/TodoList.tsx`

- [ ] **Step 1: Identify the existing todo create path to reuse**

Review `handleSaveTodo`, writable calendar filtering, and current props passed into `TodoList` so the quick-create path does not fork behavior unnecessarily.

- [ ] **Step 2: Write the failing test or define the smallest verifiable behavior**

Because the existing repo does not include a focused `MainArea` test harness for this path, define the behavior checklist before implementation:
- resolve the default calendar first
- fall back to the first writable calendar if no default exists
- create a todo with `due_date = null` and `due_time = null`
- return `true` only on confirmed success
- return `false` and preserve UI input when no writable calendar or remote create failure occurs

- [ ] **Step 3: Write minimal implementation**

Update `MainArea.tsx` to:
- add a `handleQuickCreateTodo(title)` callback
- resolve the calendar from `writableCalendars`
- create a minimal todo payload that matches the existing create shape
- reuse demo-mode local insertion and Supabase-mode `apiCreateTodo`
- pass the callback into `TodoList`

Do not remove the existing full `TodoForm` creation flow. It still supports richer fields.

- [ ] **Step 4: Perform local code review of persistence semantics**

Check for:
- `title.trim()` consistency
- preserving form-based create behavior
- no accidental use of read-only holiday calendars
- correct boolean success/failure return values

## Chunk 3: Verification

### Task 3: Run fresh verification commands after implementation

**Files:**
- Modify: none

- [ ] **Step 1: Run shared scheduling regression tests**

Run: `npm run test --workspace=packages/shared -- todoScheduling`
Expected: PASS

- [ ] **Step 2: Run existing holiday/lunar regression tests**

Run: `npm run test --workspace=packages/shared -- chineseCalendar`
Expected: PASS

- [ ] **Step 3: Run shared typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Run Web build**

Run: `npm run build --workspace=apps/web`
Expected: PASS

- [ ] **Step 5: Manual verification**

Check in the browser:
1. Typing a title into the top input and pressing Enter creates a todo in the default calendar
2. The new todo has no deadline and appears under `全部` and `待定ddl`
3. The input clears after success and keeps focus for another entry
4. Empty Enter does nothing
5. Existing click-to-edit and drag-to-month behaviors still work
