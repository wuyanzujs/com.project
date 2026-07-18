import { ScrollView } from '@tarojs/components'

import type { ComponentProps, ComponentType } from 'react'

import type { ScrollViewProps as NativeScrollViewProps } from 'react-native'

type TaroScrollViewProps = ComponentProps<typeof ScrollView>
type KeyboardAwareScrollViewProps = TaroScrollViewProps &
  Pick<NativeScrollViewProps, 'keyboardShouldPersistTaps'>

const KeyboardAwareScrollView = ScrollView as ComponentType<
  KeyboardAwareScrollViewProps
>

export function AppFormScrollView(props: TaroScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      {...props}
      keyboardShouldPersistTaps='handled'
    />
  )
}
