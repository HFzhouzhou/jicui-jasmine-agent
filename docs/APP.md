# 茉莉娘子 App（安卓 / iOS）

App 用 [Capacitor](https://capacitorjs.com) 把现有的 React 页面打包成原生应用，界面、对话、下单、订单和口味记忆与网页版同一套代码、同一个后端。

- App 名称：茉莉娘子
- 包名 / Bundle ID：`cn.moliniangzi.app`（**第一次正式上架前确定好，上架后不能再改**；修改 `capacitor.config.ts` 后重新 `npx cap sync`）
- 安卓最低支持 Android 7.0（API 24）；iOS 使用 Swift Package Manager，不需要 CocoaPods。

## 第一阶段已完成

| 项目 | 说明 |
| --- | --- |
| 原生工程 | `android/`、`ios/` 已生成，图标与启动页来自头像方案 A（源图在 `assets/`） |
| App 外壳 | 不显示网站页头页脚；底部 5 个 Tab：首页 / 茶单 / 随心配 / 订单 / 我的；随心配页隐藏顶栏，对话占满全屏；适配刘海与底部安全区 |
| 「我的」页 | 本机顾客编号、口味记忆编辑、收藏、门店模式入口（店员登录接单台）、清除本机数据、版本号 |
| 原生能力 | 状态栏配色、启动页、安卓返回键（先关弹窗 → 返回上一页 → 首页退到后台）、下单成功震动 |
| 数据 | 对话、收藏、顾客编号等 `jicui_*` 数据同步保存到系统存储，WebView 被清缓存也能恢复 |
| 网络 | App 通过 `VITE_API_BASE` 访问服务器；服务端只允许 App 来源跨域（`APP_ORIGINS`） |
| 版本提示 | 服务端 `/api/app/version` 可配置最新版本和最低版本；低于最低版本时 App 提示必须更新 |
| PWA | 网站同时支持「添加到主屏幕」（`public/manifest.webmanifest`） |

浏览器里在任意页面地址后加 `?app=1` 就能预览 App 布局（加 `?app=0` 退出）。

## 准备（Mac，只需一次）

1. Node.js 24，在项目目录运行 `npm ci`。
2. 安卓：安装 [Android Studio](https://developer.android.com/studio)，首次打开按提示安装 SDK。
3. iPhone（可选）：从 App Store 安装 Xcode。用**免费 Apple ID** 就能装到自己的 iPhone 上测试（免费签名的应用 7 天后需要重新安装）；装给别人需要付费开发者账号和 TestFlight。

## 方式一：实时预览（推荐先用）

界面直接从 Mac 的开发服务器加载，改代码后手机上立刻更新，不需要部署服务器，也不需要 `.env.app`。

```sh
# 0. Mac 和手机连同一个 Wi‑Fi，查看 Mac 的局域网 IP
ipconfig getifaddr en0          # 例如 192.168.1.23

# 1. 终端一：启动开发服务（允许局域网访问）
npm run dev:lan

# 2. 终端二：让 App 指向这台 Mac
CAP_SERVER_URL=http://192.168.1.23:5173 npx cap sync

# 3. 打开原生工程
npm run app:android     # 或 npm run app:ios
```

- **安卓手机**：设置里打开「开发者选项 → USB 调试」，数据线连 Mac，在 Android Studio 顶部选中手机，点 ▶ Run。
- **iPhone**：数据线连 Mac，Xcode 左侧选 `App` → Signing & Capabilities → Team 选你的 Apple ID，顶部选中手机，点 ▶。第一次需要在 iPhone「设置 → 通用 → VPN与设备管理」里信任开发者。
- macOS 弹出「是否允许 node 接受传入连接」时选允许。
- 测试结束后执行一次 `npx cap sync`（不带 `CAP_SERVER_URL`），恢复为打包模式。

## 方式二：独立安装包（发给店员或顾客试用）

安装包里带着页面，直接访问线上服务器。**前提：服务器已部署本版本后端**（包含订单、口味记忆、接单台和 `/api/app/version`）。当前服务器运行的 `77dddad` 还没有这些接口。

```sh
cp .env.app.example .env.app
# 编辑 .env.app：VITE_API_BASE=https://你的服务器地址（必须 HTTPS）
npm run app:build                 # 类型检查 → 打包页面 → 同步到 android/ios
```

**安卓 APK**

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd android && ./gradlew assembleDebug   # 提示 permission denied 时先执行 chmod +x gradlew
# 生成 android/app/build/outputs/apk/debug/app-debug.apk
```

把 APK 发到安卓手机安装（需要允许「安装未知来源应用」）。正式分发请在 Android Studio 用 Build → Generate Signed App Bundle / APK 生成签名包，**签名文件和密码务必备份**，丢失后无法再更新同一个 App。

**iOS**：在 Xcode 选 Product → Archive，通过 TestFlight 分发（需要 Apple 开发者账号）。

## 服务端相关配置（`.env`）

| 配置 | 默认 | 说明 |
| --- | --- | --- |
| `APP_ORIGINS` | `https://localhost,capacitor://localhost` | 允许跨域访问 API 的 App 来源（安卓、iOS 的 WebView 来源）。不能填 `*` |
| `APP_LATEST_VERSION` | 空 | 最新版本号，如 `0.3.0`；App 低于此版本时提示可以更新 |
| `APP_MIN_VERSION` | 空 | 最低可用版本；低于此版本时 App 弹窗要求更新 |
| `APP_DOWNLOAD_URL` | 空 | 新版本下载页（必须 HTTPS） |

App 的版本号取自 `package.json` 的 `version`。发布新版本时同时修改安卓 `android/app/build.gradle` 的 `versionCode`（每次 +1）和 `versionName`，以及 iOS 工程里的 Version / Build。

## 尚未包含（后续阶段）

- 后台推送：目前 App 打开时每 20 秒刷新订单状态；关闭 App 后的推送需要接入推送服务（国内安卓需厂商通道或第三方推送，iOS 需 APNs 与开发者账号）。
- App 内支付：仍为到店付款，AI 不代付。接入微信 / 支付宝 App 支付需要企业主体和商户号。
- 键盘细节、盲盒分享图片、下拉刷新、断网页、门店模式新单提示音：第二阶段。
- 正式上架：企业主体、软件著作权、APP 备案、隐私政策与账号注销入口、AI 算法备案凭证。

## 相关文件

```text
capacitor.config.ts           App 名称、包名、启动页与状态栏、局域网测试开关
assets/                       图标与启动页源图（npx capacitor-assets generate 重新生成）
android/  ios/                原生工程（由 Capacitor 生成，可在 Android Studio / Xcode 中修改）
.env.app.example              打包时使用的服务器地址模板
src/lib/platform.ts           是否在 App 内、API 地址、版本号
src/lib/native-storage.ts     本地数据同步到系统存储
src/components/app/NativeBridge.tsx  启动页、状态栏、返回键、版本提示
src/pages/MePage/             「我的」页
```
