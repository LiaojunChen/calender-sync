/**
 * Chinese lunar calendar display using the browser's built-in
 * Intl.DateTimeFormat with the 'u-ca-chinese' calendar extension.
 *
 * Supported in Chrome 24+, Firefox 29+, Safari 10+, and Node.js 13+
 * with full ICU data. Returns null gracefully when not available.
 */

let _formatter: Intl.DateTimeFormat | null = null;
let _supported: boolean | null = null;

function isSupported(): boolean {
  if (_supported !== null) return _supported;
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat === 'undefined') {
    return (_supported = false);
  }
  try {
    new Intl.DateTimeFormat('zh-u-ca-chinese', { month: 'short', day: 'numeric' }).format(
      new Date(),
    );
    _supported = true;
  } catch {
    _supported = false;
  }
  return _supported;
}

function getFormatter(): Intl.DateTimeFormat {
  if (!_formatter) {
    _formatter = new Intl.DateTimeFormat('zh-u-ca-chinese', {
      month: 'short',
      day: 'numeric',
    });
  }
  return _formatter;
}

/**
 * Returns a compact lunar date string for display in calendar cells:
 * - On the first day of a lunar month (初一): returns the month name, e.g. "正月", "二月"
 * - On other days: returns the day name, e.g. "初五", "十五", "廿三"
 *
 * Returns null when the Chinese calendar is not supported by the runtime.
 */
export function getLunarDateDisplay(date: Date): string | null {
  if (!isSupported()) return null;
  try {
    const parts = getFormatter().formatToParts(date);
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    if (!day) return null;
    // Show month name on the first day of the lunar month
    return day === '初一' ? month : day;
  } catch {
    return null;
  }
}
