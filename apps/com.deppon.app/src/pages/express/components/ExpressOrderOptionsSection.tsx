import { Input, Text, View } from '@tarojs/components'

import { useState } from 'react'

import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import './ExpressOrderOptionsSection.scss'

interface ExpressOrderOptionsSectionProps {
  agreementAccepted: boolean
  remark: string
  submitMessage: string
  validationMessages: string[]
  onRemarkInput: (value: string) => void
  onToggleAgreement: () => void
}

export function ExpressOrderOptionsSection({
  agreementAccepted,
  remark,
  submitMessage,
  validationMessages,
  onRemarkInput,
  onToggleAgreement
}: ExpressOrderOptionsSectionProps) {
  const [remarkExpanded, setRemarkExpanded] = useState(false)

  return (
    <View className='express-order-options'>
      <AppPressable
        accessibilityLabel={
          remarkExpanded ? '收起备注输入' : '展开备注输入'
        }
        block
        className='express-order-options__entry'
        layout='row-start'
        onPress={() => setRemarkExpanded(current => !current)}
      >
        <Text className='express-order-options__label'>备注</Text>
        <Text className='express-order-options__summary'>
          {remark ? '已填写' : '选填'}
        </Text>
        <AppIcon
          color={APP_STYLE_COLORS.text.supporting}
          name={remarkExpanded ? 'chevronUp' : 'chevronDown'}
          size={APP_NATIVE_TOKENS.icon.small}
        />
      </AppPressable>
      {remarkExpanded ? (
        <View className='express-order-options__edit'>
          <Input
            className='express-order-options__input'
            placeholder='选填，交给快递员的信息'
            style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
            value={remark}
            onInput={event => onRemarkInput(event.detail.value)}
          />
        </View>
      ) : null}

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
          已阅读并同意电子运单协议
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
