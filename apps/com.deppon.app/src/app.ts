import { Component, PropsWithChildren } from 'react'

import { bootstrapAppRuntime } from './app.bootstrap'
import './app.scss'

class App extends Component<PropsWithChildren> {
  componentDidMount() {
    bootstrapAppRuntime()
  }

  componentDidShow() {}

  componentDidHide() {}

  // this.props.children 是将要会渲染的页面
  render() {
    return this.props.children
  }
}
export default App
