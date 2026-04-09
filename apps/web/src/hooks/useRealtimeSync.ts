'use client';

// ============================================================
// useRealtimeSync – Supabase Realtime subscription hook
// ============================================================
//
// Subscribes to postgres_changes on `events`, `todos`, and `calendars`
// tables, filtered by the authenticated user's ID.  Dispatches the
// appropriate AppContext action for each INSERT / UPDATE / DELETE event.
//
// The hook is a no-op when `supabase` or `userId` is null (demo / signed-out
// mode) and it cleans up its subscription on unmount or when dependencies
// change.
// ============================================================

import { useEffect } from 'react';
import type { TypedSupabaseClient } from '@project-calendar/shared';
import type { AppAction } from '@/contexts/AppContext';
import type { Calendar, Event, Todo } from '@project-calendar/shared';
import type React from 'react';

type AppDispatch = React.Dispatch<AppAction>;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRealtimeSync(
  supabase: TypedSupabaseClient | null,
  userId: string | null,
  dispatch: AppDispatch,
): void {
  useEffect(() => {
    if (!supabase || !userId) return;

    const filter = `user_id=eq.${userId}`;

    const channel = supabase
      .channel(`realtime-sync-${userId}`)
      // ---- events ----
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter,
        },
        (payload) => {
          const event = payload.new as Event;
          dispatch({ type: 'ADD_EVENT', event });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter,
        },
        (payload) => {
          const event = payload.new as Event;
          if (event.deleted_at) {
            // Soft-delete treated as a removal
            dispatch({ type: 'DELETE_EVENT', id: event.id });
          } else {
            dispatch({ type: 'UPDATE_EVENT', event });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'events',
          filter,
        },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) dispatch({ type: 'DELETE_EVENT', id });
        },
      )
      // ---- todos ----
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'todos',
          filter,
        },
        (payload) => {
          const todo = payload.new as Todo;
          dispatch({ type: 'ADD_TODO', todo });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'todos',
          filter,
        },
        (payload) => {
          const todo = payload.new as Todo;
          if (todo.deleted_at) {
            dispatch({ type: 'DELETE_TODO', id: todo.id });
          } else {
            dispatch({ type: 'UPDATE_TODO', todo });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'todos',
          filter,
        },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) dispatch({ type: 'DELETE_TODO', id });
        },
      )
      // ---- calendars ----
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calendars',
          filter,
        },
        (payload) => {
          const calendar = payload.new as Calendar;
          dispatch({ type: 'ADD_CALENDAR', calendar });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calendars',
          filter,
        },
        (payload) => {
          const calendar = payload.new as Calendar;
          dispatch({ type: 'UPDATE_CALENDAR', calendar });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'calendars',
          filter,
        },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) dispatch({ type: 'REMOVE_CALENDAR', id });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, dispatch]);
}
