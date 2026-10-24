import { Image, View } from '@tarojs/components'

import { designPxToDp } from '@/shared/native'
import { APP_NATIVE_TOKENS } from '@/styles/nativeTokens'

import { AppPressable } from '../AppPressable'

import './index.scss'

const RADIO_CHECK_IMAGE = 'https://ca.deppon.com.cn/ows/assets/components/radio_active.png'

interface AppRadioProps {
  accessibilityLabel?: string
  checked: boolean
  className?: string
  disabled?: boolean
  /** 圆的边长（设计 px），默认 32。 */
  size?: number
  onChange?: (checked: boolean) => void
}

export function AppRadio({ accessibilityLabel, checked, className, disabled = false, size = 32, onChange }: AppRadioProps) {
  const edge = designPxToDp(size)
  const hitSlop = Math.max(0, (APP_NATIVE_TOKENS.touch.minimum - edge) / 2)
  const stateClass = disabled ? 'app-radio--disabled' : checked ? 'app-radio--checked' : undefined
  const radio = (
    <View className={['app-radio', stateClass, !onChange ? className : undefined].filter(Boolean).join(' ')} style={{ width: edge, height: edge }}>
      {checked && !disabled && <Image className='app-radio__check' mode='aspectFit' src={RADIO_CHECK_IMAGE} />}
    </View>
  )

  if (!onChange) {
    return radio
  }

  return (
    <AppPressable
      accessibilityLabel={accessibilityLabel}
      className={className}
      compact
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={() => {
        if (!disabled) onChange(!checked)
      }}
    >
      {radio}
    </AppPressable>
  )
}
