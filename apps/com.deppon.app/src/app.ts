import { Component, createElement, PropsWithChildren } from 'react'

import { SafeAreaProvider } from 'react-native-safe-area-context'

import { bootstrapAppRuntime } from './app.bootstrap'
import { AppBootScreen } from './shared/components/AppBootScreen'
import { AppErrorBoundary } from './shared/components/AppErrorBoundary'
import { AppStatusBar } from './shared/native'
import { ensureCurrentRouteAuthenticated } from './shared/navigation/authGuard'
import { reportAppError } from './shared/platform/analytics'
import './app.scss'

const BOOTSTRAP_TIMEOUT_MS = 5000

let bootstrapTimer: ReturnType<typeof setTimeout> | null = null

interface AppState {
  ready: boolean
  bootError: string
}

class App extends Component<PropsWithChildren, AppState> {
  state: AppState = {
    ready: false,
    bootError: ''
  }

  componentDidMount() {
    this.startBootstrap()
  }

  componentWillUnmount() {
    this.clearBootstrapTimer()
  }

  componentDidShow() {
    if (this.state.ready) {
      ensureCurrentRouteAuthenticated()
    }
  }

  componentDidHide() {}

  private startBootstrap() {
    this.clearBootstrapTimer()

    bootstrapTimer = setTimeout(() => {
      if (this.state.ready) {
        return
      }

      reportAppError(new Error('bootstrapAppRuntime timeout'), { scope: 'app-bootstrap' })
      this.markReady()
    }, BOOTSTRAP_TIMEOUT_MS)

    bootstrapAppRuntime()
      .then(() => this.markReady())
      .catch((error: unknown) => {
        reportAppError(error, { scope: 'app-bootstrap' })
        this.clearBootstrapTimer()
        this.setState({ bootError: '启动失败，请检查网络后重试' })
      })
  }

  private clearBootstrapTimer() {
    if (bootstrapTimer) {
      clearTimeout(bootstrapTimer)
      bootstrapTimer = null
    }
  }

  private markReady() {
    this.clearBootstrapTimer()

    if (this.state.ready) {
      return
    }

    this.setState({ ready: true, bootError: '' }, () => {
      ensureCurrentRouteAuthenticated()
    })
  }

  private retryBootstrap() {
    this.setState({ bootError: '' })
    this.startBootstrap()
  }

  // this.props.children 是将要会渲染的页面
  render() {
    if (!this.state.ready) {
      return createElement(AppBootScreen, {
        errorMessage: this.state.bootError,
        onRetry: this.state.bootError ? () => this.retryBootstrap() : undefined
      })
    }

    return createElement(SafeAreaProvider, null, createElement(AppStatusBar), createElement(AppErrorBoundary, { scope: 'app-root' }, this.props.children))
  }
}
export default App
