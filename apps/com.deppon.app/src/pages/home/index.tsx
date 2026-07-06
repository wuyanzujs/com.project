import Banner from './components/banner'
import Menu from './components/menu'
import Navibar from './components/navibar'
import Search from './components/search'
import './index.scss'

export const Express = () => {
  return (
    <>
      <Navibar />
      <Banner />
      <Menu />
      <Search />
    </>
  )
}
