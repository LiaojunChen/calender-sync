# Todo Unscheduled Filter And Calendar Drop Design

**Date:** 2026-04-10

**Goal**

Add a `待定ddl` filter to the Web todo panel for todos without a `due_date`, and allow any incomplete or complete todo in the panel to be dragged onto the Web month view so dropping it on a day assigns that day as the todo's `due_date` while preserving any existing `due_time`.

## Scope

This design applies to the Web app only.

In scope:
- Todo panel filter tabs in the right-side Web todo panel
- Drag start from Web todo rows
- Drop targets in the Web month view day cells
- Todo persistence through the existing demo and Supabase flows
- Visual affordances for drag and drop state

Out of scope:
- Mobile app drag-and-drop
- Week/day/agenda view drop targets
- New backend schema or migration work
- Changing `due_time` during drop
- Multi-select or bulk todo scheduling

## User-Confirmed Product Decisions

- The new filter label is `待定ddl`.
- `待定ddl` contains todos whose `due_date` is `null`.
- All todos in the panel can be dragged, not only unscheduled todos.
- Dropping onto a day updates `due_date` only and preserves the original `due_time`.
- Dropping on gray overflow cells from the previous or next month is allowed because those cells still represent valid dates.

## Current Context

The Web todo panel is implemented in `apps/web/src/components/todo/TodoList.tsx` and currently supports `全部`, `今天`, and `即将到来`. The month view is implemented in `apps/web/src/components/calendar/MonthView.tsx`. Todo create and update persistence already flows through `handleSaveTodo` in `apps/web/src/components/layout/MainArea.tsx`, which supports both demo mode and Supabase-backed mode.

There is already drag-related logic elsewhere in the Web calendar for timed events, but month-view todo assignment is currently independent from that system. This feature should reuse the existing persistence path for todos instead of introducing a parallel data layer.

## Approaches Considered

### Approach A: Native HTML5 drag and drop with `MainArea` as the update coordinator

Todo rows become draggable, month cells become drop targets, and `MainArea` owns the assignment handler that writes `due_date`.

Pros:
- Minimal surface area
- Fits the current component boundaries
- No new dependency
- Easy to keep demo and Supabase behavior consistent

Cons:
- Desktop-focused
- Limited custom drag preview

### Approach B: Custom pointer-driven drag system

Track drag state globally, render a custom drag overlay, and compute hover targets manually.

Pros:
- More control
- Better path to touch support

Cons:
- Much larger implementation
- Higher regression risk in month view interactions
- Unnecessary for the requested scope

### Approach C: Date assignment mode instead of true dragging

Use a "choose date" interaction triggered from the todo row, then click a day in the month view.

Pros:
- Simple implementation

Cons:
- Does not satisfy the requested drag interaction

## Chosen Approach

Use Approach A.

It is the narrowest change that satisfies the requested interaction without destabilizing the rest of the calendar UI. It keeps component responsibilities clear:
- `TodoList` and `TodoItem` initiate drag
- `MonthView` accepts drops and identifies the target day
- `MainArea` performs the update and persistence

## Interaction Design

### Todo panel filters

Add a fourth filter tab:
- `全部`
- `今天`
- `即将到来`
- `待定ddl`

Filter definitions:
- `全部`: all non-deleted todos
- `今天`: `due_date === today`, where `today` is computed from the browser's local calendar date
- `即将到来`: `due_date > today`, using the same browser-local date basis
- `待定ddl`: `due_date === null`

The completed section remains part of the active filter. This means completed todos with no `due_date` also appear in `待定ddl`.

### Drag source behavior

Every todo row in the panel is draggable.

Drag start behavior:
- Attach the todo id to the drag payload
- Mark the source row as dragging for visual feedback
- Keep existing click targets functional when not dragging

Drag end behavior:
- Remove dragging visual state even if the drop is cancelled

### Drop target behavior

Every month-view date cell is a valid drop target.

Hover behavior:
- When a todo is dragged over a date cell, highlight the entire cell
- Only one cell is highlighted at a time

