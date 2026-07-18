import Taro, { useDidShow } from '@tarojs/taro'

import { type Dispatch, type SetStateAction, useCallback } from 'react'

import {
  updateExpressDeliveryPoint
} from '../../../services/express'
import { stationSelection } from '../../../services/query'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type { ExpressDraft } from '../../../services/express'

interface UseExpressDeliveryPointOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
}

export function useExpressDeliveryPoint({
  draft,
  setDraft
}: UseExpressDeliveryPointOptions) {
  useDidShow(() => {
    const selection = stationSelection.consumeSelection(
      'EXPRESS_DELIVERY_POINT'
    )

    if (!selection) {
      return
    }

    setDraft(current => updateExpressDeliveryPoint(current, selection.station))
    Taro.showToast({
      title: selection.station
        ? '已选择收件自提服务点'
        : '将由系统匹配最近服务点',
      icon: 'none'
    })
  })

  const handleOpen = useCallback(() => {
    if (!draft.consignee) {
      Taro.showToast({
        title: '请先填写完整收件地址',
        icon: 'none'
      })
      return
    }

    const params = stationSelection.createParams(
      'EXPRESS_DELIVERY_POINT',
      draft.consignee,
      draft.deliveryPoint.code
    )

    navigateToAppRoute(createAppRouteUrl(APP_ROUTES.stationQuery, params))
  }, [draft.consignee, draft.deliveryPoint.code])

  return {
    onOpen: handleOpen
  }
}

export type ExpressDeliveryPointController = ReturnType<
  typeof useExpressDeliveryPoint
>
