'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { getSupabaseClient } from '@/lib/supabase';
import {
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  softDeleteEvent as apiSoftDeleteEvent,
  getEvents as apiGetEvents,
  setRemindersForEvent,
  createTodo as apiCreateTodo,
  updateTodo as apiUpdateTodo,
  softDeleteTodo as apiSoftDeleteTodo,
  toggleTodoCompleted as apiToggleTodoCompleted,
  getTodos as apiGetTodos,
  setRemindersForTodo,
  createRecurrenceRule as apiCreateRecurrenceRule,
} from '@project-calendar/shared';
import type { Event, Calendar, Todo } from '@project-calendar/shared';
import { addDays, startOfMonth, endOfMonth, addMonths, startOfWeek, endOfWeek } from '@project-calendar/shared';
import { useUndo } from '@/hooks/useUndo';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import {
  useExpandedEvents,
  type EventWithRrule,
  type LocalException,
} from '@/hooks/useExpandedEvents';
import Snackbar from '@/components/common/Snackbar';
import Spinner from '@/components/common/Spinner';
import CreateForm from '@/components/common/CreateForm';
import DayView from '@/components/calendar/DayView';
import WeekView from '@/components/calendar/WeekView';
import MonthView from '@/components/calendar/MonthView';
import AgendaView from '@/components/calendar/AgendaView';
import EventForm from '@/components/event/EventForm';
import EventPreview from '@/components/event/EventPreview';
import RecurrenceActionDialog, {
  type RecurrenceEditAction,
  type RecurrenceDeleteAction,
} from '@/components/event/RecurrenceActionDialog';
import TodoForm from '@/components/todo/TodoForm';
import TodoList from '@/components/todo/TodoList';
import type { EventFormData } from '@/components/event/EventForm';
import type { TodoFormData } from '@/components/todo/TodoForm';
import { generateDemoEvents, generateDemoTodos, DEMO_CALENDARS } from '@/lib/demo-events';
import styles from './MainArea.module.css';

// ============================================================
// Helpers
// ============================================================

let demoIdCounter = 100;
function nextDemoId(): string {
  return `demo-local-${++demoIdCounter}`;
}

let demoTodoIdCounter = 200;
function nextDemoTodoId(): string {
  return `demo-todo-local-${++demoTodoIdCounter}`;
}

function buildDateTimeISO(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

/** Get the expanded range for the current view (+ 1-month buffer) */
function getViewRange(view: string, currentDate: Date): { start: Date; end: Date } {
  switch (view) {
    case 'day': {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 30);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      end.setDate(end.getDate() + 30);
      return { start, end };
    }
    case 'week': {
      const weekStart = startOfWeek(currentDate, 1);
      const start = addDays(weekStart, -30);
      const weekEnd = endOfWeek(currentDate, 1);
      const end = addDays(weekEnd, 30);
      return { start, end };
    }
    case 'month': {
      const monthStart = startOfMonth(currentDate);
      const start = addDays(monthStart, -35);
      const monthEnd = endOfMonth(currentDate);
      const end = addDays(monthEnd, 35);
      return { start, end };
    }
    case 'agenda':
    default: {
      const start = addMonths(currentDate, -1);
      const end = addMonths(currentDate, 3);
      return { start, end };
    }
  }
}

// ============================================================
// Component
// ============================================================

