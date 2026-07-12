import { Text, View } from '@tarojs/components'

import {
  AppDialog,
  AppPressable
} from '../../../../shared/components'

import type {
  OrderDetailActionView,
  OrderDetailUrgePanelView,
  OrderUrgeButtonRaw
} from '../../../../services/order'

import './OrderUrgePanel.scss'

export interface OrderDetailUrgePanelState extends OrderDetailUrgePanelView {
  action: OrderDetailActionView
}

export function OrderUrgePanel(props: {
  panel: OrderDetailUrgePanelState | null
  urging: boolean
  onSelect: (menu: OrderUrgeButtonRaw) => void
  onClose: () => void
}) {
  if (!props.panel) {
    return null
  }

  return (
    <AppDialog
      backdropClassName='order-urge-mask'
      contentSpacing={false}
      description={props.panel.content}
      descriptionClassName='order-urge-card__content'
      panelClassName='order-urge-card'
      title='催单提醒'
      titleClassName='order-urge-card__title'
      visible
      onClose={props.onClose}
    >
      <View className='order-urge-card__actions'>
        {props.panel.menus.map(menu => {
          const primary = menu.buttonCode === 'FOLLOW_UP'
          const label =
            props.urging && primary ? '提交中' : menu.buttonName

          return (
            <AppPressable
              accessibilityLabel={label}
              block
              className={
                primary
                  ? 'order-urge-card__button order-urge-card__button--primary'
                  : 'order-urge-card__button'
              }
              key={`${menu.buttonCode}-${menu.buttonName}`}
              onPress={() => props.onSelect(menu)}
            >
              <Text
                className={
                  primary
                    ? 'order-urge-card__button-text order-urge-card__button-text--primary'
                    : 'order-urge-card__button-text'
                }
              >
                {label}
              </Text>
            </AppPressable>
          )
        })}
      </View>
      <AppPressable
        accessibilityLabel='取消催单'
        block
        className='order-urge-card__cancel'
        onPress={props.onClose}
      >
        <Text className='order-urge-card__cancel-text'>取消</Text>
      </AppPressable>
    </AppDialog>
  )
}
