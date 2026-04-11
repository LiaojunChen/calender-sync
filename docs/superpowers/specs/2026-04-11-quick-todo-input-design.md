# Quick Todo Input Design

**Date:** 2026-04-11

**Goal**

Replace the Web todo panel's primary `新建待办` button with a fast inline input so entering a title and pressing Enter immediately creates a new todo with no assigned `due_date`, using the default calendar.

## Scope

This design applies to the Web app only.

In scope:
- The primary creation affordance at the top of the right-side todo panel
- Fast creation of todos with `due_date = null`
- Default calendar selection during quick create
- Reuse of the existing todo persistence flow in demo mode and Supabase mode
- Lightweight feedback for successful or failed quick creation

Out of scope:
- Mobile app changes
- Database schema changes
- Changing the existing full todo form used for edit or richer creation
- Inline editing of description, reminders, or calendar during quick create
- Bulk creation or paste-to-split behavior

## User-Confirmed Product Decisions

- The old top-level `新建待办` button should be replaced by an input field.
- Pressing Enter after typing a title should automatically create the todo.
- Newly created todos should start with no assigned deadline.
- Quick-created todos should be placed in the default calendar.

## Current Context

The Web todo panel lives in `apps/web/src/components/todo/TodoList.tsx`. It currently renders a top-level `新建待办` button and an empty-state `新建待办` button. Rich todo creation and editing use `TodoForm`, while persistence is coordinated by `handleSaveTodo` in `apps/web/src/components/layout/MainArea.tsx`.

The current data model already supports todos without deadlines because `due_date` and `due_time` are nullable. That means this feature can be implemented as a UI and flow optimization on top of existing persistence instead of introducing new storage concepts.

## Approaches Considered

### Approach A: Inline quick-create input plus existing full form for follow-up editing

Replace the top button with a single-line input. Enter creates a minimal todo immediately. Rich fields remain available by opening the existing edit form later.

Pros:
- Fastest path for the requested workflow
- Minimal implementation surface
- Keeps existing rich form intact
- Matches the mental model of "capture first, organize later"

Cons:
- Quick create exposes fewer fields up front
- Needs a small amount of inline state and error handling in the panel

### Approach B: Input that pre-fills and then opens the full todo form

Keep the typed title, but Enter opens `TodoForm` with the title and default calendar prefilled instead of creating immediately.

Pros:
- Reuses existing form validation and UX
- Gives access to all fields before save

Cons:
- Does not satisfy the requested "回车自动创建"
- Adds friction to quick capture

### Approach C: Input plus a secondary inline date/calendar mini-form

Embed a richer quick-create row with title plus compact metadata controls.

Pros:
- More power in one place

Cons:
- Larger UI change
- Higher visual complexity in a narrow side panel
- Solves more than the user asked for

## Chosen Approach

Use Approach A.

It directly matches the requested interaction, keeps the panel lighter than a modal-first flow, and fits the repo's current architecture because `MainArea` already owns todo creation for both demo mode and Supabase mode.

## Interaction Design

### Primary creation affordance

The top `新建待办` button is replaced with a single-line input field.

Behavior:
- Placeholder text communicates the shortcut, such as `输入待办标题，回车创建`
- Typing updates local input state only
- Pressing Enter with a non-empty trimmed title creates a todo immediately
- Pressing Enter with an empty or whitespace-only value does nothing

### Post-create behavior

After a successful create:
- The input is cleared
- Focus stays in the input so the user can create multiple todos quickly
- The new todo appears in the active list if it matches the current filter

Because quick-created todos have no `due_date`:
- They appear in `全部`
- They appear in `待定ddl`
- They do not appear in `今天` or `即将到来`

### Empty state behavior

The empty state should use the same quick-create interaction rather than preserving a separate `新建待办` button. This keeps the panel consistent and teaches one primary creation flow.

### Fallback rich editing

Quick create does not replace the detailed edit flow. After creation, the user can still click the todo row to open `TodoForm` and add description, reminders, due date, due time, or change its calendar.

## Data Flow

### New callback shape

`TodoList` receives a dedicated quick-create callback:
- `onQuickCreateTodo?: (title: string) => Promise<boolean> | boolean`

Responsibilities:
- `TodoList` owns the transient input state
- `MainArea` owns persistence and calendar selection

The boolean result indicates whether creation succeeded. This allows the input to clear only after a confirmed success.

### Calendar resolution

`MainArea` determines the target calendar in this order:
- The calendar marked `is_default`
- Otherwise the first writable calendar

If there is no writable calendar, quick create safely no-ops.

### Persistence behavior

Quick create uses the same demo-mode and Supabase-mode branching already used by normal todo creation:
- `title`: trimmed input
- `calendar_id`: resolved default calendar
- `description`: `null`
- `due_date`: `null`
- `due_time`: `null`
- `is_completed`: `false`

This should share as much logic as practical with the existing creation path so that quick create and form create stay behaviorally aligned.

## Component Responsibilities

### `apps/web/src/components/todo/TodoList.tsx`

Responsibilities:
- Replace the top button with an input wrapper
- Handle local title state
- Submit on Enter
- Clear only after successful creation
- Keep focus in the field after successful creation
- Render the same quick-create affordance in empty state

Non-responsibilities:
- No calendar resolution
- No direct persistence

### `apps/web/src/components/layout/MainArea.tsx`

Responsibilities:
- Resolve the default writable calendar
- Create the todo in demo mode or Supabase mode
- Return success/failure to the panel

Non-responsibilities:
- No input rendering
- No panel-local keyboard handling

## Error Handling

- Empty title: ignore safely
- No writable/default calendar: do not create, keep the input text unchanged
- Supabase create failure: keep the input text unchanged so the user does not lose what they typed
- Duplicate titles: allowed, matching current todo behavior

No toast is required for the first version. Silent failure with preserved input is acceptable because it avoids accidental data loss and keeps the implementation narrow.

## Visual Design

Keep the panel's current visual language and replace the button with a compact inline input block.

Visual requirements:
- Full-width field aligned to the panel padding
- Subtle border and focus ring using the existing design tokens
- Optional leading plus icon is acceptable if it helps affordance, but the field should still read as an input first, not a button
- The input should feel lighter and more immediate than the old CTA button

The empty state version can be visually simpler but should use the same input styling language.

## Testing Strategy

### Behavior to verify

- Enter on non-empty input creates a new todo with `due_date = null`
- The quick-created todo uses the default calendar
- The input clears only after successful creation
- The input remains populated when creation fails
- The new todo is visible in `全部` and `待定ddl`
- The new todo is absent from `今天` and `即将到来`

### Verification levels

- Shared logic tests are not required unless new pure helpers are extracted
- Web build and typecheck must pass
- Manual verification in the Web panel is important because this is a keyboard-driven interaction change

## Success Criteria

- Users can create an unscheduled todo from the Web todo panel by typing a title and pressing Enter
- The created todo is assigned to the default calendar
- The top-level button is no longer the primary creation affordance
- Existing todo edit and scheduling flows continue to work unchanged
