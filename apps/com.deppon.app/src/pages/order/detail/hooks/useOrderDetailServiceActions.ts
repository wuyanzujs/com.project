import Taro from '@tarojs/taro'

import { useState } from 'react'

import { orderService } from '../../../../services/order'
import { navigateToAppRoute } from '../../../../shared/navigation/appNavigation'
import { createAppWebUrl } from '../../../../shared/webview/appWeb'

import type { OrderDetailDialHandler, UseOrderDetailActionsOptions } from './useOrderDetailActions'
import type {
  OrderDetailActionView,
  OrderUrgeButtonRaw
} from '../../../../services/order'

export interface UseOrderDetailServiceActionsOptions
  extends UseOrderDetailActionsOptions {
  handleDial: OrderDetailDialHandler
}

export function useOrderDetailServiceActions(
  options: UseOrderDetailServiceActionsOptions
) {
  const [notifyingDeliver, setNotifyingDeliver] = useState(false)
  const [invalidingWaybill, setInvalidingWaybill] = useState(false)
  const [urgeLoading, setUrgeLoading] = useState(false)
  const [urging, setUrging] = useState(false)

  const handleUrgeAction = async (action: OrderDetailActionView) => {
    if (!action.urge) {
      Taro.showToast({
        title: '暂未获取到催单信息',
        icon: 'none'
      })
      return
    }

    if (action.urge.buttonCode === 'VIEW_PROGRESS') {
      if (!action.webSource || !action.webUri) {
        Taro.showToast({
          title: '暂未获取到催单进度地址',
          icon: 'none'
        })
        return
      }

      navigateToAppRoute(
        createAppWebUrl({
          source: action.webSource,
          uri: action.webUri,
          title: action.title,
          auth: true
        }),
        {
          login: true
        }
      )
      return
    }

    if (urgeLoading) {
      return
    }

    setUrgeLoading(true)

    try {
      const response = await orderService.queryUrgePanel(action.urge)

      if (!response.status || !response.result) {
        Taro.showToast({
          title: response.message || '暂未获取到催单提示',
          icon: 'none'
        })
        return
      }

      options.setUrgePanel({
        ...response.result,
        action
      })
    } finally {
      setUrgeLoading(false)
    }
  }

  const handleCloseUrgePanel = () => {
    if (!urging) {
      options.setUrgePanel(null)
    }
  }

  const handleSubmitUrge = async (action: OrderDetailActionView) => {
    if (!action.urge || urging) {
      return
    }

    setUrging(true)

    try {
      const response = await orderService.submitUrge(action.urge)

      options.setUrgePanel(null)
      await Taro.showModal({
        title: '催单',
        content: response.result || response.message || '催单处理完成',
        showCancel: false,
        confirmText: '知道了'
      })

      if (options.detail) {
        const refreshedAction = await orderService.queryUrgeAction(
          options.detail,
          {
            publicTrackMode: options.publicTrackMode,
            role: options.detailRole
          }
        )

        options.setUrgeAction(refreshedAction)
      }
    } finally {
      setUrging(false)
    }
  }

  const handleSelectUrgeMenu = (menu: OrderUrgeButtonRaw) => {
    const action = options.urgePanel?.action

    if (!action) {
      options.setUrgePanel(null)
      return
    }

    const menuAction = orderService.resolveUrgeMenuAction(menu, action)

    if (menuAction.kind === 'close') {
      options.setUrgePanel(null)
      return
    }

    if (menuAction.kind === 'submit') {
      void handleSubmitUrge(action)
      return
    }

    if (menuAction.kind === 'dial') {
      options.setUrgePanel(null)
      void options.handleDial(menuAction.phoneNumber)
      return
    }

    if (menuAction.kind === 'progress') {
      options.setUrgePanel(null)
      navigateToAppRoute(
        createAppWebUrl({
          source: menuAction.webSource,
          uri: menuAction.webUri,
          title: menuAction.title,
          auth: true
        }),
        {
          login: true
        }
      )
      return
    }

    options.setUrgePanel(null)
    Taro.showToast({
      title: menuAction.message,
      icon: 'none'
    })
  }

  const handleNotifyDeliver = async () => {
    if (!options.detail || notifyingDeliver) {
      return
    }

    const confirm = await Taro.showModal({
      title: '通知派送',
      content: '您的快件到达营业部后，是否需要为您安排派送？',
      cancelText: '暂不处理',
      confirmText: '为我派送'
    })

    if (!confirm.confirm) {
      return
    }

    setNotifyingDeliver(true)

    try {
      const response = await orderService.notifyDeliver(options.detail)

      Taro.showToast({
        title: response.status
          ? '已通知派送'
          : response.message || '通知失败，请稍后再试',
        icon: 'none'
      })

      if (response.status) {
        void options.loadDetail()
      }
    } finally {
      setNotifyingDeliver(false)
    }
  }

  const handleInvalidWaybill = async () => {
    if (!options.detail || invalidingWaybill) {
      return
    }

    const confirm = await Taro.showModal({
      title: '拦截作废',
      content:
        '提交后我司核实无误会立即作废，已支付运费将按规则原路退回。如 24 小时未收到退款，请联系营业部或快递员处理。',
      cancelText: '取消',
      confirmText: '确认作废'
    })

    if (!confirm.confirm) {
      return
    }

    setInvalidingWaybill(true)

    try {
      const response = await orderService.invalidWaybill(options.detail)
      const result = response.result

      if (response.status) {
        Taro.showToast({
          title: result?.message || '拦截作废成功',
          icon: 'none'
        })
        void options.loadDetail()
        return
      }

      if (result?.shouldModifyIntercept && result.modifyWebUri) {
        const redirect = await Taro.showModal({
          title: '拦截作废',
          content: result.message,
          cancelText: '取消',
          confirmText: '去拦截'
        })

        if (redirect.confirm) {
          navigateToAppRoute(
            createAppWebUrl({
              source: 'ORDER_DETAIL_WAYBILL_MODIFY',
              uri: result.modifyWebUri,
              title: '修改运单',
              auth: true
            }),
            {
              login: true
            }
          )
        }
        return
      }

      await Taro.showModal({
        title: '拦截作废',
        content:
          result?.message || response.message || '拦截作废失败，请稍后再试',
        showCancel: false,
        confirmText: '知道了'
      })
    } finally {
      setInvalidingWaybill(false)
    }
  }

  const handleDepartmentPhone = async (action: OrderDetailActionView) => {
    if (!action.departmentPhone) {
      Taro.showToast({
        title: '暂未获取到营业部联系方式',
        icon: 'none'
      })
      return
    }

    const response = await orderService.resolveDepartmentPhone(
      action.departmentPhone
    )

    if (response.message && response.result === '95353') {
      Taro.showToast({
        title: response.message,
        icon: 'none'
      })
    }

    await options.handleDial(response.result || '95353')
  }

  const handlePickupSchedule = async () => {
    if (!options.detail || options.pickupSchedule.loading) {
      return
    }

    const response = await options.pickupSchedule.open(options.detail, {
      publicTrackMode: options.publicTrackMode,
      role: options.detailRole
    })

    if (response && (!response.status || !response.result)) {
      Taro.showToast({
        title: response.message || '暂未获取到可预约时间',
        icon: 'none'
      })
    }
  }

  const handleConfirmPickupSchedule = async () => {
    if (
      !options.pickupSchedule.selectedTime ||
      options.pickupSchedule.submitting
    ) {
      return
    }

    const response = await options.pickupSchedule.submit()

    if (!response) {
      return
    }

    if (!response.status) {
      Taro.showToast({
        title: response.message || '修改上门时间失败',
        icon: 'none'
      })
      return
    }

    Taro.showToast({
      title: '修改上门时间成功',
      icon: 'none'
    })
    await options.loadDetail()
  }

  return {
    notifyingDeliver,
    invalidingWaybill,
    urgeLoading,
    urging,
    handleUrgeAction,
    handleNotifyDeliver,
    handleInvalidWaybill,
    handleDepartmentPhone,
    handlePickupSchedule,
    handleCloseUrgePanel,
    handleSelectUrgeMenu,
    handleConfirmPickupSchedule
  }
}
