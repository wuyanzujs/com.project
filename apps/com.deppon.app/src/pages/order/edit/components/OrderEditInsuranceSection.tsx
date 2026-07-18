import { Input, Text, View } from '@tarojs/components'

import { useEffect, useState } from 'react'

import {
  getOrderEditInsuranceSummary,
  normalizeOrderEditInsuranceAmountInput
} from '../../../../services/order'
import { AppPressable } from '../../../../shared/components'
import { APP_NATIVE_TOKENS } from '../../../../styles/nativeTokens'

import type { OrderEditInsuranceDraft } from '../../../../services/order'

import './OrderEditInsuranceSection.scss'
import './OrderEditSection.scss'

interface OrderEditInsuranceSectionProps {
  insurance: OrderEditInsuranceDraft
  onAmountChange: (value: string) => void
  onOpenRules: () => void
}

export function OrderEditInsuranceSection({
  insurance,
  onAmountChange,
  onOpenRules
}: OrderEditInsuranceSectionProps) {
  const [amountText, setAmountText] = useState(
    insurance.amount > 0 ? String(insurance.amount) : ''
  )
  const canClear =
    insurance.editable &&
    !insurance.required &&
    !insurance.freeCoverage &&
    insurance.amount > 0

  useEffect(() => {
    setAmountText(
      insurance.amount > 0 ? String(insurance.amount) : ''
    )
  }, [insurance.amount])

  const handleAmountInput = (value: string) => {
    const normalized = normalizeOrderEditInsuranceAmountInput(value)

    setAmountText(normalized)
    onAmountChange(normalized)
  }

  return (
    <View className='order-edit-section'>
      <View className='order-edit-insurance__header'>
        <View className='order-edit-insurance__header-content'>
          <Text className='order-edit-section__title'>保价服务</Text>
          <Text className='order-edit-insurance__summary'>
            {getOrderEditInsuranceSummary(insurance)}
          </Text>
        </View>
        <AppPressable
          accessibilityLabel='查看保价规则'
          className='order-edit-insurance__rules'
          onPress={onOpenRules}
        >
          <Text className='order-edit-insurance__rules-text'>规则</Text>
        </AppPressable>
      </View>

      <View className='order-edit-insurance__amount-row'>
        <View className='order-edit-insurance__amount-labels'>
          <Text className='order-edit-insurance__label'>保价声明金额</Text>
          <Text className='order-edit-insurance__limit'>
            最高 {insurance.maxAmount} 元
          </Text>
        </View>
        <View className='order-edit-insurance__amount'>
          <Text className='order-edit-insurance__currency'>¥</Text>
          <Input
            className='order-edit-insurance__input'
            disabled={!insurance.editable}
            maxlength={10}
            placeholder='0'
            style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
            type='digit'
            value={amountText}
            onInput={event => handleAmountInput(event.detail.value)}
          />
        </View>
      </View>

      <View className='order-edit-insurance__footer'>
        <Text className='order-edit-insurance__notice'>
          修改后由后端重新核算保价费，实际承保范围以正式协议为准。
        </Text>
        {canClear ? (
          <AppPressable
            accessibilityLabel='清除改单保价金额'
            className='order-edit-insurance__clear'
            onPress={() => handleAmountInput('')}
          >
            <Text className='order-edit-insurance__clear-text'>清除</Text>
          </AppPressable>
        ) : null}
      </View>
    </View>
  )
}
