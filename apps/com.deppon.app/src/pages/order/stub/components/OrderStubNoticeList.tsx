import { Text, View } from '@tarojs/components'

import type { OrderStubView } from '../../../../services/order'

import './OrderStubNoticeList.scss'

export function OrderStubNoticeList(props: {
  notices: OrderStubView['notices']
}) {
  return (
    <>
      {props.notices.map(notice => (
        <View
          className={
            notice.tone === 'warning'
              ? 'order-stub-notice order-stub-notice--warning'
              : 'order-stub-notice'
          }
          key={notice.title}
        >
          <Text className='order-stub-notice__title'>{notice.title}</Text>
          <Text className='order-stub-notice__content'>{notice.content}</Text>
        </View>
      ))}
    </>
  )
}
