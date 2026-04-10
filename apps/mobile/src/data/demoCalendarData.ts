import type { Calendar, Event, Todo } from '@project-calendar/shared';
import { addDays } from '@project-calendar/shared';

export interface DemoCalendarData {
  calendars: Calendar[];
  events: Event[];
  todos: Todo[];
}

function makeDateStr(date: Date, hour: number, minute: number): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createDemoCalendarData(today: Date = new Date()): DemoCalendarData {
  const now = today.toISOString();

  const calendars: Calendar[] = [
    {
      id: 'cal-1',
      user_id: 'user-1',
      name: '个人',
      color: '#1a73e8',
      is_visible: true,
      is_default: true,
      sort_order: 0,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'cal-2',
      user_id: 'user-1',
      name: '工作',
      color: '#34a853',
      is_visible: true,
      is_default: false,
      sort_order: 1,
      created_at: now,
      updated_at: now,
    },
  ];

  const events: Event[] = [
    {
      id: 'ev-1',
      user_id: 'user-1',
      calendar_id: 'cal-2',
      title: '团队早会',
      description: null,
      location: '会议室 A',
      start_time: makeDateStr(today, 9, 0),
      end_time: makeDateStr(today, 9, 30),
      is_all_day: false,
      color: null,
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ev-2',
      user_id: 'user-1',
      calendar_id: 'cal-2',
      title: 'Code Review',
      description: null,
      location: null,
      start_time: makeDateStr(today, 14, 0),
      end_time: makeDateStr(today, 15, 0),
      is_all_day: false,
      color: null,
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ev-3',
      user_id: 'user-1',
      calendar_id: 'cal-1',
      title: '健身',
      description: null,
      location: '体育馆',
      start_time: makeDateStr(addDays(today, 1), 7, 0),
      end_time: makeDateStr(addDays(today, 1), 8, 0),
      is_all_day: false,
      color: '#e91e63',
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ev-4',
      user_id: 'user-1',
      calendar_id: 'cal-1',
      title: '生日',
      description: null,
      location: null,
      start_time: makeDateStr(addDays(today, 2), 0, 0),
      end_time: makeDateStr(addDays(today, 2), 23, 59),
      is_all_day: true,
      color: '#ff9800',
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
  ];

  const todos: Todo[] = [
    {
      id: 'todo-1',
      user_id: 'user-1',
      calendar_id: 'cal-1',
      title: '提交报告',
      description: null,
      due_date: toISODate(today),
      due_time: '17:00',
      is_completed: false,
      completed_at: null,
      color: null,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
  ];

  return { calendars, events, todos };
}
