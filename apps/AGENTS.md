# Apps Workspace Notes

- `apps/web` has its own [AGENTS.md](/data/clj/大三下/project_calender/apps/web/AGENTS.md). Follow that file when touching the web app.
- The instructions below are for `apps/mobile` APK delivery work.

## Mobile APK Workflow

### Goal

Build a release APK that can be installed and launched on Android 16 / API 36 without startup crashes.

### Known-good environment

- Run commands from the repo root: `/data/clj/大三下/project_calender`
- JDK 17
- Android SDK with:
  - `platforms;android-36`
  - `build-tools;36.0.0`
  - `ndk;27.1.12297006`
  - `cmake;3.22.1`
- `apps/mobile/android/local.properties` must point to the SDK, for example:

```properties
sdk.dir=/tmp/android-sdk
```

### Release build commands

Use this sequence for a clean, reproducible release build:

```bash
export JAVA_HOME=/tmp/jdk17
export PATH=/tmp/jdk17/bin:/tmp/android-sdk/platform-tools:$PATH
export ANDROID_HOME=/tmp/android-sdk
export ANDROID_SDK_ROOT=/tmp/android-sdk
export NODE_ENV=production

rm -rf /data/clj/大三下/project_calender/apps/mobile/android/app/build
rm -rf /data/clj/大三下/project_calender/apps/mobile/android/build
rm -rf /data/clj/大三下/project_calender/node_modules/.cache/metro
rm -rf /tmp/metro-cache /tmp/metro-* /tmp/haste-map-*

cd /data/clj/大三下/project_calender/apps/mobile/android
./gradlew assembleRelease --rerun-tasks
```

Generated APK path:

```text
/data/clj/大三下/project_calender/apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

### Delivery copy

For handoff, copy the generated APK into `dist/` with a distinct filename:

```bash
mkdir -p /data/clj/大三下/project_calender/dist
cp /data/clj/大三下/project_calender/apps/mobile/android/app/build/outputs/apk/release/app-release.apk \
  /data/clj/大三下/project_calender/dist/project-calendar-android16-fixed.apk
```

### Mandatory verification

Do not claim the APK is deliverable until all of the following are true:

1. `assembleRelease` exits successfully.
2. The APK installs on an Android 16 / API 36 emulator or device.
3. The app launches into `com.projectcalendar.mobile/.MainActivity`.
4. `adb logcat -b crash -d` is empty for `com.projectcalendar.mobile`.

Recommended verification:

```bash
export PATH=/tmp/android-sdk/platform-tools:$PATH
APK=/data/clj/大三下/project_calender/apps/mobile/android/app/build/outputs/apk/release/app-release.apk

adb -s emulator-5554 uninstall com.projectcalendar.mobile >/dev/null 2>&1 || true
adb -s emulator-5554 logcat -c
adb -s emulator-5554 install -r "$APK"
adb -s emulator-5554 shell monkey -p com.projectcalendar.mobile -c android.intent.category.LAUNCHER 1
sleep 25
adb -s emulator-5554 shell pidof com.projectcalendar.mobile || true
adb -s emulator-5554 shell dumpsys activity activities | rg -n 'topResumedActivity|ResumedActivity|com.projectcalendar.mobile/.MainActivity' || true
adb -s emulator-5554 logcat -b crash -d | rg -n 'com.projectcalendar.mobile|FATAL EXCEPTION|AndroidRuntime|JavascriptException|Invariant Violation' || true
```

## Mobile Crash Pitfalls

### 1. `react-native-safe-area-context` duplication causes startup crash

Symptom:

- JS crash on launch with `Invariant Violation: Tried to register two views with the same name RNCSafeAreaProvider`

Known fix:

- Keep `apps/mobile/package.json` on `react-native-safe-area-context: "~5.7.0"`
- Keep the workspace lockfile deduped so only one physical copy remains

Useful check:

```bash
cd /data/clj/大三下/project_calender
npm ls react-native-safe-area-context
find /data/clj/大三下/project_calender -path '*/node_modules/react-native-safe-area-context/package.json' -print
```

### 2. Metro must stay aligned with native autolinking

`apps/mobile/metro.config.js` is required. Do not remove it.

Why it exists:

- This monorepo can otherwise bundle duplicate copies of:
  - `react-native-gesture-handler`
  - `react-native-reanimated`
  - `react-native-screens`
- Native autolinking resolves one physical copy, while Metro may resolve another.
- That mismatch can produce release-only or device-only startup crashes.

Current rule:

- `metro.config.js` pins those native packages to the same physical locations chosen by autolinking.
- `resolver.disableHierarchicalLookup` must remain enabled.

Regression test:

```bash
cd /data/clj/大三下/project_calender
npm run test --workspace=apps/mobile -- src/metroConfig.test.ts
```

### 3. Rebuilds must force a fresh JS bundle

If Gradle says `:app:createBundleReleaseJsAndAssets UP-TO-DATE`, an old bundle may be reused.

Rule:

- Before retrying a crash fix, clear Android and Metro caches and rebuild with `--rerun-tasks`.

### 4. `newArchEnabled` must stay on

`apps/mobile/android/gradle.properties` currently requires:

```text
newArchEnabled=true
```

Reason:

- The current `react-native-worklets` / `react-native-reanimated` stack expects the new architecture.
- Disabling it breaks the build path instead of fixing startup crashes.
