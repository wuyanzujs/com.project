import { describe, expect, it, vi } from 'vitest'

import {
  canCancelOrder,
  canCancelOrderDetail,
  canDeleteOrder,
  canDeleteOrderDetail,
  canModifyOrder,
  getOrderResendActionText,
  getOrderResendMode,
  isCancelledOrderDetail
} from '@/services/order/core/order.actionRules'

import type { OrderDetail, OrderListItem } from '@/services/order/core/types'

vi.mock('@/services/auth', () => ({
  getCurrentEcoToken: () => ''
}))

// 迁移前快照（master 8c16627）：以下实现逐字对应页面里的旧函数，
// 仅作为等价性基准保留，新实现由 services/order/core/order.actionRules.ts 提供。
const LEGACY_DELETABLE_ORDER_CLASSES = new Set([2, 3, 4, 5, 99])

function legacyCanCancelOrder(order: OrderListItem) {
  return order.role === 'sender' && order.orderClass === 0 && order.isAllowCancel && !!order.orderNumber
}

function legacyCanModifyOrder(order: OrderListItem) {
  return order.role === 'sender' && order.orderClass === 0 && order.isAllowCancel && !!order.orderNumber
}

function legacyCanDeleteOrder(order: {
  orderClass?: number
  orderClassification?: string | number
  orderNumber?: string | null
  waybillNumber?: string | null
}) {
  const orderClass = Number(order.orderClass ?? order.orderClassification)

  return LEGACY_DELETABLE_ORDER_CLASSES.has(orderClass) && (!!order.orderNumber || !!order.waybillNumber)
}

function legacyCanCancelOrderDetail(detail: OrderDetail | null, publicTrackMode: boolean) {
  if (!detail || publicTrackMode || !detail.orderNumber) {
    return false
  }

  return Number(detail.orderClassification) === 0 && detail.modifyFlag !== false
}

function legacyCanDeleteOrderDetail(detail: OrderDetail | null, publicTrackMode: boolean) {
  return !publicTrackMode && !!detail && legacyCanDeleteOrder(detail)
}

function legacyIsCancelledOrderDetail(detail: OrderDetail | null, publicTrackMode: boolean) {
  return !publicTrackMode && !!detail && Number(detail.orderClassification) === 4
}

function legacyGetResendMode(order: OrderListItem): 'repeat' | 'return' {
  return order.role === 'receive' ? 'return' : 'repeat'
}

function legacyGetResendActionText(order: OrderListItem) {
  return order.role === 'receive' ? '一键回寄' : '再来一单'
}

function createListItem(overrides: Partial<OrderListItem> = {}): OrderListItem {
  return {
    role: 'sender',
    senderCity: '上海',
    senderName: '张三',
    consigneeCity: '北京',
    consigneeName: '李四',
    waybillNumber: 'WB001',
    orderNumber: 'DP001',
    orderStatus: '待分配',
    orderClass: 0,
    orderClassName: '待分配',
    orderTime: '2026-10-01 10:00:00',
    orderPrice: 20,
    isExpress: true,
    isDispatch: false,
    isAllowCancel: true,
    ...overrides
  }
}

function createDetail(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    orderNumber: 'DP001',
    waybillNumber: 'WB001',
    orderClassification: '0',
    orderStatus: '待分配',
    orderTime: '2026-10-01 10:00:00',
    ...overrides
  }
}

