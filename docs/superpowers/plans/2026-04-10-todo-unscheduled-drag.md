# Todo Unscheduled Filter And Calendar Drop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `待定ddl` todo filter in the Web panel and allow any Web todo to be dragged onto the month view to assign its `due_date` while preserving `due_time`.

**Architecture:** Put the date-assignment semantics and filter classification into a shared pure helper so the critical behavior is covered by Vitest before any Web UI work begins. Then wire native HTML5 drag-and-drop through `TodoItem` -> `TodoList` -> `MonthView` -> `MainArea`, with `MainArea` remaining the only place that persists todo updates.

**Tech Stack:** TypeScript, React, Next.js, Vitest, workspace package exports

---

## Chunk 1: Shared Scheduling Semantics

### Task 1: Add failing tests for todo filter and date-assignment rules

**Files:**
- Create: `packages/shared/src/__tests__/todoScheduling.test.ts`
- Create: `packages/shared/src/todoScheduling.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert:
- `待定ddl` classification returns only todos with `due_date === null`
- `今天` and `即将到来` use a caller-provided `today` string instead of `new Date()` hidden inside the helper
- assigning a new `due_date` preserves `due_time`
- assigning the same date is treated as a no-op
- assignment preserves calendar id, completion status, and description

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=packages/shared -- todoScheduling`
Expected: FAIL because `todoScheduling.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement a shared helper module that exports:
- `type TodoFilterType = 'all' | 'today' | 'upcoming' | 'unscheduled'`
- `filterTodosByDateBucket(todos, filter, today)`
- `assignTodoDueDate(todo, nextDueDate)` returning either the unchanged todo signal or an updated todo payload with preserved `due_time`

Keep it focused on pure data rules only. No DOM, no drag event code, no storage access.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=packages/shared -- todoScheduling`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/__tests__/todoScheduling.test.ts packages/shared/src/todoScheduling.ts packages/shared/src/index.ts
git commit -m "test: add todo scheduling helpers"
```

## Chunk 2: Todo Panel Drag Source

### Task 2: Add the `待定ddl` tab and draggable todo rows

**Files:**
- Modify: `apps/web/src/components/todo/TodoList.tsx`
- Modify: `apps/web/src/components/todo/TodoItem.tsx`
- Modify: `apps/web/src/components/todo/TodoItem.module.css`
- Modify: `apps/web/src/components/todo/TodoList.module.css`
- Use: `packages/shared/src/todoScheduling.ts`

- [ ] **Step 1: Write the failing test**

Extend `packages/shared/src/__tests__/todoScheduling.test.ts` with any missing filter assertions needed by the UI mapping:
- `all` includes null-due and dated todos
- `unscheduled` excludes dated todos
- `upcoming` excludes null-due todos

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=packages/shared -- todoScheduling`
Expected: FAIL if the helper does not yet cover the new cases.

- [ ] **Step 3: Write minimal implementation**

Update the Web todo UI to:
- import the shared filter type/helper
- render four tabs: `全部`, `今天`, `即将到来`, `待定ddl`
- map `unscheduled` to the `待定ddl` label
- make each todo row draggable
- attach a payload containing the todo id plus a discriminator
- expose drag start/end state for styling

Do not couple the todo components directly to month-view date logic.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=packages/shared -- todoScheduling`
Expected: PASS

- [ ] **Step 5: Run build-level verification**

Run: `npm run build --workspace=apps/web`
Expected: PASS

## Chunk 3: Month View Drop Target And Persistence

### Task 3: Add month-cell drop handling and todo due-date persistence

**Files:**
- Modify: `apps/web/src/components/calendar/MonthView.tsx`
- Modify: `apps/web/src/components/calendar/MonthView.module.css`
- Modify: `apps/web/src/components/layout/MainArea.tsx`
- Use: `packages/shared/src/todoScheduling.ts`

- [ ] **Step 1: Write the failing test**

Add or extend shared tests so assignment behavior is locked before wiring UI:
- assigning `2026-04-15` to a todo with `due_time: '17:00:00'` preserves `due_time`
- assigning the same `due_date` returns a no-op signal

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=packages/shared -- todoScheduling`
Expected: FAIL until the helper fully describes assignment semantics.

- [ ] **Step 3: Write minimal implementation**

Implement:
- month-cell `dragenter`, `dragover`, `dragleave`, and `drop`
- local hovered-cell state in `MonthView`
- `onAssignTodoDate?: (todoId: string, date: Date) => void`
- a `MainArea` handler that:
  - resolves the todo by id
  - uses the shared helper to compute whether an update is needed
  - preserves `due_time`
  - updates local state in demo mode
  - calls `apiUpdateTodo` in Supabase mode

Keep drop behavior month-view only. Do not change week/day/agenda views.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=packages/shared -- todoScheduling`
Expected: PASS

- [ ] **Step 5: Run build-level verification**

Run: `npm run build --workspace=apps/web`
Expected: PASS

## Chunk 4: Final Verification

### Task 4: Run fresh end-to-end verification commands

**Files:**
- Modify: none

- [ ] **Step 1: Run shared scheduling tests**

Run: `npm run test --workspace=packages/shared -- todoScheduling`
Expected: PASS

- [ ] **Step 2: Run existing holiday/lunar regression tests**

Run: `npm run test --workspace=packages/shared -- chineseCalendar`
Expected: PASS

- [ ] **Step 3: Run shared package typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Run Web build**

Run: `npm run build --workspace=apps/web`
Expected: PASS

- [ ] **Step 5: Manual verification**

Check in the browser:
1. A todo without `due_date` appears under `待定ddl`
2. Dragging that todo onto a month cell assigns the cell date
3. A todo with `due_time` keeps the same time after drag-drop reassignment
4. Dropping on a gray previous/next-month cell assigns that exact date
5. Dragging to the same day produces no visible duplication or regression
