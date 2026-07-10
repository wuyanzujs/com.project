import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { useMemo } from 'react'

import { printService } from '../../services/print'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'

import type { PrintCenterActionView } from '../../services/print'

import './index.scss'

function getActionClassName(action: PrintCenterActionView) {
  return `print-action print-action--${action.status}`
}

function getActionStatusClassName(action: PrintCenterActionView) {
  return `print-action__status print-action__status--${action.status}`
}

function getRouteParam(value: unknown) {
  const rawValue = Array.isArray(value) ? value[0] : value

  if (typeof rawValue !== 'string') {
    return ''
  }

  try {
    return decodeURIComponent(rawValue).trim()
  } catch {
    return rawValue.trim()
  }
}

const PrintCenterPage = () => {
  const router = useRouter()
  const printId = getRouteParam(router.params.printId)
  const source = getRouteParam(router.params.source)
  const center = useMemo(
    () =>
      printService.getCenterView({
        printId,
        source
      }),
    [printId, source]
  )

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const handleAction = (action: PrintCenterActionView) => {
    if (action.route) {
      navigateToAppRoute(action.route, {
        login: true
      })
      return
    }

    showToast(action.disabledReason || '该能力后续接入')
  }

  return (
    <ScrollView className='print-page' scrollY>
      <View className='print-header'>
        <Text className='print-header__label'>Print</Text>
        <Text className='print-header__title'>{center.title}</Text>
        <Text className='print-header__summary'>{center.summary}</Text>
      </View>

      <View className='print-status'>
        <View>
          <Text className='print-status__label'>原生打印能力</Text>
          <Text className='print-status__value'>
            {center.nativeReady ? '已接入' : '待接入'}
          </Text>
        </View>
        <Text
          className={
            center.nativeReady
              ? 'print-status__badge print-status__badge--ready'
              : 'print-status__badge'
          }
        >
          {center.nativeReady ? 'Ready' : 'Pending'}
        </Text>
      </View>

      {!!center.cloudCode && (
        <View className='print-cloud-code'>
          <View className='print-cloud-code__head'>
            <Text className='print-cloud-code__title'>
              {center.cloudCode.title}
            </Text>
            <Text className='print-cloud-code__status'>
              {center.cloudCode.statusText}
            </Text>
          </View>
          <Text className='print-cloud-code__value'>
            {center.cloudCode.printId}
          </Text>
          <Text className='print-cloud-code__summary'>
            {center.cloudCode.summary}
          </Text>
        </View>
      )}

      <View className='print-section'>
        <View className='print-section__head'>
          <Text className='print-section__title'>打印入口</Text>
          <Text className='print-section__hint'>RN App 首期</Text>
        </View>
        {center.actions.map((action) => (
          <View
            className={getActionClassName(action)}
            key={action.key}
            onClick={() => handleAction(action)}
          >
            <View className='print-action__main'>
              <Text className='print-action__title'>{action.title}</Text>
              <Text className='print-action__summary'>{action.summary}</Text>
            </View>
            <Text className={getActionStatusClassName(action)}>
              {action.statusText}
            </Text>
          </View>
        ))}
      </View>

      <View className='print-section'>
        <Text className='print-section__title'>打印规则</Text>
        {center.rules.map((rule, index) => (
          <View className='print-rule' key={rule}>
            <Text className='print-rule__index'>{index + 1}</Text>
            <Text className='print-rule__text'>{rule}</Text>
          </View>
        ))}
      </View>

      <View className='print-notice'>
        <Text className='print-notice__title'>迁移边界</Text>
        <Text className='print-notice__content'>
          不迁入旧小程序蓝牙 API、GBK 指令拼接和设备缓存实现。后续应先新增
          shared/platform/print facade，再接打印列表、模板和状态回写。
        </Text>
      </View>
    </ScrollView>
  )
}

export default PrintCenterPage
