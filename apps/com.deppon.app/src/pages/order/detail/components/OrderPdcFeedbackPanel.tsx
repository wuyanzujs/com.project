import { Text, View } from '@tarojs/components'

import { AppDialog, AppPressable } from '../../../../shared/components'

import type { OrderPdcFeedbackResult } from '../../../../services/order'

import './OrderPdcFeedbackPanel.scss'

export function OrderPdcFeedbackPanel(props: {
  visible: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (result: OrderPdcFeedbackResult) => void
}) {
  if (!props.visible) {
    return null
  }

  const submit = (result: OrderPdcFeedbackResult) => {
    if (!props.submitting) {
      props.onSubmit(result)
    }
  }

  return (
    <AppDialog
      closeOnBackdropPress={!props.submitting}
      contentSpacing={false}
      description='你的快递已签收，是否已收到货物或知晓货物位置？'
      descriptionClassName='order-pdc-feedback__description'
      panelClassName='order-pdc-feedback'
      placement='bottom'
      title='签收确认'
      titleClassName='order-pdc-feedback__title'
      visible
      onClose={props.onClose}
    >
      <View className='order-pdc-feedback__options'>
        <AppPressable
          accessibilityLabel='已收到货物'
          className='order-pdc-feedback__option order-pdc-feedback__option--yes'
          disabled={props.submitting}
          flex
          onPress={() => submit('Y')}
        >
          <Text className='order-pdc-feedback__option-title'>是</Text>
          <Text className='order-pdc-feedback__option-summary'>已收到货物</Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel='未收到货物'
          className='order-pdc-feedback__option order-pdc-feedback__option--no'
          disabled={props.submitting}
          flex
          onPress={() => submit('N')}
        >
          <Text className='order-pdc-feedback__option-title'>否</Text>
          <Text className='order-pdc-feedback__option-summary'>暂未收到货物</Text>
        </AppPressable>
      </View>
      <AppPressable
        accessibilityLabel='稍后反馈'
        block
        className='order-pdc-feedback__later'
        disabled={props.submitting}
        onPress={props.onClose}
      >
        <Text className='order-pdc-feedback__later-text'>
          {props.submitting ? '提交中' : '稍后再说'}
        </Text>
      </AppPressable>
    </AppDialog>
  )
}