describe('列表动作规则与迁移前快照等价', () => {
  it('role/orderClass/isAllowCancel/单号的所有组合都得到相同结果', () => {
    let checked = 0

    for (const role of ['sender', 'receive'] as const) {
      for (const orderClass of [0, 1, 2, 3, 4, 5, 99]) {
        for (const isAllowCancel of [true, false]) {
          for (const orderNumber of ['DP001', '']) {
            for (const waybillNumber of ['WB001', '']) {
              const order = createListItem({ role, orderClass, isAllowCancel, orderNumber, waybillNumber })

              expect(canCancelOrder(order)).toBe(legacyCanCancelOrder(order))
              expect(canModifyOrder(order)).toBe(legacyCanModifyOrder(order))
              expect(canDeleteOrder(order)).toBe(legacyCanDeleteOrder(order))
              expect(getOrderResendMode(order.role)).toBe(legacyGetResendMode(order))
              expect(getOrderResendActionText(order.role)).toBe(legacyGetResendActionText(order))
              checked += 1
            }
          }
        }
      }
    }

    expect(checked).toBe(112)
  })

  it('orderClass 为空时回退 orderClassification，删除分类集合与旧实现一致', () => {
    for (const orderClassification of ['2', '3', '4', '5', '99', '0', '1', '6', 'abc', '2.0']) {
      for (const orderNumber of ['DP001', '']) {
        for (const waybillNumber of ['WB001', '']) {
          const order = { orderClassification, orderNumber, waybillNumber }

          expect(canDeleteOrder(order)).toBe(legacyCanDeleteOrder(order))
        }
      }
    }
  })
})

describe('详情动作规则与迁移前快照等价', () => {
  it('publicTrackMode/orderClassification/modifyFlag/单号的所有组合都得到相同结果', () => {
    let checked = 0

    for (const publicTrackMode of [true, false]) {
      for (const orderClassification of ['0', '1', '2', '3', '4', '5', 'abc']) {
        for (const modifyFlag of [true, false, undefined]) {
          for (const orderNumber of ['DP001', '']) {
            for (const waybillNumber of ['WB001', '']) {
              const detail = createDetail({ orderClassification, modifyFlag, orderNumber, waybillNumber })

              expect(canCancelOrderDetail(detail, publicTrackMode)).toBe(legacyCanCancelOrderDetail(detail, publicTrackMode))
              expect(canDeleteOrderDetail(detail, publicTrackMode)).toBe(legacyCanDeleteOrderDetail(detail, publicTrackMode))
              expect(isCancelledOrderDetail(detail, publicTrackMode)).toBe(legacyIsCancelledOrderDetail(detail, publicTrackMode))
              checked += 1
            }
          }
        }
      }

      expect(canCancelOrderDetail(null, publicTrackMode)).toBe(legacyCanCancelOrderDetail(null, publicTrackMode))
      expect(canDeleteOrderDetail(null, publicTrackMode)).toBe(legacyCanDeleteOrderDetail(null, publicTrackMode))
      expect(isCancelledOrderDetail(null, publicTrackMode)).toBe(legacyIsCancelledOrderDetail(null, publicTrackMode))
    }

    expect(checked).toBe(168)
  })
})

