import { ScrollView, Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { AppLinearGradient, AppNativeModalSheet, AppNativePressable } from '@/shared/native'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { createAppWebUrl } from '@/shared/webview/appWeb'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

interface LoginAgreementSheetProps {
  visible: boolean
  onAgree: () => void
  onDecline: () => void
}

/**
 * @description 登录未勾选协议时的底部确认弹层：同意后勾选协议并继续被拦下的动作。
 */
export function LoginAgreementSheet({ onAgree, onDecline, visible }: LoginAgreementSheetProps) {
  return (
    <AppNativeModalSheet accessibilityLabel='关闭服务协议及隐私政策弹窗' visible={visible} onRequestClose={onDecline}>
      <View className='login-agreement-sheet'>
        <View className='login-agreement-sheet__header'>
          <Text className='login-agreement-sheet__title'>服务协议及隐私政策</Text>
          <AppNativePressable accessibilityLabel='关闭服务协议及隐私政策弹窗' onPress={onDecline}>
            <View className='login-agreement-sheet__close'>
              <View className='login-agreement-sheet__close-circle'>
                <AppIcon color={APP_STYLE_COLORS.text.subdued} name='close' size={32} strokeWidth={2} />
              </View>
            </View>
          </AppNativePressable>
        </View>
        <ScrollView className='login-agreement-sheet__scroll' scrollY>
          <View className='login-agreement-sheet__body'>
            <Text className='login-agreement-sheet__text'>
              在您注册成为德邦快递会员的过程中，您需要通过点击同意的形式在线签署《德邦快递服务协议》、《德邦快递隐私政策》，请您务必仔细阅读、充分理解条款内容后再点击同意（尤其是以红字、粗体或下划线标识的条款，因为这些条款可能会明确您应履行的义务或对您的权利有所限制）。
            </Text>
            <Text className='login-agreement-sheet__text login-agreement-sheet__text--note'>
              请您注意：如果您不同意上述服务条款、隐私政策或其中任何约定，请您停止注册。如您阅读并点击同意即表示您已充分阅读、理解并接受其全部内容，并表示您也同意德邦快递可以依据以上隐私政策来处理您的个人信息。如您对以上服务条款、隐私政策有任何疑问，您可联系德邦快递客服。
            </Text>
            <View className='login-agreement-sheet__links'>
              <Text className='login-agreement-sheet__links-text'>点击同意即表示您已阅读并同意</Text>
              <AppPressable
                accessibilityLabel='查看德邦快递用户协议'
                className='login-agreement-sheet__links-item'
                compact
                hitSlop={8}
                onPress={() => navigateToAppRoute(createAppWebUrl({ source: 'AUTH_LOGIN_SERVICE_PROTOCOL' }))}
              >
                <Text className='login-agreement-sheet__links-item-text'>《德邦快递用户协议》</Text>
              </AppPressable>
              <Text className='login-agreement-sheet__links-text'>与</Text>
              <AppPressable
                accessibilityLabel='查看德邦快递隐私政策'
                className='login-agreement-sheet__links-item'
                compact
                hitSlop={8}
                onPress={() => navigateToAppRoute(createAppWebUrl({ source: 'AUTH_LOGIN_PRIVACY_PROTOCOL' }))}
              >
                <Text className='login-agreement-sheet__links-item-text'>《德邦快递隐私政策》</Text>
              </AppPressable>
            </View>
          </View>
        </ScrollView>
        <View className='login-agreement-sheet__footer'>
          <AppPressable
            accessibilityLabel='不同意服务协议及隐私政策'
            className='login-agreement-sheet__button login-agreement-sheet__button--ghost'
            compact
            contentElement='view'
            onPress={onDecline}
          >
            <Text className='login-agreement-sheet__button-text login-agreement-sheet__button-text--ghost'>不同意</Text>
          </AppPressable>
          <AppPressable
            accessibilityLabel='同意服务协议及隐私政策'
            className='login-agreement-sheet__button login-agreement-sheet__button--primary'
            compact
            contentElement='view'
            onPress={onAgree}
          >
            <AppLinearGradient
              className='login-agreement-sheet__gradient'
              colors={[APP_STYLE_COLORS.brand.gradientStart, APP_STYLE_COLORS.brand.gradientEnd]}
            />
            <Text className='login-agreement-sheet__button-text login-agreement-sheet__button-text--primary'>同意</Text>
          </AppPressable>
        </View>
      </View>
    </AppNativeModalSheet>
  )
}
