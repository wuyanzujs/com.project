import { View } from '@tarojs/components'

import { AppPressable } from '../AppPressable'

import './index.scss'

interface AppSwitchProps {
  accessibilityLabel?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

// React Native 的 Switch 尺寸和配色不可控，生产端是自绘开关，这里用 View 复刻。
export function AppSwitch({
  accessibilityLabel,
  checked,
  disabled = false,
  onChange
}: AppSwitchProps) {
  return (
    <AppPressable
      accessibilityLabel={accessibilityLabel}
      className='app-switch'
      disabled={disabled}
      layout='row-center'
      onPress={() => onChange(!checked)}
    >
      <View
        className={
          checked
            ? 'app-switch__track app-switch__track--on'
            : 'app-switch__track'
        }
      >
        <View className='app-switch__thumb' />
      </View>
    </AppPressable>
  )
}