describe('列表动作真实字段组合', () => {
  it('寄件人待分配且允许取消的订单可取消、可修改', () => {
    const order = createListItem()

    expect(canCancelOrder(order)).toBe(true)
    expect(canModifyOrder(order)).toBe(true)
  })

  it('收件人、非待分配、不允许取消、缺订单号任一条件不满足都不可取消或修改', () => {
    expect(canCancelOrder(createListItem({ role: 'receive' }))).toBe(false)
    expect(canCancelOrder(createListItem({ orderClass: 1 }))).toBe(false)
    expect(canCancelOrder(createListItem({ isAllowCancel: false }))).toBe(false)
    expect(canCancelOrder(createListItem({ orderNumber: '' }))).toBe(false)
    expect(canModifyOrder(createListItem({ role: 'receive' }))).toBe(false)
    expect(canModifyOrder(createListItem({ orderClass: 2 }))).toBe(false)
    expect(canModifyOrder(createListItem({ isAllowCancel: false }))).toBe(false)
    expect(canModifyOrder(createListItem({ orderNumber: '' }))).toBe(false)
  })

  it.each([2, 3, 4, 5, 99])('订单分类 %i 可删除', orderClass => {
    expect(canDeleteOrder(createListItem({ orderClass }))).toBe(true)
  })

  it.each([0, 1, 6])('订单分类 %i 不可删除', orderClass => {
    expect(canDeleteOrder(createListItem({ orderClass }))).toBe(false)
  })

  it('删除只认订单号或运单号之一，两者都缺失时不可删除', () => {
    expect(canDeleteOrder(createListItem({ orderNumber: '', waybillNumber: '' }))).toBe(false)
    expect(canDeleteOrder(createListItem({ orderNumber: '', waybillNumber: 'WB001' }))).toBe(false)
    expect(canDeleteOrder(createListItem({ orderClass: 2, orderNumber: '', waybillNumber: 'WB001' }))).toBe(true)
  })

  it('orderClass 存在时优先于 orderClassification', () => {
    expect(canDeleteOrder({ orderClass: 0, orderClassification: '2', orderNumber: 'DP001' })).toBe(false)
    expect(canDeleteOrder({ orderClass: 3, orderClassification: '0', orderNumber: 'DP001' })).toBe(true)
  })

  it('再寄模式与文案随角色切换', () => {
    expect(getOrderResendMode('sender')).toBe('repeat')
    expect(getOrderResendMode('receive')).toBe('return')
    expect(getOrderResendActionText('sender')).toBe('再来一单')
    expect(getOrderResendActionText('receive')).toBe('一键回寄')
  })
})

describe('详情动作真实字段组合', () => {
  it('待分配订单在寄件态可取消，modifyFlag=false 时不可取消', () => {
    expect(canCancelOrderDetail(createDetail(), false)).toBe(true)
    expect(canCancelOrderDetail(createDetail({ modifyFlag: true }), false)).toBe(true)
    expect(canCancelOrderDetail(createDetail({ modifyFlag: false }), false)).toBe(false)
  })

  it('公开物流态、缺订单号、非待分配分类都不可取消', () => {
    expect(canCancelOrderDetail(createDetail(), true)).toBe(false)
    expect(canCancelOrderDetail(createDetail({ orderNumber: '' }), false)).toBe(false)
    expect(canCancelOrderDetail(createDetail({ orderClassification: '1' }), false)).toBe(false)
    expect(canCancelOrderDetail(null, false)).toBe(false)
  })

  it.each([2, 3, 4, 5, 99])('详情订单分类 %i 可删除', orderClassification => {
    expect(canDeleteOrderDetail(createDetail({ orderClassification: String(orderClassification) }), false)).toBe(true)
  })

  it('详情删除在公开物流态、空详情、非删除分类下为 false', () => {
    expect(canDeleteOrderDetail(createDetail({ orderClassification: '2' }), true)).toBe(false)
    expect(canDeleteOrderDetail(null, false)).toBe(false)
    expect(canDeleteOrderDetail(createDetail({ orderClassification: '0' }), false)).toBe(false)
  })

  it('详情只带运单号也可删除', () => {
    expect(canDeleteOrderDetail(createDetail({ orderNumber: '', orderClassification: '3', waybillNumber: 'WB001' }), false)).toBe(true)
  })

  it('已取消只看分类 4，不要求订单号；公开物流态不判定为已取消', () => {
    expect(isCancelledOrderDetail(createDetail({ orderClassification: '4', orderNumber: '' }), false)).toBe(true)
    expect(isCancelledOrderDetail(createDetail({ orderClassification: '4' }), true)).toBe(false)
    expect(isCancelledOrderDetail(createDetail({ orderClassification: '3' }), false)).toBe(false)
    expect(isCancelledOrderDetail(null, false)).toBe(false)
  })

  it('非法分类码不触发任何动作', () => {
    expect(canCancelOrderDetail(createDetail({ orderClassification: 'abc' }), false)).toBe(false)
    expect(canDeleteOrderDetail(createDetail({ orderClassification: 'abc' }), false)).toBe(false)
    expect(isCancelledOrderDetail(createDetail({ orderClassification: 'abc' }), false)).toBe(false)
  })
})
