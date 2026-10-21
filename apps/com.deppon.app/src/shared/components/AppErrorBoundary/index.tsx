import { Text, View } from '@tarojs/components'

import { Component, type ErrorInfo, type ReactNode } from 'react'

import { reportAppError } from '@/shared/platform/analytics'

import { AppButton } from '../AppButton'
import './index.scss'

export interface AppErrorBoundaryProps {
  /** 出错位置标识，会带进错误上报，便于定位是哪个页面挂了。 */
  scope: string
  children?: ReactNode
  /** 自定义兜底内容，不传时使用内置的「页面加载失败」界面。 */
  fallback?: ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
}

// RN 里渲染期抛错如果不接边界，Release 包会直接白屏且没有任何日志出口。
// 这里负责一件事：兜住子树异常 → 上报 → 给用户一个可重试的界面。
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  state: AppErrorBoundaryState = {
    error: null
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportAppError(error, {
      scope: this.props.scope,
      componentStack: errorInfo.componentStack ?? ''
    })
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    const { children, fallback } = this.props
    const { error } = this.state

    if (!error) {
      return children ?? null
    }

    if (fallback) {
      return fallback
    }

    return (
      <View className='app-error-boundary'>
        <Text className='app-error-boundary__title'>页面加载失败</Text>
        <Text className='app-error-boundary__desc'>请重试一次，如果仍然失败，请返回首页或更新到最新版本</Text>
        <View className='app-error-boundary__action'>
          <AppButton label='重新加载' variant='primary' onPress={this.handleRetry} />
        </View>
      </View>
    )
  }
}