Drop behavior:
- Read the todo id from the payload
- Resolve the cell's calendar date
- Call a single assignment callback
- If the todo already has that `due_date`, do nothing
- If the drop payload is invalid or missing, ignore it safely

### Post-drop behavior

The updated todo immediately moves to the appropriate filter bucket:
- If dropped while viewing `待定ddl`, it disappears from that list because it now has a date
- If dropped while viewing `今天` or `即将到来`, it appears only when the assigned date matches that filter

No toast or snackbar is required for the first version.

## Data Flow

### Source payload

`TodoItem` writes a payload containing:
- a discriminator so month view can ignore unrelated drags
- the todo id

The payload is transient UI state only. It is not stored in React context.

### Assignment callback

`MonthView` receives:
- `onAssignTodoDate?: (todoId: string, date: Date) => void`

When a drop succeeds, `MonthView` invokes that callback with the dropped todo id and the cell date.

### Persistence path

`MainArea` adds a dedicated handler for drag-based date assignment:
- Find the todo by id in current state
- Compute the target ISO date
- Return early if nothing changes
- Update local state in demo mode
- Call the existing todo update API in Supabase mode
- Preserve `due_time`
- Preserve `calendar_id`, completion status, description, and all other fields

This handler should reuse the same update shape already used by `handleSaveTodo` so behavior stays consistent across manual edit and drag assignment.

## Component Responsibilities

### `apps/web/src/components/todo/TodoList.tsx`

Responsibilities:
- Extend filter state with `unscheduled`
- Render the new filter tab
- Pass drag callbacks into todo rows

Non-responsibilities:
- No persistence
- No direct month-view coupling

### `apps/web/src/components/todo/TodoItem.tsx`

Responsibilities:
- Expose a draggable row wrapper
- Manage drag start/end DOM events
- Keep existing row actions intact

Non-responsibilities:
- No calendar date logic
- No persistence

### `apps/web/src/components/calendar/MonthView.tsx`

Responsibilities:
- Track hovered drop date locally
- Accept todo drops on date cells
- Invoke `onAssignTodoDate`

Non-responsibilities:
- No todo persistence
- No todo filtering logic

### `apps/web/src/components/layout/MainArea.tsx`

Responsibilities:
- Own the drag-drop assignment handler
- Persist updates in demo or Supabase mode
- Pass the callback into `MonthView`

Non-responsibilities:
- No drag UI rendering

## Error Handling

- Invalid drag payload: ignore safely
- Unknown todo id: ignore safely
- Drop onto same date: no-op
- Supabase update failure: keep behavior aligned with existing optimistic/non-optimistic todo update flow; do not invent a new rollback system just for drag assignment

For the initial implementation, failed remote updates may simply result in no visible change after refresh if the API call fails, which matches the current lightweight todo update approach more closely than introducing a bespoke undo flow.

## Visual Design

Keep the current visual language.

Add only narrow affordances:
- Todo row in dragging state: reduced opacity or subtle lift
- Month cell in drop-hover state: tinted background and/or inner outline using existing accent variables

Do not redesign the todo panel or month view layout for this feature.

## Testing Strategy

### Unit/component-level targets

- `TodoList` filter logic includes `待定ddl`
- Todos with `due_date === null` appear only in `待定ddl` and `全部`
- Todos with real dates do not appear in `待定ddl`
- Drag assignment handler preserves `due_time`
- Drag assignment handler no-ops on same date

### Verification targets

- Web build passes
- Existing shared type checks remain clean

Manual verification checklist:
1. Create a todo without a due date and confirm it appears under `待定ddl`
2. Drag that todo onto a day in month view and confirm it disappears from `待定ddl`
3. Drag a todo that already has a time and confirm the time remains unchanged
4. Drag a todo from one scheduled day to another and confirm only the date changes
5. Drop on an adjacent gray month cell and confirm the correct date is assigned

## Non-Goals And Guardrails

- Do not add external drag-and-drop libraries
- Do not refactor the event drag system as part of this feature
- Do not add week/day/agenda drop support in the same change
- Do not change todo schema or introduce migration work
- Do not change `due_time` on drop
