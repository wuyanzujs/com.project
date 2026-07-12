import type { PropsWithChildren } from 'react'

import { Modal } from 'react-native'

import { APP_NATIVE_TOKENS } from '../../styles/nativeTokens'

interface AppNativeModalProps extends PropsWithChildren {
  visible: boolean
  onRequestClose: () => void
}

export function AppNativeModal({
  children,
  onRequestClose,
  visible
}: AppNativeModalProps) {
  return (
    <Modal
      animationType={APP_NATIVE_TOKENS.dialog.animation}
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
