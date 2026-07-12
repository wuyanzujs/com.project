import { ScrollView, Text, View } from '@tarojs/components'

import type { PropsWithChildren, ReactNode } from 'react'

import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'
import {
  AppKeyboardAvoidingView,
  AppNativeModal,
  AppNativePressable,
  AppSafeAreaView
} from '../../native'

import './index.scss'

export type AppDialogPlacement = 'center' | 'bottom'

export interface AppDialogProps extends PropsWithChildren {
  backdropClassName?: string
  closeOnBackdropPress?: boolean
  contentClassName?: string
  contentSpacing?: boolean
  description?: string
  descriptionClassName?: string
  footer?: ReactNode
  footerClassName?: string
  panelClassName?: string
  placement?: AppDialogPlacement
  title?: string
  titleClassName?: string
  visible: boolean
  onClose: () => void
}

export function AppDialog({
  children,
  backdropClassName,
  closeOnBackdropPress = false,
  contentClassName,
  contentSpacing = true,
  description,
  descriptionClassName,
  footer,
  footerClassName,
  onClose,
  panelClassName,
  placement = 'center',
  title,
  titleClassName,
  visible
}: AppDialogProps) {
  return (
    <AppNativeModal visible={visible} onRequestClose={onClose}>
      <AppKeyboardAvoidingView>
        <AppSafeAreaView
          backgroundColor={APP_STYLE_COLORS.transparent}
          edges={[...APP_NATIVE_TOKENS.safeArea.defaultEdges]}
        >
          <AppNativePressable
            fill
            onPress={closeOnBackdropPress ? onClose : undefined}
          >
            <View
              className={[
                'app-dialog',
                `app-dialog--${placement}`,
                backdropClassName
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <AppNativePressable onPress={event => event.stopPropagation()}>
                <View
                  className={[
                    'app-dialog__panel',
                    `app-dialog__panel--${placement}`,
                    panelClassName
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <ScrollView className='app-dialog__body' scrollY>
                    {title ? (
                      <Text
                        className={['app-dialog__title', titleClassName]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {title}
                      </Text>
                    ) : null}
                    {description ? (
                      <Text
                        className={[
                          'app-dialog__description',
                          descriptionClassName
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {description}
                      </Text>
                    ) : null}
                    <View
                      className={[
                        contentSpacing && 'app-dialog__content',
                        contentClassName
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {children}
                    </View>
                  </ScrollView>
                  {footer ? (
                    <View
                      className={['app-dialog__footer', footerClassName]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {footer}
                    </View>
                  ) : null}
                </View>
              </AppNativePressable>
            </View>
          </AppNativePressable>
        </AppSafeAreaView>
      </AppKeyboardAvoidingView>
    </AppNativeModal>
  )
}
