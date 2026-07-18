import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = process.cwd()
const srcRoot = path.join(appRoot, 'src')
const packageJsonPath = path.join(appRoot, 'package.json')
const sourceExtensions = new Set(['.ts', '.tsx', '.scss'])
const forbiddenMiniProgramConfigFiles = [
  'project.config.json',
  'project.tt.json',
  'project.swan.json',
  'project.qq.json',
  'project.jd.json'
]
const forbiddenPlatformPackages = new Set([
  '@tarojs/plugin-platform-alipay',
  '@tarojs/plugin-platform-h5',
  '@tarojs/plugin-platform-jd',
  '@tarojs/plugin-platform-qq',
  '@tarojs/plugin-platform-swan',
  '@tarojs/plugin-platform-tt',
  '@tarojs/plugin-platform-weapp'
])
const nativeIdentityChecks = [
  {
    filePath: path.join(appRoot, 'config/index.ts'),
    expected: "appName: 'DepponApp'",
    message: 'Taro RN appName 必须与原生 moduleName 保持一致。'
  },
  {
    filePath: packageJsonPath,
    expected: '"expo":',
    message: 'Taro RN 原生 autolinking 需要显式声明 expo 依赖。'
  },
  {
    filePath: path.join(appRoot, 'android/gradle.properties'),
    expected: 'app_id=com.deppon.app',
    message: 'Android applicationId 应使用 App 包名 com.deppon.app。'
  },
  {
    filePath: path.join(appRoot, 'android/settings.gradle'),
    expected: '@tarojs/taro-rn/package.json',
    message: 'Android Expo autolinking 应兼容 pnpm workspace 依赖解析。'
  },
  {
    filePath: path.join(appRoot, 'android/app/build.gradle'),
    expected: 'namespace "com.deppon.app"',
    message: 'Android namespace 应使用 App 包名 com.deppon.app。'
  },
  {
    filePath: path.join(
      appRoot,
      'android/gradle/wrapper/gradle-wrapper.properties'
    ),
    expected: 'networkTimeout=60000',
    message: 'Gradle wrapper 首次下载超时不应保持模板默认 10 秒。'
  },
  {
    filePath: path.join(appRoot, 'android/fastlane/Appfile'),
    expected: 'package_name("com.deppon.app")',
    message: 'Android fastlane 包名应使用 com.deppon.app。'
  },
  {
    filePath: path.join(appRoot, 'android/app/src/main/res/values/strings.xml'),
    expected: '<string name="app_name">德邦快递</string>',
    message: 'Android 展示名应使用德邦快递。'
  },
  {
    filePath: path.join(
      appRoot,
      'android/app/src/main/java/com/deppon/app/MainActivity.kt'
    ),
    expected: 'package com.deppon.app',
    message: 'Android MainActivity 包名必须与 App 包名保持一致。'
  },
  {
    filePath: path.join(
      appRoot,
      'android/app/src/main/java/com/deppon/app/MainActivity.kt'
    ),
    expected: 'getMainComponentName(): String = "DepponApp"',
    message: 'Android RN moduleName 必须与 Taro RN appName 保持一致。'
  },
  {
    filePath: path.join(
      appRoot,
      'android/app/src/main/java/com/deppon/app/MainApplication.kt'
    ),
    expected: 'package com.deppon.app',
    message: 'Android MainApplication 包名必须与 App 包名保持一致。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo/AppDelegate.mm'),
    expected: 'self.moduleName = @"DepponApp";',
    message: 'iOS RN moduleName 必须与 Taro RN appName 保持一致。'
  },
  {
    filePath: path.join(appRoot, 'ios/Podfile'),
    expected: '@tarojs/taro-rn/package.json',
    message: 'iOS Expo autolinking 应兼容 pnpm workspace 依赖解析。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo/Info.plist'),
    expected: '<string>德邦快递</string>',
    message: 'iOS 展示名应使用德邦快递。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo/LaunchScreen.storyboard'),
    expected: 'text="德邦快递"',
    message: 'iOS 启动屏不应保留 taroDemo 模板文案。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo.xcodeproj/project.pbxproj'),
    expected: 'PRODUCT_BUNDLE_IDENTIFIER = com.deppon.app;',
    message: 'iOS Bundle ID 应使用 com.deppon.app。'
  }
]
const rnBehaviorContractChecks = [
  {
    filePath: path.join(
      appRoot,
      'src/shared/native/AppFormScrollView.tsx'
    ),
    expected: "keyboardShouldPersistTaps='handled'",
    message:
      '表单滚动容器必须保证键盘开启时按钮点击仍能交给业务 handler。'
  },
  {
    filePath: path.join(appRoot, 'src/pages/login/index.tsx'),
    expected: '<AppFormScrollView',
    message:
      '登录表单必须使用 shared/native 的键盘点击容器，避免首次点击只收起键盘。'
  },
  {
    filePath: path.join(appRoot, 'src/request/index.ts'),
    expected: "credentials: options.credentials ?? 'include'",
    message:
      'RN OWS 请求必须显式携带原生 cookie credentials，不能依赖 fetch 默认值。'
  },
  {
    filePath: path.join(
      appRoot,
      'src/shared/native/AppSessionCookie.ts'
    ),
    expected: "from '@preeternal/react-native-cookie-manager'",
    message:
      'RN ECO_TOKEN 必须通过 shared/native cookie facade 同步，业务层不能猜测 Set-Cookie。'
  },
  {
    filePath: path.join(appRoot, 'src/request/cookieJar.ts'),
    expected: 'recoverSessionCookie',
    message:
      'RN 登录必须保留原生 cookie 异步写入后的有界恢复入口。'
  },
  {
    filePath: path.join(appRoot, 'src/pages/web/index.tsx'),
    expected: 'requiresAppWebLogin(target, hasValidSession())',
    message:
      '认证 WebView 必须在页面渲染前动态检查 App 登录态。'
  },
  {
    filePath: path.join(appRoot, 'src/pages/web/index.tsx'),
    expected: 'ensureAuthenticated({',
    message:
      '认证 WebView 必须通过统一登录守卫保存当前 App 路由并回跳。'
  },
  {
    filePath: path.join(
      appRoot,
      'src/pages/contact/hooks/useContactAddressIntegrity.ts'
    ),
    expected: 'contactService.checkAddressDetail',
    message:
      '联系人地址完整性检查必须通过 contact service，不能由页面直接调用 API。'
  },
  {
    filePath: path.join(appRoot, 'src/pages/contact/list/index.tsx'),
    expected: 'checkAddressIntegrity(contact',
    message:
      '选择地址前必须执行统一地址完整性决策，保留修改或继续使用语义。'
  },
  {
    filePath: path.join(appRoot, 'src/pages/contact/edit/index.tsx'),
    expected: 'checkAddressIntegrity(contact',
    message:
      '保存地址前必须执行统一地址完整性决策，不能只做本地字段校验。'
  },
  {
    filePath: path.join(
      appRoot,
      'src/services/express/productAvailability.service.ts'
    ),
    expected: 'Promise.allSettled',
    message:
      '寄件产品点城市、融合、升级和货物标签必须独立降级，不能由单个可选接口拖垮报价。'
  },
  {
    filePath: path.join(appRoot, 'src/services/print/print.service.ts'),
    expected: 'Promise.allSettled',
    message:
      '待打印和已打印数量必须独立降级，单个计数接口失败不能清空另一个 tab。'
  },
  {
    filePath: path.join(appRoot, 'src/pages/print/list/index.tsx'),
    expected: 'printService.queryList',
    message:
      '打印订单页必须通过 print service 查询，不能直接调用领域 API。'
  }
]
const nativeFacadeRelativePathPrefixes = [
  'src/shared/platform/',
  'src/shared/native/'
]
const cacheFacadeRelativePathPrefixes = ['src/cache/']
const pageUiRelativePathPrefix = 'src/pages/'
const engineeringUiCopyPattern =
  /首期|迁移边界|旧小程序|RN App|后续接入|后续拆分|不接小程序|不调用小程序/g
