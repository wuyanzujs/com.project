import type { PropsWithChildren } from 'react'

import { Modal } from 'react-native'

import { APP_NATIVE_TOKENS } from '@/styles/nativeTokens'

interface AppNativeModalProps extends PropsWithChildren {
  visible: boolean
  onRequestClose: () => void
  /** 底部弹层用 slide，其余沿用全局 fade。 */
  animationType?: 'none' | 'fade' | 'slide'
}

export function AppNativeModal({ animationType, children, onRequestClose, visible }: AppNativeModalProps) {
  return (
    <Modal
      animationType={animationType ?? APP_NATIVE_TOKENS.dialog.animation}
      hardwareAccelerated
      statusBarTranslucent={APP_NATIVE_TOKENS.dialog.statusBarTranslucent}
      transparent
      visible={visible}
      onRequestClose={onRequestClose}
    >
      {children}
    </Modal>
  )
}
