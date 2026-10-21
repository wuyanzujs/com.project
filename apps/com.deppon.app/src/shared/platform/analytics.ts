import { APP_NATIVE_CAPABILITIES } from './capabilities'

export type AppAnalyticsProperty = string | number | boolean | null | undefined

export interface AppAnalyticsEvent {
  name: string
  source?: string
  properties?: Record<string, AppAnalyticsProperty>
}

export function isAppAnalyticsReady() {
  return APP_NATIVE_CAPABILITIES.analytics === 'ready'
}

export function trackAppEvent(event: AppAnalyticsEvent) {
  const name = event.name.trim()

  if (!name || !isAppAnalyticsReady()) {
    return false
  }

  return false
}

export interface AppErrorReport {
  /** 出错位置，例如 app-root、boot、order-detail。 */
  scope: string
  /** React 组件栈，仅 ErrorBoundary 能提供。 */
  componentStack?: string
}

export interface AppErrorPayload extends AppErrorReport {
  message: string
  stack: string
}

export type AppErrorReporter = (payload: AppErrorPayload) => void

let errorReporter: AppErrorReporter | null = null

/** 接入崩溃上报 SDK 后，在启动阶段注册一次即可接管全部错误出口。 */
export function setAppErrorReporter(reporter: AppErrorReporter | null) {
  errorReporter = reporter
}

const ERROR_STACK_LIMIT = 800

// 全局错误出口：上报通道未接入时也必须留下 native 日志（logcat / Xcode console），
// 否则线上崩溃只能靠用户反馈。
export function reportAppError(error: unknown, report: AppErrorReport) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? (error.stack ?? '') : ''

  console.error(`[app-error] ${report.scope}: ${message}`)

  if (stack) {
    console.error(stack)
  }

  if (errorReporter) {
    try {
      errorReporter({ ...report, message, stack })
    } catch {
      // 上报通道自身失败不能覆盖原始异常。
    }
  }

  return trackAppEvent({
    name: 'app_error',
    source: 'app',
    properties: {
      message: message.slice(0, ERROR_STACK_LIMIT),
      scope: report.scope,
      componentStack: report.componentStack?.slice(0, ERROR_STACK_LIMIT)
    }
  })
}
