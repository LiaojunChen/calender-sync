import type { Event, Calendar, Todo } from '@project-calendar/shared';
import { addDays, startOfWeek, toISODateString } from '@project-calendar/shared';
import type { EventWithRrule } from '@/hooks/useExpandedEvents';

/**
 * Demo calendars for offline / unauthenticated mode.
 */
export const DEMO_CALENDARS: Calendar[] = [
  {
    id: 'cal-personal',
    user_id: 'demo',
    name: '个人',
    color: '#039be5',
    is_visible: true,
    is_default: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cal-work',
    user_id: 'demo',
    name: '工作',
    color: '#7986cb',
    is_visible: true,
    is_default: false,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cal-study',
    user_id: 'demo',
    name: '学习',
    color: '#33b679',
    is_visible: true,
    is_default: false,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * Generate demo events relative to a reference date (typically today).
 * Returns events spread across the current week so there is always
 * something visible in both day and week views.
 */
export function generateDemoEvents(referenceDate: Date): EventWithRrule[] {
  const now = new Date();
  const weekStart = startOfWeek(referenceDate, 1); // Monday

  function makeDate(dayOffset: number, hour: number, minute: number = 0): string {
    const d = addDays(weekStart, dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }

  const todayDow = (referenceDate.getDay() + 6) % 7; // Monday=0..Sunday=6

  const events: EventWithRrule[] = [
    // All-day event spanning 3 days (Mon-Wed)
    {
      id: 'demo-1',
      user_id: 'demo',
      calendar_id: 'cal-personal',
      title: '团建旅行',
      description: '公司组织的团队建设活动',
      location: '杭州西湖',
      start_time: makeDate(0, 0),
      end_time: makeDate(2, 23, 59),
      is_all_day: true,
      color: null,
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    // Regular event on Tuesday morning
    {
      id: 'demo-2',
      user_id: 'demo',
      calendar_id: 'cal-work',
      title: '产品评审会议',
      description: '2.0版本产品评审',
      location: '三楼会议室A',
      start_time: makeDate(1, 9, 0),
      end_time: makeDate(1, 11, 0),
      is_all_day: false,
      color: null,
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    // Overlapping event on Tuesday morning
    {
      id: 'demo-3',
      user_id: 'demo',
      calendar_id: 'cal-personal',
      title: '牙医预约',
      description: null,
      location: '口腔医院',
      start_time: makeDate(1, 10, 0),
      end_time: makeDate(1, 11, 30),
      is_all_day: false,
      color: '#d50000',
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    // Wednesday afternoon study session
    {
      id: 'demo-4',
      user_id: 'demo',
      calendar_id: 'cal-study',
      title: '数据结构复习',
      description: '期末考试复习',
      location: '图书馆',
      start_time: makeDate(2, 14, 0),
      end_time: makeDate(2, 16, 30),
      is_all_day: false,
      color: null,
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    // Thursday short event (30 min)
    {
      id: 'demo-5',
      user_id: 'demo',
      calendar_id: 'cal-work',
      title: '站会',
      description: '每日站会',
      location: null,
      start_time: makeDate(3, 9, 30),
      end_time: makeDate(3, 10, 0),
      is_all_day: false,
      color: null,
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    // Friday evening event
    {
      id: 'demo-6',
      user_id: 'demo',
      calendar_id: 'cal-personal',
      title: '朋友聚餐',
      description: '老同学聚会',
      location: '大董烤鸭',
      start_time: makeDate(4, 18, 0),
      end_time: makeDate(4, 20, 30),
      is_all_day: false,
      color: null,
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    // Today event (always show something today)
    {
      id: 'demo-7',
      user_id: 'demo',
      calendar_id: 'cal-study',
      title: '算法练习',
      description: 'LeetCode每日一题',
      location: null,
      start_time: makeDate(todayDow, 13, 0),
      end_time: makeDate(todayDow, 14, 0),
      is_all_day: false,
      color: null,
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    // All-day event on Saturday
    {
      id: 'demo-8',
      user_id: 'demo',
      calendar_id: 'cal-personal',
      title: '读书日',
      description: null,
      location: null,
      start_time: makeDate(5, 0),
      end_time: makeDate(5, 23, 59),
      is_all_day: true,
      color: '#e67c73',
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    // Recurring: daily standup (weekdays, 09:30–10:00)
    {
      id: 'demo-recurring-standup',
      user_id: 'demo',
      calendar_id: 'cal-work',
      title: '每日站会',
      description: '每天早上同步工作进展',
      location: null,
      start_time: makeDate(0, 9, 30),
      end_time: makeDate(0, 10, 0),
      is_all_day: false,
      color: '#7986cb',
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      rrule_string: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    },
    // Recurring: weekly team meeting (Monday 14:00–15:00)
    {
      id: 'demo-recurring-team-meeting',
      user_id: 'demo',
      calendar_id: 'cal-work',
      title: '周会',
      description: '团队周例会',
      location: '二楼会议室',
      start_time: makeDate(0, 14, 0),
      end_time: makeDate(0, 15, 0),
      is_all_day: false,
      color: null,
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      rrule_string: 'FREQ=WEEKLY;BYDAY=MO',
    },
    // Recurring: monthly review (first day of week, 16:00–17:00)
    {
      id: 'demo-recurring-monthly-review',
      user_id: 'demo',
      calendar_id: 'cal-personal',
      title: '月度复盘',
      description: '回顾本月目标完成情况',
      location: null,
      start_time: makeDate(0, 16, 0),
      end_time: makeDate(0, 17, 0),
      is_all_day: false,
      color: '#33b679',
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      rrule_string: 'FREQ=MONTHLY',
    },
  ];

  return events;
}

/**
 * Generate demo todos relative to a reference date (typically today).
 */
export function generateDemoTodos(referenceDate: Date): Todo[] {
  const now = new Date();
  const weekStart = startOfWeek(referenceDate, 1); // Monday

  function makeDate(dayOffset: number): string {
    const d = addDays(weekStart, dayOffset);
    return toISODateString(d);
  }

  const todayDow = (referenceDate.getDay() + 6) % 7; // Monday=0..Sunday=6
  const todayStr = toISODateString(referenceDate);

  const todos: Todo[] = [
    {
      id: 'demo-todo-1',
      user_id: 'demo',
      calendar_id: 'cal-study',
      title: '预习操作系统课程',
      description: '第五章：内存管理',
      due_date: todayStr,
      due_time: '09:00:00',
      is_completed: false,
      completed_at: null,
      color: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'demo-todo-2',
      user_id: 'demo',
      calendar_id: 'cal-work',
      title: '提交周报',
      description: '整理本周工作进展',
      due_date: makeDate(todayDow),
      due_time: '18:00:00',
      is_completed: false,
      completed_at: null,
      color: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'demo-todo-3',
      user_id: 'demo',
      calendar_id: 'cal-personal',
      title: '买生日蛋糕',
      description: null,
      due_date: makeDate(todayDow + 1),
      due_time: null,
      is_completed: false,
      completed_at: null,
      color: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'demo-todo-4',
      user_id: 'demo',
      calendar_id: 'cal-study',
      title: '完成数据结构作业',
      description: '第三题：二叉树遍历',
      due_date: makeDate(2),
      due_time: '23:59:00',
      is_completed: true,
      completed_at: now.toISOString(),
      color: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'demo-todo-5',
      user_id: 'demo',
      calendar_id: 'cal-work',
      title: '整理项目需求文档',
      description: '与产品经理对齐需求',
      due_date: makeDate(4),
      due_time: '15:00:00',
      is_completed: false,
      completed_at: null,
      color: null,
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];

  return todos;
}
