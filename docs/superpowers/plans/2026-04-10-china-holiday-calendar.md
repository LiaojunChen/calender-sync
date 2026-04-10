# China Holiday Calendar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize lunar date labels in the month view and add a built-in `中国节假日` calendar containing 2026-2028 holiday and traditional festival events.

**Architecture:** Move Chinese lunar formatting and holiday generation into a shared pure module so both data generation and formatting are testable in Node. Keep the built-in holiday calendar out of the database layer: inject the synthetic calendar and its events in the web app after remote/demo data is loaded, and treat the calendar as read-only in the sidebar and event creation flows.

**Tech Stack:** TypeScript, Vitest, React, Next.js, shared workspace package

---

## Chunk 1: Shared Calendar Logic

### Task 1: Add failing lunar-format tests

**Files:**
- Create: `packages/shared/src/__tests__/chineseCalendar.test.ts`
- Create: `packages/shared/src/chineseCalendar.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert:
- `getLunarDateDisplay(new Date('2026-02-17')) === '正月'`
- `getLunarDateDisplay(new Date('2026-02-21')) === '初五'`
- `getLunarDateDisplay(new Date('2026-03-03')) === '十五'`
- `getLunarDateDisplay(new Date('2026-03-11')) === '廿三'`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=packages/shared -- chineseCalendar`
Expected: FAIL because the shared module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement a shared formatter that:
- uses `Intl.DateTimeFormat('zh-u-ca-chinese', ...)`
- converts numeric lunar day values to `初一`..`三十`
- returns lunar month name on day 1, otherwise returns the lunar day label

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=packages/shared -- chineseCalendar`
Expected: PASS

### Task 2: Add failing holiday generation tests

**Files:**
- Modify: `packages/shared/src/__tests__/chineseCalendar.test.ts`
- Modify: `packages/shared/src/chineseCalendar.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert:
- `buildChinaHolidayCalendar('demo-user')` includes a synthetic calendar named `中国节假日`
- generated events cover `2026`, `2027`, `2028`
- `2026` contains official holiday spans such as `春节` and `国庆节`
- traditional festivals include `元宵节`, `端午节`, `七夕节`, `中秋节`, `重阳节`, `腊八节`, `小年`, `除夕`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=packages/shared -- chineseCalendar`
Expected: FAIL because holiday generation is not implemented yet.

- [ ] **Step 3: Write minimal implementation**

Implement:
- a reserved built-in calendar id constant
- a helper to append the calendar once
- a helper to generate all-day events for 2026-2028
- official 2026 holiday spans from the State Council notice
- 2027-2028 fixed-date and lunar-date festivals without guessed makeup-work days

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=packages/shared -- chineseCalendar`
Expected: PASS

## Chunk 2: Web Integration

### Task 3: Wire shared lunar formatting back into month view

**Files:**
- Modify: `apps/web/src/lib/lunarCalendar.ts`
- Modify: `apps/web/src/components/calendar/MonthView.tsx`

- [ ] **Step 1: Write the failing integration expectation mentally against existing shared tests**

Use the shared tests as the source of truth; no separate web test harness is available.

- [ ] **Step 2: Write minimal implementation**

Make the web helper delegate to the shared lunar formatter so the rendered `公历（农历）` label uses normalized Chinese day names.

- [ ] **Step 3: Run targeted verification**

Run: `npm run test --workspace=packages/shared -- chineseCalendar`
Expected: PASS and Web import compiles.

### Task 4: Inject the built-in 中国节假日 calendar

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/components/auth/LoginForm.tsx`
- Modify: `apps/web/src/components/layout/MainArea.tsx`
- Modify: `apps/web/src/components/calendar/CalendarList.tsx`
- Modify: `apps/web/src/components/common/CreateForm.tsx`
- Modify: `apps/web/src/components/event/EventForm.tsx`
- Modify: `apps/web/src/components/todo/TodoForm.tsx`

- [ ] **Step 1: Write the failing test**

Rely on shared tests for data-shape guarantees, then verify the web build/typecheck after integration.

- [ ] **Step 2: Run verification to expose current gap**

Run: `npm run build --workspace=apps/web`
Expected: existing code builds without the holiday integration but does not expose the built-in holiday calendar.

- [ ] **Step 3: Write minimal implementation**

Update the web app to:
- merge the synthetic holiday calendar into loaded/demo calendars
- merge generated holiday events into rendered events
- allow visibility toggling
- block edit/delete UI and backend writes for the built-in calendar
- keep the built-in calendar out of user event/todo creation selects

- [ ] **Step 4: Run verification**

Run: `npm run build --workspace=apps/web`
Expected: PASS

## Chunk 3: Final Verification

### Task 5: Run fresh verification commands

**Files:**
- Modify: none

- [ ] **Step 1: Run shared tests**

Run: `npm run test --workspace=packages/shared -- chineseCalendar`
Expected: PASS

- [ ] **Step 2: Run package typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run web build**

Run: `npm run build --workspace=apps/web`
Expected: PASS