export default function MainArea() {
  const { state, dispatch, navigatePrev, navigateNext, navigateToday } = useAppContext();

  // Undo / Snackbar
  const { addUndoable, undoLast, dismissSnackbar, snackbarState } = useUndo();

  // Realtime sync: keep local state in sync with server changes
  useRealtimeSync(
    state.isAuthenticated ? getSupabaseClient() : null,
    state.userId,
    dispatch,
  );

  // Use real calendars if available, fall back to demo
  const calendars = state.calendars.length > 0 ? state.calendars : DEMO_CALENDARS;
  // isDemoMode: true when using local demo calendars (no real Supabase account)
  const isDemoMode = state.userId === 'demo-user' || state.calendars.length === 0;

  // Events: use context state, initialize with demo events in demo mode
  useEffect(() => {
    if (isDemoMode && state.events.length === 0) {
      const demoEvents = generateDemoEvents(state.currentDate);
      dispatch({ type: 'SET_EVENTS', events: demoEvents });
    }
  }, [isDemoMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Todos: initialize with demo todos in demo mode
  useEffect(() => {
    if (isDemoMode && state.todos.length === 0) {
      const demoTodos = generateDemoTodos(state.currentDate);
      dispatch({ type: 'SET_TODOS', todos: demoTodos });
    }
  }, [isDemoMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch events from Supabase when authenticated
  useEffect(() => {
    if (isDemoMode || !state.isAuthenticated) return;
    const client = getSupabaseClient();
    if (!client) return;

    (async () => {
      const result = await apiGetEvents(client);
      if (result.data) {
        dispatch({ type: 'SET_EVENTS', events: result.data as unknown as Event[] });
      }
    })();
  }, [isDemoMode, state.isAuthenticated, dispatch]);

  // Fetch todos from Supabase when authenticated
  useEffect(() => {
    if (isDemoMode || !state.isAuthenticated) return;
    const client = getSupabaseClient();
    if (!client) return;

    (async () => {
      const result = await apiGetTodos(client);
      if (result.data) {
        dispatch({ type: 'SET_TODOS', todos: result.data as unknown as Todo[] });
      }
    })();
  }, [isDemoMode, state.isAuthenticated, dispatch]);

  const rawEvents = state.events as EventWithRrule[];
  const todos = state.todos;

  // Local exceptions state (for demo mode; in real mode they'd come from DB)
  const [localExceptions, setLocalExceptions] = useState<LocalException[]>([]);

  // Compute view range with buffer
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getViewRange(state.currentView, state.currentDate),
    [state.currentView, state.currentDate],
  );

  // Expand recurring events
  const events = useExpandedEvents(rawEvents, rangeStart, rangeEnd, localExceptions);

  // Calendar map
  const calendarMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    for (const c of calendars) map.set(c.id, c);
    return map;
  }, [calendars]);

  // -----------------------------------------------------------
  // Event form state
  // -----------------------------------------------------------
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formDefaults, setFormDefaults] = useState<{
    start?: Date;
    end?: Date;
  }>({});

  // -----------------------------------------------------------
  // Event preview state
  // -----------------------------------------------------------
  const [previewEvent, setPreviewEvent] = useState<EventWithRrule | null>(null);
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null);

  // -----------------------------------------------------------
  // Recurrence action dialog state
  // -----------------------------------------------------------
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete' | null>(null);
  // The expanded instance that triggered the dialog
  const [pendingRecurringEvent, setPendingRecurringEvent] = useState<EventWithRrule | null>(null);

  // -----------------------------------------------------------
  // Todo form state
  // -----------------------------------------------------------
  const [todoFormOpen, setTodoFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // -----------------------------------------------------------
  // Unified create form state (replaces the old choice dialog)
  // -----------------------------------------------------------
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [createFormDate, setCreateFormDate] = useState<Date | null>(null);

  // -----------------------------------------------------------
  // Respond to pending create form request (from Sidebar "+" or MonthView date click)
  // -----------------------------------------------------------
  useEffect(() => {
    if (!state.pendingCreateDate) return;
    setCreateFormDate(state.pendingCreateDate);
    setCreateFormOpen(true);
    dispatch({ type: 'CLEAR_CREATE_FORM_REQUEST' });
  }, [state.pendingCreateDate, dispatch]);

  // -----------------------------------------------------------
  // Global keyboard shortcuts
  // -----------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when any modal/form is open
      if (formOpen || todoFormOpen || createFormOpen) return;
      // Skip when focus is inside an input / textarea / select / contenteditable
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;
      if ((e.target as HTMLElement).isContentEditable) return;
      // Skip modified keys (except standalone arrow keys)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigatePrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateNext();
          break;
        case 't':
          navigateToday();
          break;
        case 'n':
          e.preventDefault();
          dispatch({ type: 'REQUEST_CREATE_FORM', date: new Date() });
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [formOpen, todoFormOpen, createFormOpen, navigatePrev, navigateNext, navigateToday, dispatch]);

  // -----------------------------------------------------------
  // Handlers: create event from time grid
  // -----------------------------------------------------------
  const handleCreateEvent = useCallback(
    (dateObj: Date, startMin: number, endMin: number) => {
      const startDate = new Date(dateObj);
      startDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const endDate = new Date(dateObj);
      endDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

      setEditingEvent(null);
      setFormDefaults({ start: startDate, end: endDate });
      setFormOpen(true);
    },
    [],
  );

  // -----------------------------------------------------------
  // Handlers: event click (show preview)
  // -----------------------------------------------------------
  const handleEventClick = useCallback(
    (event: Event, rect: DOMRect) => {
      setPreviewEvent(event as EventWithRrule);
      setPreviewRect(rect);
    },
    [],
  );

  // -----------------------------------------------------------
  // Handlers: edit from preview
  // -----------------------------------------------------------
  const handleEditFromPreview = useCallback(
    (event: Event) => {
      const evWithRrule = event as EventWithRrule;

      // Close preview
      setPreviewEvent(null);
      setPreviewRect(null);

      if (evWithRrule._recurringEventId) {
        // This is a recurring instance — show choice dialog
        setPendingRecurringEvent(evWithRrule);
        setRecurringDialogMode('edit');
      } else {
        // Simple event — open form directly
        setEditingEvent(event);
        setFormDefaults({});
        setFormOpen(true);
      }
    },
    [],
  );

  // -----------------------------------------------------------
  // Handle recurrence edit action choice
  // -----------------------------------------------------------
  const handleRecurrenceEditAction = useCallback(
    (action: RecurrenceEditAction) => {
      const inst = pendingRecurringEvent;
      if (!inst || !inst._recurringEventId || !inst._instanceDate) return;

      setRecurringDialogMode(null);
      setPendingRecurringEvent(null);

      const parentId = inst._recurringEventId;
      const parentEvent = rawEvents.find((e) => e.id === parentId);
      if (!parentEvent) return;

      if (action === 'this') {
        // Open the form pre-filled with instance times; on save we write an exception
        // We pass a synthetic event with the instance times for the form to show
        const instanceEventForEdit: EventWithRrule = {
          ...parentEvent,
          id: inst.id, // keep composite id so save handler can detect it
          start_time: inst.start_time,
          end_time: inst.end_time,
          title: inst.title,
          _recurringEventId: parentId,
          _instanceDate: inst._instanceDate,
        };
        setEditingEvent(instanceEventForEdit as Event);
        setFormDefaults({});
        setFormOpen(true);
      } else if (action === 'all') {
        // Edit the parent event normally
        setEditingEvent(parentEvent as Event);
        setFormDefaults({});
        setFormOpen(true);
      }
      // 'this_and_future' — complex, treated same as 'all' for demo simplicity
    },
    [pendingRecurringEvent, rawEvents],
  );

  // -----------------------------------------------------------
  // Handlers: delete from preview (with undo)
  // -----------------------------------------------------------
  const handleDeleteEvent = useCallback(
    (eventId: string) => {
      // Check if this is an expanded instance
      const ev = events.find((e) => e.id === eventId) as EventWithRrule | undefined;
      if (!ev) return;

      setPreviewEvent(null);
      setPreviewRect(null);

      if (ev._recurringEventId) {
        // Show recurrence dialog
        setPendingRecurringEvent(ev);
        setRecurringDialogMode('delete');
      } else {
        // Normal delete
        doDeleteEvent(ev, eventId);
      }
    },
    [events],
  );

  const doDeleteEvent = useCallback(
    (ev: EventWithRrule, eventId: string) => {
      const actualId = ev._recurringEventId ?? eventId;

      // Optimistic local delete
      dispatch({ type: 'DELETE_EVENT', id: actualId });

      addUndoable({
        type: 'DELETE_EVENT',
        description: `已删除「${ev.title}」`,
        undo: () => {
          dispatch({ type: 'RESTORE_EVENT', event: ev as Event });
        },
        commit: () => {
          if (isDemoMode) return;
          const client = getSupabaseClient();
          if (client) {
            apiSoftDeleteEvent(client, actualId).catch(() => {
              dispatch({ type: 'RESTORE_EVENT', event: ev as Event });
            });
          }
        },
      });
    },
    [isDemoMode, dispatch, addUndoable],
  );

  // -----------------------------------------------------------
  // Handle recurrence delete action choice
  // -----------------------------------------------------------
  const handleRecurrenceDeleteAction = useCallback(
    (action: RecurrenceDeleteAction) => {
      const inst = pendingRecurringEvent;
      if (!inst || !inst._recurringEventId || !inst._instanceDate) return;

      setRecurringDialogMode(null);
      setPendingRecurringEvent(null);

      const parentId = inst._recurringEventId;
      const parentEvent = rawEvents.find((e) => e.id === parentId);
      if (!parentEvent) return;

      if (action === 'this') {
        // Add a skip exception for this instance
        const newEx: LocalException = {
          event_id: parentId,
          original_date: inst._instanceDate,
          action: 'skip',
        };
        setLocalExceptions((prev) => [...prev, newEx]);
      } else if (action === 'all' || action === 'this_and_future') {
        // Delete the parent event (removes all instances)
        doDeleteEvent(parentEvent, parentId);
      }
    },
    [pendingRecurringEvent, rawEvents, doDeleteEvent],
  );

  // -----------------------------------------------------------
  // Handlers: save from form
  // -----------------------------------------------------------
  const handleSaveEvent = useCallback(
    async (data: EventFormData, eventId?: string) => {
      const now = new Date().toISOString();

      // Check if this is saving a "modify this instance" exception
      const expandedEvent = eventId
        ? (events.find((e) => e.id === eventId) as EventWithRrule | undefined)
        : undefined;
      const isInstanceEdit =
        !!expandedEvent?._recurringEventId && !!expandedEvent?._instanceDate;

      if (isInstanceEdit && expandedEvent) {
        // Write a modify exception locally
        const startISO = data.isAllDay
          ? new Date(`${data.startDate}T00:00:00`).toISOString()
          : buildDateTimeISO(data.startDate, data.startTime);
        const endISO = data.isAllDay
          ? new Date(`${data.endDate}T23:59:59`).toISOString()
          : buildDateTimeISO(data.endDate, data.endTime);

        const newEx: LocalException = {
          event_id: expandedEvent._recurringEventId!,
          original_date: expandedEvent._instanceDate!,
          action: 'modify',
          modified_title: data.title,
          modified_start_time: startISO,
          modified_end_time: endISO,
        };
        setLocalExceptions((prev) => {
          // Replace existing exception for same date if any
          const filtered = prev.filter(
            (e) =>
              !(
                e.event_id === newEx.event_id &&
                e.original_date === newEx.original_date
              ),
          );
          return [...filtered, newEx];
        });
        setFormOpen(false);
        setEditingEvent(null);
        return;
      }

      if (eventId && !isInstanceEdit) {
        // Update existing event (find the real event, not an instance)
        const realEventId = expandedEvent?._recurringEventId ?? eventId;

        const startISO = data.isAllDay
          ? new Date(`${data.startDate}T00:00:00`).toISOString()
          : buildDateTimeISO(data.startDate, data.startTime);
        const endISO = data.isAllDay
          ? new Date(`${data.endDate}T23:59:59`).toISOString()
          : buildDateTimeISO(data.endDate, data.endTime);

        const localUpdates: Partial<EventWithRrule> = {
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          start_time: startISO,
          end_time: endISO,
          is_all_day: data.isAllDay,
          calendar_id: data.calendarId,
          color: data.color,
          updated_at: now,
          rrule_string: data.rruleString ?? undefined,
        };

        if (isDemoMode) {
          const existing = rawEvents.find((e) => e.id === realEventId);
          if (existing) {
            dispatch({ type: 'UPDATE_EVENT', event: { ...existing, ...localUpdates } as Event });
          }
        } else {
          const client = getSupabaseClient();
          if (client) {
            // Handle recurrence rule creation/update
            let recurrenceRuleId: string | null = null;
            if (data.rruleString) {
              const ruleResult = await apiCreateRecurrenceRule(client, {
                user_id: state.userId!,
                rrule_string: data.rruleString,
              });
              if (ruleResult.data) {
                recurrenceRuleId = ruleResult.data.id;
              }
            }

            const apiUpdates = {
              title: data.title,
              description: data.description || '',
              location: data.location || '',
              start_time: startISO,
              end_time: endISO,
              is_all_day: data.isAllDay,
              calendar_id: data.calendarId,
              color: data.color,
              recurrence_rule_id: recurrenceRuleId,
              updated_at: now,
            };
            const result = await apiUpdateEvent(client, realEventId, apiUpdates);
            if (result.data) {
              dispatch({ type: 'UPDATE_EVENT', event: result.data as unknown as Event });
              await setRemindersForEvent(client, realEventId, data.reminderOffsets);
            }
          }
        }
      } else {
        // Create new event
        const startISO = data.isAllDay
          ? new Date(`${data.startDate}T00:00:00`).toISOString()
          : buildDateTimeISO(data.startDate, data.startTime);
        const endISO = data.isAllDay
          ? new Date(`${data.endDate}T23:59:59`).toISOString()
          : buildDateTimeISO(data.endDate, data.endTime);

        const newEvent: EventWithRrule = {
          id: nextDemoId(),
          user_id: state.userId ?? 'demo',
          calendar_id: data.calendarId,
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          start_time: startISO,
          end_time: endISO,
          is_all_day: data.isAllDay,
          color: data.color,
          recurrence_rule_id: null,
          deleted_at: null,
          created_at: now,
          updated_at: now,
          rrule_string: data.rruleString ?? undefined,
        };

        if (isDemoMode) {
          dispatch({ type: 'ADD_EVENT', event: newEvent as Event });
        } else {
          const client = getSupabaseClient();
          if (client) {
            let recurrenceRuleId: string | null = null;
            if (data.rruleString) {
              const ruleResult = await apiCreateRecurrenceRule(client, {
                user_id: state.userId!,
                rrule_string: data.rruleString,
              });
              if (ruleResult.data) {
                recurrenceRuleId = ruleResult.data.id;
              }
            }

            const result = await apiCreateEvent(client, {
              user_id: state.userId!,
              calendar_id: data.calendarId,
              title: data.title,
              description: data.description || undefined,
              location: data.location || undefined,
              start_time: startISO,
              end_time: endISO,
              is_all_day: data.isAllDay,
              color: data.color,
              recurrence_rule_id: recurrenceRuleId,
            });
            if (result.data) {
              dispatch({ type: 'ADD_EVENT', event: result.data as unknown as Event });
              await setRemindersForEvent(client, result.data.id, data.reminderOffsets);
            }
          }
        }
      }

      setFormOpen(false);
      setEditingEvent(null);
    },
    [isDemoMode, events, rawEvents, state.userId, dispatch],
  );

  // -----------------------------------------------------------
  // Handlers: drag-to-move (with undo)
  // -----------------------------------------------------------
  const handleEventMove = useCallback(
    (eventId: string, newStartMinutes: number, dayOffset: number) => {
      const ev = events.find((e) => e.id === eventId) as EventWithRrule | undefined;
      if (!ev) return;

      // For recurring instances, move affects the parent event in simple demo mode
      const actualEvent = ev._recurringEventId
        ? (rawEvents.find((e) => e.id === ev._recurringEventId) as EventWithRrule)
        : ev;
      if (!actualEvent) return;

      const oldStart = new Date(actualEvent.start_time);
      const oldEnd = new Date(actualEvent.end_time);
      const duration = oldEnd.getTime() - oldStart.getTime();

      const newStart = addDays(new Date(oldStart), dayOffset);
      newStart.setHours(Math.floor(newStartMinutes / 60), newStartMinutes % 60, 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);

      const moveUpdates = {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic update
      const movedEvent = { ...actualEvent, ...moveUpdates };
      dispatch({ type: 'UPDATE_EVENT', event: movedEvent as Event });

      addUndoable({
        type: 'MOVE_EVENT',
        description: `已移动「${actualEvent.title}」`,
        undo: () => {
          dispatch({ type: 'UPDATE_EVENT', event: actualEvent as Event });
        },
        commit: () => {
          if (isDemoMode) return;
          const client = getSupabaseClient();
          if (client) {
            apiUpdateEvent(client, actualEvent.id, moveUpdates).then((result) => {
              if (result.data) {
                dispatch({ type: 'UPDATE_EVENT', event: result.data as unknown as Event });
              }
            }).catch(() => {
              dispatch({ type: 'UPDATE_EVENT', event: actualEvent as Event });
            });
          }
        },
      });
    },
    [events, rawEvents, isDemoMode, dispatch, addUndoable],
  );

  // -----------------------------------------------------------
  // Handlers: drag-to-resize
  // -----------------------------------------------------------
  const handleEventResize = useCallback(
    async (eventId: string, newEndMinutes: number) => {
      const ev = events.find((e) => e.id === eventId) as EventWithRrule | undefined;
      if (!ev) return;

      const actualEvent = ev._recurringEventId
        ? (rawEvents.find((e) => e.id === ev._recurringEventId) as EventWithRrule)
        : ev;
      if (!actualEvent) return;

      const oldStart = new Date(actualEvent.start_time);
      const newEnd = new Date(oldStart);
      newEnd.setHours(Math.floor(newEndMinutes / 60), newEndMinutes % 60, 0, 0);

      if (newEnd <= oldStart) return;

      const resizeUpdates = {
        end_time: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isDemoMode) {
        dispatch({ type: 'UPDATE_EVENT', event: { ...actualEvent, ...resizeUpdates } as Event });
      } else {
        const client = getSupabaseClient();
        if (client) {
          const result = await apiUpdateEvent(client, actualEvent.id, resizeUpdates);
          if (result.data) {
            dispatch({ type: 'UPDATE_EVENT', event: result.data as unknown as Event });
          }
        }
      }
    },
    [events, rawEvents, isDemoMode, dispatch],
  );

  // -----------------------------------------------------------
  // Handlers: Todo CRUD
  // -----------------------------------------------------------

  const handleOpenNewTodo = useCallback(() => {
    setEditingTodo(null);
    setTodoFormOpen(true);
  }, []);

  const handleEditTodo = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setTodoFormOpen(true);
  }, []);

  const handleSaveTodo = useCallback(
    async (data: TodoFormData, todoId?: string) => {
      const now = new Date().toISOString();

      if (todoId) {
        // Update existing todo
        const localUpdates: Partial<Todo> = {
          title: data.title,
          description: data.description || null,
          due_date: data.dueDate || null,
          due_time: data.dueTime ? `${data.dueTime}:00` : null,
          calendar_id: data.calendarId,
          updated_at: now,
        };

        if (isDemoMode) {
          const existing = todos.find((t) => t.id === todoId);
          if (existing) {
            dispatch({ type: 'UPDATE_TODO', todo: { ...existing, ...localUpdates } });
          }
        } else {
          const client = getSupabaseClient();
          if (client) {
            const result = await apiUpdateTodo(client, todoId, {
              title: data.title,
              description: data.description || undefined,
              due_date: data.dueDate || null,
              due_time: data.dueTime ? `${data.dueTime}:00` : null,
              calendar_id: data.calendarId,
              updated_at: now,
            });
            if (result.data) {
              dispatch({ type: 'UPDATE_TODO', todo: result.data as unknown as Todo });
              await setRemindersForTodo(client, todoId, data.reminderOffsets);
            }
          }
        }
      } else {
        // Create new todo
        const newTodo: Todo = {
          id: nextDemoTodoId(),
          user_id: state.userId ?? 'demo',
          calendar_id: data.calendarId,
          title: data.title,
          description: data.description || null,
          due_date: data.dueDate || null,
          due_time: data.dueTime ? `${data.dueTime}:00` : null,
          is_completed: false,
          completed_at: null,
          color: null,
          deleted_at: null,
          created_at: now,
          updated_at: now,
        };

        if (isDemoMode) {
          dispatch({ type: 'ADD_TODO', todo: newTodo });
        } else {
          const client = getSupabaseClient();
          if (client) {
            const result = await apiCreateTodo(client, {
              user_id: state.userId!,
              calendar_id: data.calendarId,
              title: data.title,
              description: data.description || undefined,
              due_date: data.dueDate || null,
              due_time: data.dueTime ? `${data.dueTime}:00` : null,
            });
            if (result.data) {
              dispatch({ type: 'ADD_TODO', todo: result.data as unknown as Todo });
              await setRemindersForTodo(client, result.data.id, data.reminderOffsets);
            }
          }
        }
      }

      setTodoFormOpen(false);
      setEditingTodo(null);
    },
    [isDemoMode, todos, state.userId, dispatch],
  );

  const handleToggleTodo = useCallback(
    async (todo: Todo) => {
      const newCompleted = !todo.is_completed;
      const now = new Date().toISOString();

      if (isDemoMode) {
        dispatch({
          type: 'UPDATE_TODO',
          todo: {
            ...todo,
            is_completed: newCompleted,
            completed_at: newCompleted ? now : null,
            updated_at: now,
          },
        });
      } else {
        const client = getSupabaseClient();
        if (client) {
          const result = await apiToggleTodoCompleted(client, todo.id, newCompleted);
          if (result.data) {
            dispatch({ type: 'UPDATE_TODO', todo: result.data as unknown as Todo });
          }
        }
      }
    },
    [isDemoMode, dispatch],
  );

  const handleDeleteTodo = useCallback(
    (todoId: string) => {
      const todo = todos.find((t) => t.id === todoId);
      if (!todo) return;

      // Optimistic local delete
      dispatch({ type: 'DELETE_TODO', id: todoId });

      addUndoable({
        type: 'DELETE_TODO',
        description: `已删除「${todo.title}」`,
        undo: () => {
          dispatch({ type: 'RESTORE_TODO', todo });
        },
        commit: () => {
          if (isDemoMode) return;
          const client = getSupabaseClient();
          if (client) {
            apiSoftDeleteTodo(client, todoId).catch(() => {
              dispatch({ type: 'RESTORE_TODO', todo });
            });
          }
        },
      });
    },
    [todos, isDemoMode, dispatch, addUndoable],
  );

  // -----------------------------------------------------------
  // Render view
  // -----------------------------------------------------------
  function renderView() {
    switch (state.currentView) {
      case 'day':
        return (
          <DayView
            currentDate={state.currentDate}
            events={events as Event[]}
            calendars={calendars}
            onCreateEvent={handleCreateEvent}
            onEventClick={handleEventClick}
            onEventMove={handleEventMove}
            onEventResize={handleEventResize}
          />
        );
      case 'week':
        return (
          <WeekView
            currentDate={state.currentDate}
            events={events as Event[]}
            calendars={calendars}
            todos={todos}
            onCreateEvent={handleCreateEvent}
            onEventClick={handleEventClick}
            onEventMove={handleEventMove}
            onEventResize={handleEventResize}
            onToggleTodo={handleToggleTodo}
          />
        );
      case 'month':
        return (
          <MonthView
            currentDate={state.currentDate}
            events={events as Event[]}
            calendars={calendars}
            todos={todos}
            onToggleTodo={handleToggleTodo}
          />
        );
      case 'agenda':
        return (
          <AgendaView
            currentDate={state.currentDate}
            events={events as Event[]}
            calendars={calendars}
            todos={todos}
          />
        );
      default:
        return null;
    }
  }

  // Show a full-area spinner while the app is loading (e.g. auth check)
  if (state.isLoading) {
    return (
      <main className={styles.mainArea}>
        <div className={styles.loadingOverlay}>
          <Spinner label="日历加载中…" size={48} />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.mainArea}>
      <div className={styles.viewArea}>
        {renderView()}
      </div>

      {/* Todo panel (right side) */}
      {state.todoPanelOpen && (
        <div className={styles.todoPanelWrapper}>
          <TodoList
            todos={todos}
            calendars={calendars}
            onNewTodo={handleOpenNewTodo}
            onEditTodo={handleEditTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
            onClose={() => dispatch({ type: 'SET_TODO_PANEL_OPEN', open: false })}
          />
        </div>
      )}

      {/* Event form modal */}
      {formOpen && (
        <EventForm
          event={editingEvent}
          defaultStart={formDefaults.start}
          defaultEnd={formDefaults.end}
          defaultReminderOffsets={[10, 1440]}
          calendars={calendars}
          onSave={handleSaveEvent}
          onClose={() => {
            setFormOpen(false);
            setEditingEvent(null);
          }}
        />
      )}

      {/* Event preview popover */}
      {previewEvent && previewRect && (
        <EventPreview
          event={previewEvent as Event}
          calendar={calendarMap.get(previewEvent.calendar_id)}
          anchorRect={previewRect}
          isRecurring={!!previewEvent._recurringEventId}
          onEdit={handleEditFromPreview}
          onDelete={handleDeleteEvent}
          onClose={() => {
            setPreviewEvent(null);
            setPreviewRect(null);
          }}
        />
      )}

      {/* Recurrence action dialog */}
      {recurringDialogMode && (
        <RecurrenceActionDialog
          mode={recurringDialogMode}
          onConfirm={
            recurringDialogMode === 'edit'
              ? handleRecurrenceEditAction
              : handleRecurrenceDeleteAction
          }
          onCancel={() => {
            setRecurringDialogMode(null);
            setPendingRecurringEvent(null);
          }}
        />
      )}

      {/* Todo form modal */}
      {todoFormOpen && (
        <TodoForm
          todo={editingTodo}
          calendars={calendars}
          onSave={handleSaveTodo}
          onClose={() => {
            setTodoFormOpen(false);
            setEditingTodo(null);
          }}
        />
      )}

      {/* Unified create form (todo/event with tab switcher) */}
      {createFormOpen && createFormDate && (
        <CreateForm
          defaultDate={createFormDate}
          defaultTab="todo"
          calendars={calendars}
          onSaveEvent={(data) => {
            setCreateFormOpen(false);
            setCreateFormDate(null);
            handleSaveEvent(data);
          }}
          onSaveTodo={(data) => {
            setCreateFormOpen(false);
            setCreateFormDate(null);
            handleSaveTodo(data);
          }}
          onClose={() => {
            setCreateFormOpen(false);
            setCreateFormDate(null);
          }}
        />
      )}

      {/* Undo Snackbar */}
      <Snackbar
        state={snackbarState}
        onUndo={undoLast}
        onClose={dismissSnackbar}
      />
    </main>
  );
}
