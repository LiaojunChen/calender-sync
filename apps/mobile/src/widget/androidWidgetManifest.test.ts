import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const manifestPath = path.resolve(
  __dirname,
  '..',
  '..',
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml',
);

function getCalendarWidgetServiceTag(): string {
  const manifest = readFileSync(manifestPath, 'utf8');
  const match = manifest.match(/<service\b[^>]*android:name="\.widget\.CalendarWidgetService"[^>]*>/);
  if (!match) {
    throw new Error('CalendarWidgetService declaration not found in AndroidManifest.xml');
  }
  return match[0];
}

describe('Android widget manifest wiring', () => {
  it('exports the widget collection service so the launcher can bind to it', () => {
    const serviceTag = getCalendarWidgetServiceTag();

    expect(serviceTag).toContain('android:permission="android.permission.BIND_REMOTEVIEWS"');
    expect(serviceTag).toContain('android:exported="true"');
  });
});