const nativeOrCacheFacadeRelativePathPrefixes = [
  ...nativeFacadeRelativePathPrefixes,
  ...cacheFacadeRelativePathPrefixes
]
const taroApiFacadeRelativePathPrefixes = [
  ...nativeOrCacheFacadeRelativePathPrefixes,
  'src/shared/navigation/'
]
const forbiddenTaroApiNames = new Set([
  'authorize',
  'canvasToTempFilePath',
  'checkSession',
  'chooseAddress',
  'chooseImage',
  'chooseInvoiceTitle',
  'chooseLocation',
  'chooseMedia',
  'chooseVideo',
  'createCanvasContext',
  'createSelectorQuery',
  'downloadFile',
  'getFileSystemManager',
  'getLocation',
  'getMenuButtonBoundingClientRect',
  'getSetting',
  'getSystemInfoSync',
  'getUserProfile',
  'hideShareMenu',
  'login',
  'makePhoneCall',
  'navigateToMiniProgram',
  'offUserCaptureScreen',
  'onUserCaptureScreen',
  'openDocument',
  'openLocation',
  'openSetting',
  'pageScrollTo',
  'previewImage',
  'removeTabBarBadge',
  'requestPayment',
  'requestSubscribeMessage',
  'saveImageToPhotosAlbum',
  'scanCode',
  'setClipboardData',
  'setTabBarBadge',
  'showShareMenu',
  'uploadFile'
])

