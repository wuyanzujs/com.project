import { Input, Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

interface GoodsStepperProps {
  unit: string
  value: string
  max: number
  min: number
  step: number
  onChange: (next: string) => void
}

function parseAmount(value: string) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

// 货物信息页的重量、件数共用同一套「− 输入框 单位 ＋」控件。
export function GoodsStepper({ max, min, onChange, step, unit, value }: GoodsStepperProps) {
  const amount = parseAmount(value)
  const disabledMinus = amount <= min
  const disabledPlus = amount >= max

  const stepTo = (direction: 1 | -1) => {
    const base = Number.isFinite(amount) && amount > 0 ? amount : min

    onChange(String(clamp(base + direction * step, min, max)))
  }

  return (
    <View className='express-goods-stepper'>
      <AppPressable
        compact
        accessibilityLabel='减少'
        className={disabledMinus ? 'express-goods-stepper__button express-goods-stepper__button--disabled' : 'express-goods-stepper__button'}
        disabled={disabledMinus}
        hitSlop={8}
        onPress={() => stepTo(-1)}
      >
        <AppIcon color={APP_STYLE_COLORS.text.ink} name='minus' size={33} strokeWidth={1.5} />
      </AppPressable>
      <View className='express-goods-stepper__field'>
        <Input
          className='express-goods-stepper__input'
          type='digit'
          value={value}
          onBlur={event => {
            const next = parseAmount(event.detail.value)

            onChange(String(clamp(next || min, min, max)))
          }}
          onInput={event => onChange(event.detail.value)}
        />
        <Text className='express-goods-stepper__unit'>{unit}</Text>
      </View>
      <AppPressable
        compact
        accessibilityLabel='增加'
        className={disabledPlus ? 'express-goods-stepper__button express-goods-stepper__button--disabled' : 'express-goods-stepper__button'}
        disabled={disabledPlus}
        hitSlop={8}
        onPress={() => stepTo(1)}
      >
        <AppIcon color={APP_STYLE_COLORS.text.ink} name='plus' size={33} strokeWidth={1.5} />
      </AppPressable>
    </View>
  )
}
