import Taro from '@tarojs/taro'

export function copyTextToClipboard(value: string) {
  const data = value.trim()

  if (!data) {
    return Promise.reject(new Error('缺少可复制内容'))
  }

  return new Promise<void>((resolve, reject) => {
    Taro.setClipboardData({
      data,
      success: () => resolve(),
      fail: (error) => reject(error)
    })
  })
}