const forbiddenPatterns = [
  {
    pattern: /\bwx\./g,
    message:
      '不要直接使用微信小程序 wx.*，请通过 shared/platform facade 或 service 层重构。'
  },
  {
    pattern: /\bmy\./g,
    message:
      '不要直接使用支付宝小程序 my.*，请通过 shared/platform facade 或 service 层重构。'
  },
  {
    pattern:
      /\b(?:getStorageSync|setStorageSync|getStorageInfoSync|removeStorageSync|clearStorageSync)\b/g,
    message:
      'Taro RN 不支持同步缓存 API，请通过 src/cache facade 使用异步持久化缓存。'
  },
  {
    pattern:
      /\bTaro\.(?:getStorage|setStorage|removeStorage|clearStorage|getStorageInfo)\b/g,
    message: 'Taro 缓存 API 只能在 src/cache facade 中封装。',
    allowRelativePathPrefixes: cacheFacadeRelativePathPrefixes
  },
  {
    pattern: /\bTaro\.(?:navigateTo|redirectTo|switchTab|reLaunch)\b/g,
    message:
      '业务页面不能绕过统一登录守卫，请通过 shared/navigation facade 跳转。',
    allowRelativePathPrefixes: ['src/shared/navigation/']
  },
  {
    pattern: /\bcreateLoginRedirectUrl\s*\(/g,
    message:
      '业务页面不能手工生成登录路由，请通过 authGuard.navigateToLogin 跳转。',
    allowRelativePathPrefixes: ['src/shared/navigation/']
  },
  {
    pattern: /\bAPP_ROUTES\.login\b/g,
    message:
      '业务代码不能把登录页当普通路由，请通过 authGuard.navigateToLogin 跳转。',
    allowRelativePathPrefixes: ['src/shared/navigation/']
  },
  {
    pattern:
      /(?:from\s+|require\(\s*)['"`][^'"`]*services\/[^'"`]*\.api['"`]/g,
    message:
      '页面和 shared 层不能绕过 service facade 直接调用领域 API。',
    allowRelativePathPrefixes: ['src/services/']
  },
  {
    pattern:
      /\b(?:printApi|blueToothPrintCode|queryPrintConfig|userPrintConfig|updatePrintStatus|validatePrintSelection)\b/g,
    message:
      '打印订单列表首期只允许只读查询，不能绕过 service 或混入设备、模板、配置和状态回写逻辑。',
    includeRelativePathPrefixes: ['src/pages/print/list/']
  },
  {
    pattern: /(?:from\s+|require\(\s*)['"`]react-native(?:\/[^'"`]*)?['"`]/g,
    message:
      '业务代码不能直接依赖 react-native，请通过 shared/platform 或 shared/native facade。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bkeyboardShouldPersistTaps\s*=/g,
    message:
      '页面不能直接使用 RN ScrollView 键盘属性，请通过 shared/native 表单滚动容器。',
    allowRelativePathPrefixes: ['src/shared/native/']
  },
  {
    pattern: /(?:from\s+|require\(\s*)['"`]react-native-webview['"`]/g,
    message: 'WebView 原生组件只能在 shared/native 中封装。',
    allowRelativePathPrefixes: ['src/shared/native/']
  },
  {
    pattern: /(?:from\s+|require\(\s*)['"`]@react-native(?:\/|-)[^'"`]+['"`]/g,
    message:
      '业务代码不能直接依赖 RN 原生包，请通过 shared/platform、shared/native 或 cache facade。',
    allowRelativePathPrefixes: nativeOrCacheFacadeRelativePathPrefixes
  },
  {
    pattern:
      /\bwindow\.(?:document|location|history|navigator|localStorage|sessionStorage|addEventListener|removeEventListener|open|close|postMessage)\b/g,
    message: 'RN App 业务代码不能调用 window DOM/H5 API。'
  },
  {
    pattern:
      /\bdocument\.(?:querySelector|querySelectorAll|getElementById|getElementsByClassName|createElement|body|head|cookie|addEventListener|removeEventListener)\b/g,
    message: 'RN App 业务代码不能调用 document DOM API。'
  },
  {
    pattern:
      /\b(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem|clear|key)\b/g,
    message: 'RN App 不支持 Web Storage，请通过 src/cache facade。'
  },
  {
    pattern: /\bnavigator\.(?:geolocation|clipboard|share|userAgent)\b/g,
    message: 'RN App 不能直接调用 navigator API，请通过对应端能力 facade。'
  },
  {
    pattern:
      /\bTaro\.(?:getSystemInfoSync|getMenuButtonBoundingClientRect|createSelectorQuery|getFileSystemManager|onUserCaptureScreen|offUserCaptureScreen|pageScrollTo|setTabBarBadge|removeTabBarBadge|showShareMenu|hideShareMenu|chooseAddress|chooseInvoiceTitle|login|checkSession|requestPayment|createCanvasContext|canvasToTempFilePath)\b/g,
    message:
      '该 Taro API 不属于 RN App 可直接使用能力，请通过 shared/platform、shared/native 或业务 facade 重构。'
  },
  {
    pattern: /\bposition\s*:\s*(?:fixed|sticky)\b/g,
    message:
      'React Native 不支持 fixed/sticky 定位，请使用可控容器内的 absolute 布局。',
    fileExtensions: ['.scss']
  },
  {
    pattern: /(^|[;{]\s*)inset\s*:/gm,
    message:
      'React Native 不支持 inset 简写，请显式设置 top/right/bottom/left。',
    fileExtensions: ['.scss']
  },
  {
    pattern: /\bborder-(?:top|right|bottom|left)-style\s*:/g,
    message:
      'Taro RN 不支持单边 border style，请使用 RN 支持的边框或独立分隔 View。',
    fileExtensions: ['.scss']
  },
  {
    pattern:
      /^\s*(?:[.#]?[A-Za-z_][\w-]*)(?:\s*[+>~]\s*|\s+)(?:[.#]?[A-Za-z_][\w-]*)(?=[^,{\r\n]*\{)/gm,
    message:
      'Taro RN 会忽略后代/子级/兄弟组合选择器，请给目标元素添加独立 modifier class。',
    fileExtensions: ['.scss']
  },
  {
    pattern: /\.[A-Za-z_][\w-]*\.[A-Za-z_][\w-]*/g,
    message:
      'Taro RN 不支持复合类选择器，请给目标元素添加单一语义类或 modifier class。',
    fileExtensions: ['.scss']
  },
  {
    pattern: /\bbackground-image\s*:/g,
    message:
      'Taro RN 不支持 background-image，请使用 Image 组件配合 flex/absolute 布局。',
    fileExtensions: ['.scss']
  },
  {
    pattern: /\bbox-shadow\s*:/g,
    message:
      'box-shadow 不是可靠的 RN 跨端阴影方案，请通过共享样式封装平台阴影。',
    fileExtensions: ['.scss']
  },
  {
    pattern:
      /\b(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/gi,
    message:
      'RN 样式禁止 gradient，请使用 Image 或可跨端渲染的视觉资产。',
    fileExtensions: ['.scss']
  },
  {
    pattern: /::[A-Za-z][A-Za-z0-9-]*/g,
    message: 'RN 样式不支持伪元素，请给目标元素添加独立语义类。',
    fileExtensions: ['.scss']
  },
  {
    pattern: /\belevation\s*:/g,
    message: '页面样式不能直接使用 elevation，请使用共享跨端视觉组件。',
    fileExtensions: ['.scss'],
    includeRelativePathPrefixes: ['src/pages/']
  },
  {
    pattern: /\belevation\s*:/g,
    message: '页面原生样式不能直接使用 elevation，请使用共享跨端视觉组件。',
    fileExtensions: ['.ts', '.tsx'],
    includeRelativePathPrefixes: ['src/pages/']
  },
  {
    pattern:
      /\bimport\s+((?:(?!\bimport\b)[\s\S])*?\b(?:Pressable|TouchableHighlight|TouchableNativeFeedback|TouchableOpacity|TouchableWithoutFeedback)\b(?:(?!\bfrom\b)[\s\S])*?)\s+from\s+['"]react-native['"]/g,
    message:
      '点击控件必须统一使用 AppPressable/AppButton，禁止业务或其他 facade 直接引入 RN Pressable。',
    allowRelativePaths: ['src/shared/native/AppNativePressable.tsx']
  },
  {
    pattern:
      /\b(?:const|let|var)\s*\{[^}]*\b(?:Pressable|TouchableHighlight|TouchableNativeFeedback|TouchableOpacity|TouchableWithoutFeedback)\b[^}]*\}\s*=\s*require\s*\(\s*['"]react-native['"]\s*\)/g,
    message:
      '点击控件必须统一使用 AppPressable/AppButton，禁止业务或其他 facade 直接引入 RN Pressable。',
    allowRelativePaths: ['src/shared/native/AppNativePressable.tsx']
  },
  {
    pattern: /\bfloat\s*:/g,
    message: 'React Native 不支持 float，请使用 flex 布局。',
    fileExtensions: ['.scss']
  },
  {
    pattern: /\b(?:display\s*:\s*(?:inline-)?grid|grid(?:-[\w-]+)?\s*:)/g,
    message:
      'React Native 不支持 CSS Grid，请使用 flexDirection、alignItems 和 justifyContent。',
    fileExtensions: ['.scss']
  },
  {
    pattern: /\bbackgroundImage\s*:/g,
    message:
      'Taro RN 不支持内联 backgroundImage，请使用 Image 组件配合 flex/absolute 布局。',
    fileExtensions: ['.ts', '.tsx']
  },
  {
    pattern: /\bboxShadow\s*:/g,
    message:
      '内联 boxShadow 不是可靠的 RN 跨端阴影方案，请通过共享样式封装平台阴影。',
    fileExtensions: ['.ts', '.tsx']
  },
  {
    pattern: /\bposition\s*:\s*['"](?:fixed|sticky)['"]/g,
    message:
      'React Native 不支持内联 fixed/sticky 定位，请使用可控容器内的 absolute 布局。',
    fileExtensions: ['.ts', '.tsx']
  },
  {
    pattern:
      /\b(?:float|gridTemplate(?:Areas|Columns|Rows)|gridColumn|gridRow)\s*:/g,
    message: 'RN 内联样式不能使用 float/CSS Grid，请使用 Flex 布局属性。',
    fileExtensions: ['.ts', '.tsx']
  },
  {
    pattern: /\bdisplay\s*:\s*['"](?:grid|inline-grid)['"]/g,
    message: 'React Native 不支持内联 CSS Grid，请使用 Flex 布局属性。',
    fileExtensions: ['.ts', '.tsx']
  },
  {
    pattern: /\bprocess\.env\.TARO_ENV\b/g,
    message:
      'RN-only App 不应保留小程序多端运行时分支，请使用 runtime 配置或 capability 矩阵。'
  },
  {
    pattern: /\bTaro\.getEnv\b/g,
    message:
      'RN-only App 不应做 Taro 多端运行时探测，请使用 runtime 配置或 capability 矩阵。'
  },
  {
    pattern: /\bNativeModules\b/g,
    message:
      'RN NativeModules 只能在 shared/platform 或 shared/native 中封装。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bPermissionsAndroid\b/g,
    message: 'RN 权限请求只能在 shared/platform 或 shared/native 中封装。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bLinking\b/g,
    message: 'RN Linking 只能在 shared/platform 或 shared/native 中封装。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bShare\.share\b/g,
    message: 'RN 系统分享只能在 shared/platform 或 shared/native 中封装。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bAlert\.alert\b/g,
    message: 'RN 原生弹窗只能在 shared/platform 或 shared/native 中封装。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bTaro\.scanCode\b/g,
    message: '扫码请使用 shared/platform/scan。'
  },
  {
    pattern: /\bTaro\.getLocation\b/g,
    message: '定位请使用 shared/platform/location。'
  },
  {
    pattern: /\bTaro\.chooseLocation\b/g,
    message: '地图选点请使用 shared/platform/map。'
  },
  {
    pattern: /\bTaro\.openLocation\b/g,
    message: '打开地图请使用 shared/platform/map。'
  },
  {
    pattern: /\bTaro\.makePhoneCall\b/g,
    message: '拨打电话请使用 shared/platform/phone。'
  },
  {
    pattern: /\bTaro\.uploadFile\b/g,
    message: '上传文件请使用 shared/platform/files。'
  },
  {
    pattern: /\bTaro\.downloadFile\b/g,
    message: '下载文件请使用 shared/platform/files。'
  },
  {
    pattern: /\bTaro\.requestSubscribeMessage\b/g,
    message: '订阅消息请使用 shared/platform/notifications。'
  },
  {
    pattern: /\buseShareAppMessage\b/g,
    message:
      '小程序分享钩子不能进入 RN App，分享能力请使用 shared/platform/share。'
  },
  {
    pattern: /\buseShareTimeline\b/g,
    message:
      '小程序朋友圈分享钩子不能进入 RN App，分享能力请使用 shared/platform/share。'
  },
  {
    pattern: /\bonShareAppMessage\b/g,
    message:
      '小程序分享生命周期不能进入 RN App，分享能力请使用 shared/platform/share。'
  },
  {
    pattern: /\bopenType\s*=/g,
    message:
      '小程序开放能力按钮不能进入 RN App，请改为对应 shared/platform facade。'
  },
  {
    pattern: /\bTaro\.navigateToMiniProgram\b/g,
    message: '外跳小程序请使用 shared/platform/externalApp。'
  },
  {
    pattern: /\bTaro\.(chooseImage|chooseMedia|chooseVideo)\b/g,
    message: '媒体选择请通过 shared/platform/files 或后续媒体 facade。'
  },
  {
    pattern: /\bTaro\.(getUserProfile|authorize|getSetting|openSetting)\b/g,
    message: '授权能力请通过 App 登录/权限 facade 重新建模。'
  },
  {
    pattern: /\bTaro\.saveImageToPhotosAlbum\b/g,
    message: '保存相册请通过 App 文件/媒体 facade 重新建模。'
  },
  {
    pattern: /\bTaro\.(setClipboardData|getClipboardData)\b/g,
    message: '剪贴板能力请使用 shared/platform/clipboard。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bTaro\.previewImage\b/g,
    message: '图片预览请通过 App 文件/媒体 facade 重新建模。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bTaro\.openDocument\b/g,
    message: '文档打开请使用 shared/platform/files。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bAPP_ROUTES\.web\b/g,
    message: 'WebView 入口请使用 shared/webview/createAppWebUrl 统一承接。',
    allowRelativePaths: ['src/shared/webview/appWeb.ts']
  },
  {
    pattern: /\$\{\s*APP_ROUTES\.[A-Za-z0-9_]+\s*\}\?/g,
    message:
      '动态 App 路由 query 请使用 shared/navigation/routeUrl.ts 统一生成。'
  },
  {
    pattern: /\bAPP_ROUTES\.[A-Za-z0-9_]+\s*\+\s*['"`]\?/g,
    message:
      '动态 App 路由 query 请使用 shared/navigation/routeUrl.ts 统一生成。'
  },
  {
    pattern: /\bEVENT_TRACK\b/g,
    message:
      '旧小程序埋点入口不能直接迁入 RN App，请使用 shared/platform/analytics。'
  },
  {
    pattern: /from\s+['"`][^'"`]*sensors[^'"`]*['"`]/g,
    message:
      '小程序神策 SDK 不能直接迁入 RN App，请使用 shared/platform/analytics。'
  }
]

function walkFiles(directory) {
  return readdirSync(directory).flatMap(entry => {
    const fullPath = path.join(directory, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      return walkFiles(fullPath)
    }

    if (sourceExtensions.has(path.extname(fullPath))) {
      return [fullPath]
    }

    return []
  })
}

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/')
}

function isAllowedByRule(rule, relativePath) {
  if (rule.allowRelativePaths?.includes(relativePath)) {
    return true
  }

  return (
    rule.allowRelativePathPrefixes?.some(prefix =>
      relativePath.startsWith(prefix)
    ) ?? false
  )
}

function isIncludedByRule(rule, relativePath) {
  return (
    !rule.includeRelativePathPrefixes ||
    rule.includeRelativePathPrefixes.some(prefix =>
      relativePath.startsWith(prefix)
    )
  )
}

function isTaroApiFacade(relativePath) {
  return taroApiFacadeRelativePathPrefixes.some(prefix =>
    relativePath.startsWith(prefix)
  )
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function pushForbiddenTaroApiViolation(filePath, content, index, token) {
  violations.push({
    filePath,
    line: getLineNumber(content, index),
    token,
    message:
      '禁止通过别名或具名导入绕过 Taro RN API 门禁，请使用 shared facade。'
  })
}

function checkForbiddenTaroApiAliases(filePath, relativePath, content) {
  if (
    isTaroApiFacade(relativePath) ||
    !['.ts', '.tsx'].includes(path.extname(filePath))
  ) {
    return
  }

  const aliases = []
  const aliasPatterns = [
    /\bimport\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s+from\s+['"]@tarojs\/taro['"]/g,
    /\bimport\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"]@tarojs\/taro['"]/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]@tarojs\/taro['"]\s*\)/g
  ]

  for (const pattern of aliasPatterns) {
    for (const match of content.matchAll(pattern)) {
      aliases.push(match[1])
    }
  }

  const apiAlternation = Array.from(forbiddenTaroApiNames).join('|')

  for (const alias of new Set(aliases)) {
    const memberPattern = new RegExp(
      `\\b${escapeRegExp(alias)}\\.(${apiAlternation})\\b`,
      'g'
    )

    for (const match of content.matchAll(memberPattern)) {
      pushForbiddenTaroApiViolation(
        filePath,
        content,
        match.index ?? 0,
        match[0]
      )
    }
  }

  const namedImportPatterns = [
    /\bimport\s*\{([\s\S]*?)\}\s*from\s+['"]@tarojs\/taro['"]/g,
    /\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\(\s*['"]@tarojs\/taro['"]\s*\)/g
  ]

  for (const pattern of namedImportPatterns) {
    for (const match of content.matchAll(pattern)) {
      for (const rawSpecifier of match[1].split(',')) {
        const specifier = rawSpecifier.trim().replace(/^type\s+/, '')
        const importedName = specifier.split(/\s+(?:as|:)\s+/)[0]

        if (!forbiddenTaroApiNames.has(importedName)) {
          continue
        }

        const index = (match.index ?? 0) + match[0].indexOf(rawSpecifier)

        pushForbiddenTaroApiViolation(
          filePath,
          content,
          index,
          rawSpecifier.trim()
        )
      }
    }
  }
}

const violations = []

function checkPackageDependencies() {
  if (!existsSync(packageJsonPath)) {
    return
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const dependencyGroups = [
    'dependencies',
    'devDependencies',
    'peerDependencies'
  ]

  for (const group of dependencyGroups) {
    const dependencies = packageJson[group] ?? {}

    for (const dependencyName of Object.keys(dependencies)) {
      if (forbiddenPlatformPackages.has(dependencyName)) {
        violations.push({
          filePath: packageJsonPath,
          line: 1,
          token: dependencyName,
          message: 'RN-only App 不应依赖小程序/H5 平台插件。'
        })
      }
    }
  }
}

checkPackageDependencies()

function checkMiniProgramConfigFiles() {
  for (const fileName of forbiddenMiniProgramConfigFiles) {
    const filePath = path.join(appRoot, fileName)

    if (existsSync(filePath)) {
      violations.push({
        filePath,
        line: 1,
        token: fileName,
        message: 'RN-only App 不应保留小程序 IDE 项目配置。'
      })
    }
  }
}

checkMiniProgramConfigFiles()

function checkNativeIdentity() {
  for (const item of nativeIdentityChecks) {
    if (!existsSync(item.filePath)) {
      violations.push({
        filePath: item.filePath,
        line: 1,
        token: path.relative(appRoot, item.filePath),
        message: `缺少原生身份配置文件。${item.message}`
      })
      continue
    }

    const content = readFileSync(item.filePath, 'utf8')

    if (!content.includes(item.expected)) {
      violations.push({
        filePath: item.filePath,
        line: 1,
        token: item.expected,
        message: item.message
      })
    }
  }
}

checkNativeIdentity()

function checkRnBehaviorContracts() {
  for (const item of rnBehaviorContractChecks) {
    if (!existsSync(item.filePath)) {
      violations.push({
        filePath: item.filePath,
        line: 1,
        token: path.relative(appRoot, item.filePath),
        message: item.message
      })
      continue
    }

    const content = readFileSync(item.filePath, 'utf8')

    if (!content.includes(item.expected)) {
      violations.push({
        filePath: item.filePath,
        line: 1,
        token: item.expected,
        message: item.message
      })
    }
  }
}

checkRnBehaviorContracts()

for (const filePath of walkFiles(srcRoot)) {
  const content = readFileSync(filePath, 'utf8')
  const relativePath = toPosixPath(path.relative(appRoot, filePath))

  if (
    relativePath.startsWith(pageUiRelativePathPrefix) &&
    path.extname(filePath) === '.tsx'
  ) {
    engineeringUiCopyPattern.lastIndex = 0

    for (const match of content.matchAll(engineeringUiCopyPattern)) {
      violations.push({
        filePath,
        line: getLineNumber(content, match.index ?? 0),
        token: match[0],
        message:
          '用户界面不能展示迁移阶段或技术实现说明，请改为业务文案或正常的可用状态提示。'
      })
    }
  }

  if (
    path.extname(filePath) === '.tsx' &&
    /\bclassName\s*=/.test(content) &&
    !/\bimport\b[^\r\n]*['"][^'"]+\.(?:css|scss)['"]/.test(content)
  ) {
    const classNameIndex = content.search(/\bclassName\s*=/)

    violations.push({
      filePath,
      line: getLineNumber(content, classNameIndex),
      token: 'className=',
      message:
        'Taro RN 组件使用 className 时必须在当前 TSX 显式导入样式文件，否则子组件样式不会生成映射。'
    })
  }

  checkForbiddenTaroApiAliases(filePath, relativePath, content)

  for (const rule of forbiddenPatterns) {
    if (
      rule.fileExtensions &&
      !rule.fileExtensions.includes(path.extname(filePath))
    ) {
      continue
    }

    if (!isIncludedByRule(rule, relativePath)) {
      continue
    }

    if (isAllowedByRule(rule, relativePath)) {
      continue
    }

    rule.pattern.lastIndex = 0

    for (const match of content.matchAll(rule.pattern)) {
      violations.push({
        filePath,
        line: getLineNumber(content, match.index ?? 0),
        token: match[0],
        message: rule.message
      })
    }
  }
}

if (violations.length) {
  console.error('RN boundary check failed. Found boundary violations:\n')

  for (const violation of violations) {
    const relativePath = path.relative(appRoot, violation.filePath)

    console.error(
      `${relativePath}:${violation.line} ${violation.token} - ${violation.message}`
    )
  }

  process.exit(1)
}

console.log('RN boundary check passed.')
