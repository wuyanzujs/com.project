import { Text, View } from '@tarojs/components'

import { expressReturnBillOptions } from '../../../services/express'

import type {
  ExpressDeliveryMode,
  ExpressDraft,
  ExpressMonthlyPayView,
  ExpressPaymentType,
  ExpressReturnBillOption
} from '../../../services/express'

const PAYMENT_OPTIONS: Array<{ label: string; value: ExpressPaymentType }> = [
  {
    label: '寄付现结',
    value: 'MP'
  },
  {
    label: '到付',
    value: 'PAY_ARIIVE'
  },
  {
    label: '月结',
    value: 'MONTH_PAY'
  }
]

const DELIVERY_OPTIONS: Array<{ label: string; value: ExpressDeliveryMode }> = [
  {
    label: '送货上门',
    value: 'PICKNOTUPSTAIRS'
  },
  {
    label: '自提',
    value: 'PICKSELF'
  },
  {
    label: '送货上楼',
    value: 'PICKUPSTAIRS'
  }
]

interface ExpressServiceSectionProps {
  monthlyPayView: ExpressMonthlyPayView | null
  selectedReturnBillOption: ExpressReturnBillOption
  service: ExpressDraft['service']
  onMonthlyPayAction: (view: ExpressMonthlyPayView) => void
  onPaymentTypeSelect: (paymentType: ExpressPaymentType) => void
  onPrivacyProtectionChange: (
    value: ExpressDraft['service']['privacyProtection']
  ) => void
  onServiceChange: (patch: Partial<ExpressDraft['service']>) => void
}

export function ExpressServiceSection({
  monthlyPayView,
  selectedReturnBillOption,
  service,
  onMonthlyPayAction,
  onPaymentTypeSelect,
  onPrivacyProtectionChange,
  onServiceChange
}: ExpressServiceSectionProps) {
  return (
    <View className='express-section'>
      <View className='express-section__head'>
        <Text className='express-section__title'>服务方式</Text>
      </View>

      <Text className='express-option-title'>付款方式</Text>
      <View className='express-chip-group'>
        {PAYMENT_OPTIONS.map(option => (
          <View
            className={
              option.value === service.paymentType
                ? 'express-chip express-chip--active'
                : 'express-chip'
            }
            key={option.value}
            onClick={() => onPaymentTypeSelect(option.value)}
          >
            <Text
              className={
                option.value === service.paymentType
                  ? 'express-chip__text express-chip__text--active'
                  : 'express-chip__text'
              }
            >
              {option.label}
            </Text>
          </View>
        ))}
      </View>

      {monthlyPayView && (
        <View
          className={`express-monthly-card express-monthly-card--${monthlyPayView.tone}`}
        >
          <View className='express-monthly-card__content'>
            <Text className='express-monthly-card__title'>
              {monthlyPayView.title}
            </Text>
            <Text className='express-monthly-card__summary'>
              {monthlyPayView.summary}
            </Text>
          </View>
          <View
            className='express-monthly-card__action'
            onClick={() => onMonthlyPayAction(monthlyPayView)}
          >
            <Text className='express-monthly-card__action-text'>
              {monthlyPayView.actionText}
            </Text>
          </View>
        </View>
      )}

      <Text className='express-option-title'>送货方式</Text>
      <View className='express-chip-group'>
        {DELIVERY_OPTIONS.map(option => (
          <View
            className={
              option.value === service.deliveryMode
                ? 'express-chip express-chip--active'
                : 'express-chip'
            }
            key={option.value}
            onClick={() => onServiceChange({ deliveryMode: option.value })}
          >
            <Text
              className={
                option.value === service.deliveryMode
                  ? 'express-chip__text express-chip__text--active'
                  : 'express-chip__text'
              }
            >
              {option.label}
            </Text>
          </View>
        ))}
      </View>

      <View className='express-service-row'>
        <Text className='express-option-title'>取件前电话联系</Text>
        <View className='express-toggle-group'>
          {(['Y', 'N'] as const).map(value => (
            <View
              className={
                value === service.needContact
                  ? 'express-toggle express-toggle--active'
                  : 'express-toggle'
              }
              key={value}
              onClick={() => onServiceChange({ needContact: value })}
            >
              <Text
                className={
                  value === service.needContact
                    ? 'express-toggle__text express-toggle__text--active'
                    : 'express-toggle__text'
                }
              >
                {value === 'Y' ? '联系' : '不联系'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className='express-service-row express-service-row--stack'>
        <View className='express-service-row__content'>
          <Text className='express-option-title'>隐私面单</Text>
          <Text className='express-service-row__summary'>
            隐藏收寄件敏感号码，保护寄递隐私
          </Text>
        </View>
        <View className='express-toggle-group'>
          {(['Y', 'N'] as const).map(value => (
            <View
              className={
                value === service.privacyProtection
                  ? 'express-toggle express-toggle--active'
                  : 'express-toggle'
              }
              key={value}
              onClick={() => onPrivacyProtectionChange(value)}
            >
              <Text
                className={
                  value === service.privacyProtection
                    ? 'express-toggle__text express-toggle__text--active'
                    : 'express-toggle__text'
                }
              >
                {value === 'Y' ? '开启' : '关闭'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className='express-service-row express-service-row--stack express-service-row--divided'>
        <View className='express-service-row__content'>
          <Text className='express-option-title'>签收密码</Text>
          <Text className='express-service-row__summary'>
            收方签收时按后端规则校验签收密码
          </Text>
        </View>
        <View className='express-toggle-group'>
          {(['Y', 'N'] as const).map(value => (
            <View
              className={
                value === service.passwordSigning
                  ? 'express-toggle express-toggle--active'
                  : 'express-toggle'
              }
              key={value}
              onClick={() => onServiceChange({ passwordSigning: value })}
            >
              <Text
                className={
                  value === service.passwordSigning
                    ? 'express-toggle__text express-toggle__text--active'
                    : 'express-toggle__text'
                }
              >
                {value === 'Y' ? '开启' : '关闭'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className='express-value-added'>
        <Text className='express-option-title'>签收单返单</Text>
        <View className='express-chip-group'>
          {expressReturnBillOptions.map(option => (
            <View
              className={
                option.value === service.returnBillType
                  ? 'express-chip express-chip--active'
                  : 'express-chip'
              }
              key={option.value}
              onClick={() => onServiceChange({ returnBillType: option.value })}
            >
              <Text
                className={
                  option.value === service.returnBillType
                    ? 'express-chip__text express-chip__text--active'
                    : 'express-chip__text'
                }
              >
                {option.label}
              </Text>
            </View>
          ))}
        </View>
        <Text className='express-value-added__summary'>
          {selectedReturnBillOption.summary}
        </Text>
      </View>

      <View className='express-service-note'>
        <Text className='express-service-note__text'>
          代收货款需先完成收款账户、协议和额度校验，可在客户中心处理相关设置。
        </Text>
      </View>
    </View>
  )
}
