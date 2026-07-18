import Taro from '@tarojs/taro'

import {
  createExpressWarehouseInputKey,
  rejectExpressWarehouse,
  updateExpressWarehouse
} from '../../../services/express'
import { appWebMessageBridge } from '../../../shared/webview/appWebMessage'

import type {
  ExpressDraft,
  ExpressWarehouseScreening
} from '../../../services/express'

export type ExpressWarehouseScreeningDecision =
  | 'PROCEED'
  | 'ACKNOWLEDGE'
  | 'ENABLE'
  | 'REJECT'
  | 'CANCEL'

export function consumeExpressWarehouseResult(draft: ExpressDraft) {
  const result = appWebMessageBridge.consumeWarehouse()

  if (!result) {
    appWebMessageBridge.cancelWarehouse()
    return null
  }

  if (result.context.inputKey !== createExpressWarehouseInputKey(draft)) {
    return {
      draft,
      message: '寄件信息已变化，已忽略旧的进仓预约结果'
    }
  }

  return {
    draft: result.warehouse.enabled
      ? updateExpressWarehouse(draft, result.warehouse)
      : rejectExpressWarehouse(draft),
    message: result.warehouse.enabled
      ? '已回填送货进仓预约信息，请重新获取价格'
      : '已取消送货进仓服务'
  }
}

export function expectExpressWarehouseResult(
  draft: ExpressDraft,
  stagingId: string
) {
  return appWebMessageBridge.expectWarehouse({
    inputKey: createExpressWarehouseInputKey(draft),
    stagingId
  })
}

export function createExpressWarehouseStageKey(draft: ExpressDraft) {
  const { screening: _screening, ...warehouse } = draft.warehouse

  return JSON.stringify({
    ...draft,
    warehouse
  })
}

export function showExpressWarehouseConfirmation(
  title: string,
  content: string,
  confirmText = '确认',
  cancelText = '取消'
) {
  return new Promise<boolean | null>(resolve => {
    Taro.showModal({
      title,
      content,
      confirmText,
      cancelText,
      success: result => resolve(Boolean(result.confirm)),
      fail: () => resolve(null)
    })
  })
}

export async function resolveExpressWarehouseScreeningDecision(
  draft: ExpressDraft,
  screening: ExpressWarehouseScreening
): Promise<ExpressWarehouseScreeningDecision> {
  if (screening.type < 2 || draft.warehouse.screening.acknowledged) {
    return 'PROCEED'
  }

  if (screening.type === 3) {
    const needsWarehouse = await showExpressWarehouseConfirmation(
      '进仓提醒',
      '当前收件地址可能产生进仓费及第三方仓库收费，请确认是否需要送货进仓服务。',
      '需进仓',
      '无需进仓'
    )

    return needsWarehouse === null
      ? 'CANCEL'
      : needsWarehouse
        ? 'ENABLE'
        : 'REJECT'
  }

  const acknowledged = await showExpressWarehouseConfirmation(
    '进仓提示',
    screening.reason || '当前订单存在进仓风险，请确认已了解相关费用和预约要求。',
    '我知道了',
    '暂不提交'
  )

  return acknowledged ? 'ACKNOWLEDGE' : 'CANCEL'
}

export function getExpressWarehouseScreeningMessage(
  screening: ExpressWarehouseScreening
) {
  if (screening.type === 3) {
    return screening.autoSelected
      ? '当前地址符合精准进仓规则，已自动开启送货进仓，请完善预约信息'
      : screening.reason || '当前地址可能需要送货进仓，请确认服务方式'
  }

  if (screening.type === 4) {
    return screening.reason || '当前地址可能涉及进仓服务，请按实际需求确认'
  }

  if (screening.type === 2) {
    return screening.reason || '当前订单存在进仓提示，请留意费用和预约要求'
  }

  return (
    screening.reason ||
    (screening.type === 1
      ? '送货进仓筛单已完成，请按页面提示确认'
      : '当前地址未命中进仓提醒')
  )
}
