import { Component, PropsWithChildren } from 'react'

import { bootstrapAppRuntime } from './app.bootstrap'
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

    return this.props.children
  }
}
export default App
