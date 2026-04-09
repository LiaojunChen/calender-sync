// ============================================================
// Shared form validation logic
// Used by both web and mobile apps to ensure consistent rules.
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/** Fields required to create/update an event */
export interface EventFormData {
  title?: string;
  start_time?: string;
  end_time?: string;
  calendar_id?: string;
  is_all_day?: boolean;
}

/** Fields required to create/update a todo */
export interface TodoFormData {
  title?: string;
  calendar_id?: string;
  due_date?: string | null;
  due_time?: string | null;
}

/**
 * Validate event form data.
 *
 * Rules:
 * - title is required (non-empty after trim)
 * - calendar_id is required
 * - end_time must be after start_time (unless all-day event)
 */
export function validateEvent(data: EventFormData): ValidationResult {
  const errors: Record<string, string> = {};

  // title required
  if (!data.title || data.title.trim() === '') {
    errors['title'] = '标题不能为空';
  }

  // calendar_id required
  if (!data.calendar_id || data.calendar_id.trim() === '') {
    errors['calendar_id'] = '请选择日历';
  }

  // end_time > start_time (skip for all-day events where times are boundary values)
  if (!data.is_all_day && data.start_time && data.end_time) {
    const start = new Date(data.start_time).getTime();
    const end = new Date(data.end_time).getTime();
    if (isNaN(start) || isNaN(end)) {
      errors['time'] = '时间格式无效';
    } else if (end <= start) {
      errors['end_time'] = '结束时间必须晚于开始时间';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate todo form data.
 *
 * Rules:
 * - title is required
 * - calendar_id is required
 * - if due_time is set, due_date must also be set
 */
export function validateTodo(data: TodoFormData): ValidationResult {
  const errors: Record<string, string> = {};

  // title required
  if (!data.title || data.title.trim() === '') {
    errors['title'] = '标题不能为空';
  }

  // calendar_id required
  if (!data.calendar_id || data.calendar_id.trim() === '') {
    errors['calendar_id'] = '请选择日历';
  }

  // if due_time is set, due_date must be set
  if (data.due_time && (!data.due_date || data.due_date.trim() === '')) {
    errors['due_date'] = '设置了截止时间时必须同时设置截止日期';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
