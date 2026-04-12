import type { Calendar } from '@project-calendar/shared';

export type QuickTodoCreateDraft = {
  title: string;
  calendarId: string;
};

export function prepareQuickTodoCreate(
  rawTitle: string,
  calendars: Calendar[],
): QuickTodoCreateDraft | null {
  const title = rawTitle.trim();

  if (!title) {
    return null;
  }

  const calendar = calendars.find((item) => item.is_default) ?? calendars[0];
  if (!calendar) {
    return null;
  }

  return {
    title,
    calendarId: calendar.id,
  };
}
