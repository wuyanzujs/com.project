# Android 真机循环提速（打包 → 安装）

记录日期：2026-10-20。以下数字都是本机（Windows + Pixel/PDEM10 `dcf44968` + USB）实测，不是估算。

## 一、一次「改代码 → 手机上看到」到底花在哪

旧链路：`pnpm bundle:android` → `gradlew assembleDebug` → `adb install -r`。实测拆开：

| 阶段 | 命令 | 实测耗时 | 说明 |
| --- | --- | --- | --- |
| JS bundle | `npx taro build --type rn --platform android`（不加 `--reset-cache`） | **141s** | 最大的一块 |
| JS bundle | `pnpm bundle:android`（带 `--reset-cache`，全量） | **约 5~6 分钟** | 有 `--reset-cache` 时 transform 缓存全废，日常不要用 |
| Gradle 配置 | `gradlew help`（daemon 已热） | **95~120s** | 即使什么都不编译也要这么久 |
| Gradle 任务 | 单 ABI，全部 up-to-date | ≈0s（已含在上面） | 真正编译只在改原生代码时发生 |
| 打包 APK | `packageDebug` 四 ABI | 数十秒 | APK 67.6MB |
| 安装 | `adb install -r` 67.6MB | 3s ~ 30s（线路好时 3s） | 线路差时会异常慢，见下文 |
| **合计** | | **约 4~6 分钟** | |

两个结论：

1. **Gradle 配置是固定税**：`gradlew help` 就要 95~120s。空工程（同样 daemon、同样 Gradle 8.3）只要 15s，所以这 ~85s 全部来自本工程的配置阶段：RN autolinking 在配置期要 spawn node（实测 `Configure project :app` 里 20s 才开始打印第一个 `Automatically adding native module ...`），`:app` 与根工程各占约 50s。**改 JS 代码也必须付这笔税**，因为 `assets/index.android.bundle` 是 Taro 产物，Gradle 只是把它打进 APK。
2. **APK 里四个 ABI 是纯浪费**：`app-debug.apk` 的 `lib/` 里 `arm64-v8a 37.8MB + armeabi-v7a 24.8MB + x86 39.7MB + x86_64 39.4MB`（未压缩合计 141.7MB），而真机只需要 arm64。

## 二、快路径一：改 JS 不要打包（Metro 热更新）

```powershell
adb reverse tcp:8081 tcp:8081      # 真机访问 localhost:8081
pnpm dev:rn                        # 等价 taro build --type rn --watch --qr
```

- 必须在**真正的终端**里跑：Taro 的 `@tarojs/rn-supporter` 会调用 `process.stdin.setRawMode`，在非交互 shell（CI、管道、被重定向的进程）里会直接崩溃：`TypeError: process.stdin.setRawMode is not a function`。
- 调试包启动时会先探 `http://localhost:8081/status`（logcat 里能看到 `The packager does not seem to be running as we got an IOException requesting its status`，说明探活 + 回退到内置 bundle 的链路是通的）。所以 Metro 起着就吃 Metro 的 bundle，Metro 不起就吃 `assets/index.android.bundle`，**不用重装 APK**。
- 改样式/文案 → 保存 → 终端 `r` 重载（或摇一摇 Reload），秒级；这一条把 4~6 分钟压到几秒。

## 三、快路径二：确实要出 APK 时只打 arm64

`android/app/build.gradle` 增加了 `-PtargetAbis` 开关（不传时保持四 ABI，发布流程不受影响）：

```powershell
cd apps\com.deppon.app\android
.\gradlew.bat assembleDebug `
  -PtargetAbis=arm64-v8a `
  -PreactNativeArchitectures=arm64-v8a `
  --offline
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

- `-PtargetAbis=arm64-v8a` → `defaultConfig.ndk.abiFilters`，APK **67.6MB → 24.9MB**，安装 3s 级。
- `-PreactNativeArchitectures=arm64-v8a` **必须一起给**：`abiFilters` 只影响打包，CMake 的 `expo-modules-core:buildCMakeDebug[armeabi-v7a|x86|x86_64]` 仍会执行（实测白跑 3 个 ABI）。
- `--offline` 走本地缓存，避免配置期访问网络。

`android/gradle.properties` 另外打开了 `org.gradle.daemon/parallel/caching`（原来 parallel 是注释掉的）。

## 四、已知的坑

- **安装偶尔会异常慢**：同一个 `adb install -r`，67.6MB 用 3s，另一次 24.9MB 用了 **678s**。装完后 `dumpsys package` 的 `lastUpdateTime` 才更新，说明不是卡在命令行而是链路/设备侧（安装后 dexopt、USB 掉速都可能）。遇到先 `adb kill-server` 重来，或改用 `adb push` + `adb shell pm install -r /data/local/tmp/x.apk`。
- **不要每次打包前都跑 `pnpm verify:app`**：那是提交前的静态门禁（338 业务测试 + 71 样式治理 + typecheck/lint/stylelint），和安装包无关，纯耗时。
- `bundle:android` 里的 `--reset-cache` 只在改了 `config/`、babel、样式编译链时才有必要；日常重打可以去掉。
- 设备慢的时候 `adb exec-out screencap -p > x.png` 会挂住，改成 `adb shell screencap -p /sdcard/x.png` + `adb pull` 更稳。

## 五、推荐循环

| 场景 | 做法 | 时间 |
| --- | --- | --- |
| 改 JS / 样式 / 文案，看效果 | `pnpm dev:rn` + `adb reverse`，保存后重载 | 秒级 |
| 改原生/权限/依赖，需要新 APK | bundle（约 141s）+ 单 ABI Gradle（约 77s）+ install（3s） | 约 3.5 分钟 |
| 提 PR 前 | `pnpm verify:app` | 一次性 |
