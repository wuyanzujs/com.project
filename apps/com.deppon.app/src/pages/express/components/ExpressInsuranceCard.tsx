import { Input, Text, View } from '@tarojs/components'

import { useMemo, useState } from 'react'

import { ExpressSection } from './ExpressSection'
import { createExpressInsuranceView } from '../../../services/express'
import { AppPressable } from '../../../shared/components'
import { APP_NATIVE_TOKENS } from '../../../styles/nativeTokens'

import type { ExpressDraft } from '../../../services/express'
import type { ExpressInsuranceController } from '../hooks/useExpressInsurance'

import './ExpressInsuranceCard.scss'

interface ExpressInsuranceCardProps {
  controller: ExpressInsuranceController
  draft: ExpressDraft
}

function getMoneyText(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function getOptionClassName(
  selected: boolean,
  disabled: boolean,
  spaced: boolean
) {
  return [
    'express-insurance-option',
    selected && 'express-insurance-option--selected',
    disabled && 'express-insurance-option--disabled',
    spaced && 'express-insurance-option--spaced'
  ]
    .filter(Boolean)
    .join(' ')
}

export function ExpressInsuranceCard({
  controller,
  draft
}: ExpressInsuranceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const view = useMemo(() => createExpressInsuranceView(draft), [draft])
  const selectedOption = view.options.find(option => option.type === view.type)
  const summary = view.disabled
    ? '当前货物不支持保价'
    : view.effectiveAmount > 0
      ? `${selectedOption?.label || '保价'} · ${view.effectiveAmount}元`
      : '未填写保价金额'

  return (
    <ExpressSection
      expanded={expanded}
      hint={view.required ? '必填' : '选填'}
      summary={summary}
      title='保价服务'
      onHeaderPress={() => setExpanded(current => !current)}
    >
      {expanded ? (
        <View className='express-insurance'>
          <Text className='express-insurance__summary'>{view.summary}</Text>

          <View className='express-insurance-options'>
            {view.options.map((option, index) => (
              <AppPressable
                accessibilityLabel={`选择${option.label}`}
                block
                className={getOptionClassName(
                  option.type === view.type,
                  option.disabled,
                  index > 0
                )}
                disabled={option.disabled}
                key={option.type}
                selected={option.type === view.type}
                onPress={() => controller.onTypeChange(option.type)}
              >
                <View className='express-insurance-option__title-row'>
                  <Text className='express-insurance-option__title'>
                    {option.label}
                  </Text>
                  {option.recommended && !option.disabled ? (
                    <Text className='express-insurance-option__badge'>推荐</Text>
                  ) : null}
                </View>
                <Text className='express-insurance-option__summary'>
                  {option.summary}
                </Text>
              </AppPressable>
            ))}
          </View>

          <View className='express-insurance__field-head'>
            <Text className='express-insurance__label'>保价金额</Text>
            <Text className='express-insurance__limit'>
              最高 {view.limit} 元
            </Text>
          </View>
          <View className='express-insurance-amount'>
            <Text className='express-insurance-amount__currency'>¥</Text>
            <Input
              className='express-insurance-amount__input'
              disabled={view.disabled}
              maxlength={8}
              placeholder={view.free ? '赠送基础保障' : '请输入整数金额'}
              style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
              type='number'
              value={String(view.amount || '')}
              onInput={event =>
                controller.onAmountChange(event.detail.value)
              }
            />
          </View>

          {view.effectiveAmount !== view.amount ? (
            <Text className='express-insurance__hint'>
              下单保障金额 {view.effectiveAmount} 元
            </Text>
          ) : null}

          <View className='express-insurance__actions'>
            <AppPressable
              accessibilityLabel='查看当前保价规则'
              className='express-insurance__action'
              onPress={() => controller.onOpenRules(view.type)}
            >
              <Text className='express-insurance__action-text'>规则</Text>
            </AppPressable>
            <AppPressable
              accessibilityLabel='试算保价费用'
              className='express-insurance__action express-insurance__action--primary'
              disabled={view.disabled || controller.loading}
              onPress={controller.onQuery}
            >
              <Text className='express-insurance__action-text express-insurance__action-text--primary'>
                {controller.loading ? '试算中' : '试算费用'}
              </Text>
            </AppPressable>
          </View>

          {controller.quote ? (
            <Text className='express-insurance__result'>
              {controller.quote.name || '保价费'}约 ¥
              {getMoneyText(controller.quote.price)}
            </Text>
          ) : null}
          {controller.message ? (
            <Text className='express-insurance__message'>
              {controller.message}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ExpressSection>
  )
}
