import { Dimensions } from 'react-native'

// Taro 只把 Sass 里的 px 按设计稿宽度（750，见 config/index.ts）换算成 dp，数字型 props
// 走不进 Sass。这里补上同一套换算，否则同一个数值在样式里和在 props 里会差一个屏幕密度
// （1080p/480dpi 机器上 1 dp = 3 设备像素），图标会整体偏大两倍左右。
const DESIGN_WIDTH = 750

export function designPxToDp(value: number) {
  return (value * Dimensions.get('window').width) / DESIGN_WIDTH
}
