import { Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'

import './index.scss'

interface ExpressOrderOptionsSectionProps {
  agreementAccepted: boolean
  submitMessage: string
  validationMessages: string[]
  onToggleAgreement: () => void
}

export function ExpressOrderOptionsSection({
  agreementAccepted,
  submitMessage,
  validationMessages,
  onToggleAgreement
}: ExpressOrderOptionsSectionProps) {
  return (
    <View className='express-order-options'>
      <AppPressable
        accessibilityLabel={
          agreementAccepted ? '取消同意电子运单协议' : '同意电子运单协议'
        }
        block
        className='express-order-options__agreement'
        layout='row-start'
        onPress={onToggleAgreement}
      >
        <View
          className={
            agreementAccepted
              ? 'express-order-options__checkbox express-order-options__checkbox--checked'
              : 'express-order-options__checkbox'
          }
        >
          <Text className='express-order-options__checkbox-text'>
            {agreementAccepted ? '✓' : ''}
          </Text>
        </View>
        <Text className='express-order-options__agreement-text'>
          已阅读并同意《电子运单服务协议》
        </Text>
      </AppPressable>

      {submitMessage || validationMessages.length ? (
        <View className='express-order-options__validation'>
          {submitMessage ? (
            <Text className='express-order-options__validation-message'>
              {submitMessage}
            </Text>
          ) : null}
          {validationMessages.slice(0, 3).map(message => (
            <Text
              className='express-order-options__validation-message'
              key={message}
            >
              {message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}
