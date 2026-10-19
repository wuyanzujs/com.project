import { Text, View } from '@tarojs/components'

import { useState } from 'react'

import type { ExpressPaymentType } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ExpressSheet } from '../ExpressSheet'

import './index.scss'

interface ExpressPaymentSheetProps {
  visible: boolean
  value: ExpressPaymentType
  onClose: () => void
  onSelect: (paymentType: ExpressPaymentType) => void
}

interface ExpressPaymentSheetOption {
  label: string
  value: ExpressPaymentType
  description: string
  tag?: string
}

// 储值卡选项依赖储值账户能力，当前尚未接入。
const PAYMENT_OPTIONS: ExpressPaymentSheetOption[] = [
  {
    label: '寄付现结',
    value: 'MP',
    description: '快递员取件时，寄方可通过在线支付、扫码付款'
  },
  {
    label: '到付',
    value: 'PAY_ARIIVE',
    description: '快递签收时，收方可通过在线支付、扫码付款',
    tag: '与现付金额一致'
  },
  {
    label: '月结',
    value: 'MONTH_PAY',
    description: '按月结算运费，对公电汇至合同约定的官方账户'
  }
]

export function ExpressPaymentSheet({ onClose, onSelect, value, visible }: ExpressPaymentSheetProps) {
  const [draftValue, setDraftValue] = useState<ExpressPaymentType>(value)
  const [prevVisible, setPrevVisible] = useState(false)

  // 打开瞬间以当前生效值作为弹窗内暂存选中，确定时才提交。
  if (visible !== prevVisible) {
    setPrevVisible(visible)

    if (visible) {
      setDraftValue(value)
    }
  }

  const handleConfirm = () => {
    onSelect(draftValue)
    onClose()
  }

  return (
    <ExpressSheet
      bodyScroll={false}
      panelBackgroundColor={APP_STYLE_COLORS.surface.sheetPayment}
      subtitle='请避免私下转账，以保障您的资金安全'
      title='付款方式'
      titleSize={36}
      visible={visible}
      footer={
        <AppPressable accessibilityLabel='确定付款方式' block className='express-payment-sheet__confirm' onPress={handleConfirm}>
          <Text className='express-payment-sheet__confirm-text'>确定</Text>
        </AppPressable>
      }
      onClose={onClose}
    >
      <View className='express-payment-sheet__options'>
        {PAYMENT_OPTIONS.map((option, index) => {
          const selected = option.value === draftValue

          return (
            <AppPressable
              accessibilityLabel={`选择${option.label}`}
              block
              className={[
                selected ? 'express-payment-sheet__option express-payment-sheet__option--selected' : 'express-payment-sheet__option',
                index > 0 ? 'express-payment-sheet__option--stacked' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              key={option.value}
              onPress={() => setDraftValue(option.value)}
            >
              <View className='express-payment-sheet__option-main'>
                <View className='express-payment-sheet__option-head'>
                  <Text className='express-payment-sheet__option-label'>{option.label}</Text>
                  {option.tag ? (
                    <View className='express-payment-sheet__option-tag'>
                      <Text className='express-payment-sheet__option-tag-text'>{option.tag}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  className={
                    selected
                      ? 'express-payment-sheet__option-description express-payment-sheet__option-description--selected'
                      : 'express-payment-sheet__option-description'
                  }
                >
                  {option.description}
                </Text>
              </View>

              <View className={selected ? 'express-payment-sheet__radio express-payment-sheet__radio--active' : 'express-payment-sheet__radio'}>
                {selected ? <AppIcon color={APP_STYLE_COLORS.text.inverse} name='check' size={26} /> : null}
              </View>
            </AppPressable>
          )
        })}
      </View>
    </ExpressSheet>
  )
}
