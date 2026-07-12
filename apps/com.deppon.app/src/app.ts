import { Component, createElement, PropsWithChildren } from 'react'

import { SafeAreaProvider } from 'react-native-safe-area-context'

import { bootstrapAppRuntime } from './app.bootstrap'
import { AppStatusBar } from './shared/native'
import { ensureCurrentRouteAuthenticated } from './shared/navigation/authGuard'
import './app.scss'

interface AppState {
  ready: boolean
}

class App extends Component<PropsWithChildren, AppState> {
  state: AppState = {
    ready: false
  }

  componentDidMount() {
    void bootstrapAppRuntime().finally(() => {
      this.setState({ ready: true }, () => {
        ensureCurrentRouteAuthenticated()
      })
    })
  }

  componentDidShow() {
    if (this.state.ready) {
      ensureCurrentRouteAuthenticated()
    }
  }

  componentDidHide() {}

  // this.props.children 是将要会渲染的页面
  render() {
    if (!this.state.ready) {
      return null
    }

    return createElement(
      SafeAreaProvider,
      null,
      createElement(AppStatusBar),
      this.props.children
    )
  }
}
export default App
