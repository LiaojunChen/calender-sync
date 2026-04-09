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
} from '@project-calendar/shared';
import type { Event, Calendar, Todo } from '@project-calendar/shared';
import { addDays } from '@project-calendar/shared';
import { useUndo } from '@/hooks/useUndo';
import Snackbar from '@/components/common/Snackbar';
import DayView from '@/components/calendar/DayView';
import WeekView from '@/components/calendar/WeekView';
import MonthView from '@/components/calendar/MonthView';
import AgendaView from '@/components/calendar/AgendaView';
import EventForm from '@/components/event/EventForm';
import EventPreview from '@/components/event/EventPreview';
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

// ============================================================
// Component
// ============================================================

export default function MainArea() {
  const { state, dispatch } = useAppContext();

  // Undo / Snackbar
  const { addUndoable, undoLast, dismissSnackbar, snackbarState } = useUndo();

  // Use real calendars if available, fall back to demo
  const calendars = state.calendars.length > 0 ? state.calendars : DEMO_CALENDARS;
  const isDemoMode = state.calendars.length === 0;

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

  const events = state.events;
  const todos = state.todos;

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
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null);

  // -----------------------------------------------------------
  // Todo form state
  // -----------------------------------------------------------
  const [todoFormOpen, setTodoFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

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
      setPreviewEvent(event);
      setPreviewRect(rect);
    },
    [],
  );

  // -----------------------------------------------------------
  // Handlers: edit from preview
  // -----------------------------------------------------------
  const handleEditFromPreview = useCallback(
    (event: Event) => {
      setPreviewEvent(null);
      setPreviewRect(null);
      setEditingEvent(event);
      setFormDefaults({});
      setFormOpen(true);
    },
    [],
  );

  // -----------------------------------------------------------
  // Handlers: delete from preview (with undo)
  // -----------------------------------------------------------
  const handleDeleteEvent = useCallback(
    (eventId: string) => {
      const ev = events.find((e) => e.id === eventId);
      if (!ev) return;

      setPreviewEvent(null);
      setPreviewRect(null);

      // Optimistic local delete
      dispatch({ type: 'DELETE_EVENT', id: eventId });

      addUndoable({
        type: 'DELETE_EVENT',
        description: `已删除「${ev.title}」`,
        undo: () => {
          dispatch({ type: 'RESTORE_EVENT', event: ev });
        },
        commit: () => {
          if (isDemoMode) return;
          const client = getSupabaseClient();
          if (client) {
            apiSoftDeleteEvent(client, eventId).catch(() => {
              // If server delete fails, restore the event locally
              dispatch({ type: 'RESTORE_EVENT', event: ev });
            });
          }
        },
      });
    },
    [events, isDemoMode, dispatch, addUndoable],
  );

  // -----------------------------------------------------------
  // Handlers: save from form
  // -----------------------------------------------------------
  const handleSaveEvent = useCallback(
    async (data: EventFormData, eventId?: string) => {
      const now = new Date().toISOString();

      if (eventId) {
        // Update existing event
        const startISO = data.isAllDay
          ? new Date(`${data.startDate}T00:00:00`).toISOString()
          : buildDateTimeISO(data.startDate, data.startTime);
        const endISO = data.isAllDay
          ? new Date(`${data.endDate}T23:59:59`).toISOString()
          : buildDateTimeISO(data.endDate, data.endTime);

        const localUpdates: Partial<Event> = {
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          start_time: startISO,
          end_time: endISO,
          is_all_day: data.isAllDay,
          calendar_id: data.calendarId,
          color: data.color,
          updated_at: now,
        };

        if (isDemoMode) {
          const existing = events.find((e) => e.id === eventId);
          if (existing) {
            dispatch({ type: 'UPDATE_EVENT', event: { ...existing, ...localUpdates } });
          }
        } else {
          const client = getSupabaseClient();
          if (client) {
            const apiUpdates = {
              title: data.title,
              description: data.description || '',
              location: data.location || '',
              start_time: startISO,
              end_time: endISO,
              is_all_day: data.isAllDay,
              calendar_id: data.calendarId,
              color: data.color,
              updated_at: now,
            };
            const result = await apiUpdateEvent(client, eventId, apiUpdates);
            if (result.data) {
              dispatch({ type: 'UPDATE_EVENT', event: result.data as unknown as Event });
              await setRemindersForEvent(client, eventId, data.reminderOffsets);
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

        const newEvent: Event = {
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
        };

        if (isDemoMode) {
          dispatch({ type: 'ADD_EVENT', event: newEvent });
        } else {
          const client = getSupabaseClient();
          if (client) {
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
    [isDemoMode, events, state.userId, dispatch],
  );

  // -----------------------------------------------------------
  // Handlers: drag-to-move (with undo)
  // -----------------------------------------------------------
  const handleEventMove = useCallback(
    (eventId: string, newStartMinutes: number, dayOffset: number) => {
      const ev = events.find((e) => e.id === eventId);
      if (!ev) return;

      const oldStart = new Date(ev.start_time);
      const oldEnd = new Date(ev.end_time);
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
      const movedEvent = { ...ev, ...moveUpdates };
      dispatch({ type: 'UPDATE_EVENT', event: movedEvent });

      addUndoable({
        type: 'MOVE_EVENT',
        description: `已移动「${ev.title}」`,
        undo: () => {
          dispatch({ type: 'UPDATE_EVENT', event: ev });
        },
        commit: () => {
          if (isDemoMode) return;
          const client = getSupabaseClient();
          if (client) {
            apiUpdateEvent(client, eventId, moveUpdates).then((result) => {
              if (result.data) {
                dispatch({ type: 'UPDATE_EVENT', event: result.data as unknown as Event });
              }
            }).catch(() => {
              // Rollback on error
              dispatch({ type: 'UPDATE_EVENT', event: ev });
            });
          }
        },
      });
    },
    [events, isDemoMode, dispatch, addUndoable],
  );

  // -----------------------------------------------------------
  // Handlers: drag-to-resize
  // -----------------------------------------------------------
  const handleEventResize = useCallback(
    async (eventId: string, newEndMinutes: number) => {
      const ev = events.find((e) => e.id === eventId);
      if (!ev) return;

      const oldStart = new Date(ev.start_time);
      const newEnd = new Date(oldStart);
      newEnd.setHours(Math.floor(newEndMinutes / 60), newEndMinutes % 60, 0, 0);

      if (newEnd <= oldStart) return;

      const resizeUpdates = {
        end_time: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isDemoMode) {
        dispatch({ type: 'UPDATE_EVENT', event: { ...ev, ...resizeUpdates } });
      } else {
        const client = getSupabaseClient();
        if (client) {
          const result = await apiUpdateEvent(client, eventId, resizeUpdates);
          if (result.data) {
            dispatch({ type: 'UPDATE_EVENT', event: result.data as unknown as Event });
          }
        }
      }
    },
    [events, isDemoMode, dispatch],
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
              // If server delete fails, restore the todo locally
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
            events={events}
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
            events={events}
            calendars={calendars}
            onCreateEvent={handleCreateEvent}
            onEventClick={handleEventClick}
            onEventMove={handleEventMove}
            onEventResize={handleEventResize}
          />
        );
      case 'month':
        return (
          <MonthView
            currentDate={state.currentDate}
            events={events}
            calendars={calendars}
            todos={todos}
          />
        );
      case 'agenda':
        return (
          <AgendaView
            currentDate={state.currentDate}
            events={events}
            calendars={calendars}
            todos={todos}
          />
        );
      default:
        return null;
    }
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
          event={previewEvent}
          calendar={calendarMap.get(previewEvent.calendar_id)}
          anchorRect={previewRect}
          onEdit={handleEditFromPreview}
          onDelete={handleDeleteEvent}
          onClose={() => {
            setPreviewEvent(null);
            setPreviewRect(null);
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

      {/* Undo Snackbar */}
      <Snackbar
        state={snackbarState}
        onUndo={undoLast}
        onClose={dismissSnackbar}
      />
    </main>
  );
}
