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
  couponNumber: string
  remark: string
  submitMessage: string
  validationMessages: string[]
  onCouponNumberInput: (value: string) => void
  onRemarkInput: (value: string) => void
  onToggleAgreement: () => void
}

export function ExpressOrderOptionsSection({
  agreementAccepted,
  couponNumber,
  remark,
  submitMessage,
  validationMessages,
  onCouponNumberInput,
  onRemarkInput,
  onToggleAgreement
}: ExpressOrderOptionsSectionProps) {
  const [expandedField, setExpandedField] = useState<
    'coupon' | 'remark' | null
  >(null)
  const toggleField = (field: 'coupon' | 'remark') => {
    setExpandedField(current => (current === field ? null : field))
  }

  return (
    <View className='express-order-options'>
      <AppPressable
        accessibilityLabel={
          expandedField === 'coupon' ? '收起优惠券输入' : '展开优惠券输入'
        }
        block
        className='express-order-options__entry'
        layout='row-start'
        onPress={() => toggleField('coupon')}
      >
        <Text className='express-order-options__label'>优惠券</Text>
        <Text className='express-order-options__summary'>
          {couponNumber ? '已填写' : '暂无可用优惠券'}
        </Text>
        <AppIcon
          color={APP_STYLE_COLORS.text.supporting}
          name={expandedField === 'coupon' ? 'chevronUp' : 'chevronDown'}
          size={APP_NATIVE_TOKENS.icon.small}
        />
      </AppPressable>
      {expandedField === 'coupon' ? (
        <View className='express-order-options__edit'>
          <Input
            className='express-order-options__input'
            placeholder='输入优惠券编号'
            style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
            value={couponNumber}
            onInput={event => onCouponNumberInput(event.detail.value)}
          />
          {couponNumber ? (
            <AppPressable
              accessibilityLabel='清除优惠券'
              className='express-order-options__clear'
              onPress={() => onCouponNumberInput('')}
            >
              <Text className='express-order-options__clear-text'>清除</Text>
            </AppPressable>
          ) : null}
        </View>
      ) : null}

      <AppPressable
        accessibilityLabel={
          expandedField === 'remark' ? '收起备注输入' : '展开备注输入'
        }
        block
        className='express-order-options__entry'
        layout='row-start'
        onPress={() => toggleField('remark')}
      >
        <Text className='express-order-options__label'>备注</Text>
        <Text className='express-order-options__summary'>
          {remark ? '已填写' : '选填'}
        </Text>
        <AppIcon
          color={APP_STYLE_COLORS.text.supporting}
          name={expandedField === 'remark' ? 'chevronUp' : 'chevronDown'}
          size={APP_NATIVE_TOKENS.icon.small}
        />
      </AppPressable>
      {expandedField === 'remark' ? (
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
