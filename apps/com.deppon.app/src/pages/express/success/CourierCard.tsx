import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useEffect, useState } from 'react'

import { queryExpressSuccessCourier } from '@/services/express/success/success.service'
import type { ExpressSuccessCourierResult } from '@/services/express/success/success.types'
import { AppPressable } from '@/shared/components'
import { getNativeCapabilityErrorMessage } from '@/shared/platform/capabilities'
import { dialPhone, PhoneNumberError } from '@/shared/platform/phone'

import './content.scss'

type CourierState = ExpressSuccessCourierResult | { status: 'loading' }

export function CourierCard({ orderNumber }: { orderNumber: string }) {
  const [state, setState] = useState<CourierState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    queryExpressSuccessCourier(orderNumber).then(result => {
      if (active) setState(result)
    })
    return () => {
      active = false
    }
  }, [orderNumber, attempt])

  const handleDial = async () => {
    if (state.status !== 'assigned') return

    try {
      await dialPhone(state.courier.phone)
    } catch (error) {
      Taro.showToast({
        title: error instanceof PhoneNumberError ? error.message : getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  return (
    <View className='express-success-section'>
      <Text className='express-success-section__title'>取件快递员</Text>
      {state.status === 'assigned' ? (
        <>
          <View className='express-success-row'>
            <Text className='express-success-row__label'>快递员</Text>
            <Text className='express-success-row__value'>{state.courier.name}</Text>
          </View>
          <View className='express-success-row'>
            <Text className='express-success-row__label'>联系电话</Text>
            <Text className='express-success-row__value'>{state.courier.phone}</Text>
          </View>
          <AppPressable className='express-success-link' onPress={handleDial}>
            <Text className='express-success-link__text'>联系快递员</Text>
          </AppPressable>
        </>
      ) : (
        <Text className='express-success-hero__summary'>
          {state.status === 'loading'
            ? '正在查询快递员信息…'
            : state.status === 'pending'
              ? '待分配快递员，可稍后刷新查看'
              : '暂时无法获取快递员信息，可重试查询'}
        </Text>
      )}
      {state.status !== 'assigned' && (
        <AppPressable className='express-success-link' disabled={state.status === 'loading'} onPress={() => setAttempt(value => value + 1)}>
          <Text className='express-success-link__text'>{state.status === 'loading' ? '查询中…' : '刷新快递员信息'}</Text>
        </AppPressable>
      )}
    </View>
  )
}
