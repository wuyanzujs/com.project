import { Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'

import './index.scss'

interface ExpressOrderOptionsSectionProps {
  agreementAccepted: boolean
  submitMessage: string
  validationMessages: string[]
  onToggleAgreement: () => void
  onOpenAgreement: () => void
}

export function ExpressOrderOptionsSection({
  agreementAccepted,
  submitMessage,
  validationMessages,
  onOpenAgreement,
  onToggleAgreement
}: ExpressOrderOptionsSectionProps) {
  return (
    <View className='express-order-options'>
      <View className='express-order-options__agreement'>
        <AppPressable accessibilityLabel={agreementAccepted ? '取消同意电子运单协议' : '同意电子运单协议'} layout='row-start' onPress={onToggleAgreement}>
          {/* 生产端为蓝色实心圆点勾选图标：未勾选是灰色描边圆，勾选后填充并压白色对勾。 */}
          <View className={agreementAccepted ? 'express-order-options__check express-order-options__check--checked' : 'express-order-options__check'}>
            {agreementAccepted ? <Text className='express-order-options__check-mark'>✓</Text> : null}
          </View>
          <Text className='express-order-options__agreement-text'>已读并同意</Text>
        </AppPressable>
        <AppPressable accessibilityLabel='阅读电子运单服务协议' onPress={onOpenAgreement}>
          <Text className='express-order-options__agreement-link'>《电子运单服务协议》</Text>
        </AppPressable>
      </View>

      {submitMessage || validationMessages.length ? (
        <View className='express-order-options__validation'>
          {submitMessage ? <Text className='express-order-options__validation-message'>{submitMessage}</Text> : null}
          {validationMessages.slice(0, 3).map(message => (
            <Text className='express-order-options__validation-message' key={message}>
              {message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}
