import { Component, PropsWithChildren } from 'react'

import { bootstrapAppRuntime } from './app.bootstrap'
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
      this.setState({ ready: true })
    })
  }

  componentDidShow() {}

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
