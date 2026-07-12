import { Text, View } from '@tarojs/components'

import { OrderDetailSection } from './OrderDetailSection'

import type { WaybillTrackItem } from '../../../../services/order'

import './OrderTrackSection.scss'

interface OrderTrackSectionProps {
  emptyText?: string
  hintText: string
  tracks: WaybillTrackItem[]
}

export function OrderTrackSection({
  emptyText,
  hintText,
  tracks
}: OrderTrackSectionProps) {
  return (
    <OrderDetailSection hint={hintText} title='物流轨迹'>
      {tracks.length ? (
        tracks.map(track => (
          <View
            className='order-track'
            key={`${track.operateTime}-${track.trackIndex}`}
          >
            <View
              className={
                track.trackFirst
                  ? 'order-track__dot order-track__dot--active'
                  : 'order-track__dot'
              }
            />
            <View className='order-track__content'>
              <Text className='order-track__text'>
                {track.contentNoLinkLabel || track.contentOrig || track.content}
              </Text>
              <Text className='order-track__time'>
                {track.date} {track.time}
              </Text>
            </View>
          </View>
        ))
      ) : emptyText ? (
        <Text className='order-track__empty'>{emptyText}</Text>
      ) : null}
    </OrderDetailSection>
  )
}
