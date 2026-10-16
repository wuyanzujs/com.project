import Taro from '@tarojs/taro'

import { TurboModuleRegistry } from 'react-native'

import type { TurboModule } from 'react-native'

type ClipboardNativeModule = TurboModule & {
  setString: (value: string) => void
}

export function copyTextToClipboard(value: string) {
  const data = value.trim()

  if (!data) {
    return Promise.reject(new Error('缺少可复制内容'))
  }

  // 原生剪贴板模块（RNCClipboard）未随安装包链入时，taro-rn 首次调用会在模块加载
  // 阶段同步抛出 TurboModuleRegistry.getEnforcing 异常；Metro 的 guardedLoadModule
  // 会直接 reportFatalError 而不向调用方传播，Promise 无法 reject，页面也就收不到
  // 任何 toast。这里先用同一注册表做非抛错探测，缺失时按不可用降级。
  if (!TurboModuleRegistry.get<ClipboardNativeModule>('RNCClipboard')) {
    return Promise.reject(new Error('剪贴板能力不可用，请更新安装包'))
  }

  return new Promise<void>((resolve, reject) => {
    Taro.setClipboardData({
      data,
      success: () => resolve(),
      fail: error => reject(error)
    })
  })
}
