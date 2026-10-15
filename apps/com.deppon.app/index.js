import { LogBox } from 'react-native'

import '@tarojs/rn-supporter/entry-file.js'

// Taro RN 在构建期会把 tabBar.list 归一化为仅剩 pagePath/text，运行时
// router-rn 的 getTabIconSource 拿到 undefined 后仍返回 { uri: undefined }
// （上游 isUrl 三元两个分支同值，疑似笔误），导致 4 个隐藏的内置 tab item
// 每次冷启动各触发一次 "ReactImageView: Image source null doesn't exist"
// 软警告，并以 LogBox 横条遮挡底栏。app.config 的 iconPath 无论写成什么都
// 会被剥掉，应用层无法注入占位图，因此这里对该已知良性警告做精确白名单。
// 该警告仅存在于 dev 构建；生产构建没有 LogBox，不受影响。业务代码侧已有
// 静态检查兜底（所有 src 下的 Image src 均为非空字符串，见 src/grep 审计）。
LogBox.ignoreLogs(['ReactImageView: Image source "null" doesn\'t exist'])
