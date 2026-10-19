import type { DepponResponse } from '@/request/deppon'
import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

import { orderApi } from './order.api'
import { createOrderDetailActions } from './order.detailActions'
import {
  invalidOrderWaybill,
  notifyOrderDeliver,
  queryOrderUrgeAction,
  queryOrderUrgePanel,
  resolveDepartmentPhone,
  resolveOrderUrgeMenuAction,
  submitOrderUrge
} from './order.detailUseCases'
import { dispatchOrderPickup, queryOrderPickupSchedule } from './order.dispatch'
import { getOrderClassLabel, normalizeConsigneeOrder, normalizeSenderOrder, normalizeWaybillDetail } from './order.mapper'
import { queryOrderStubDocument, queryOrderStubImages, queryOrderStubPackageFee } from './order.stubAssets'
import { createOrderStubEntry, createOrderStubView } from './order.stubView'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type { OrderDetail, OrderListOptions, OrderListResult, OrderRole, WaybillTrackListResponse } from './types'

export { createExpressDraftFromOrderDetail, getOrderClassLabel } from './order.mapper'
export { getOrderCopyNumber, getOrderIdentityText, getOrderReceiverAddress, getOrderSenderAddress } from './order.stubView'

export type { OrderResendMode } from './order.mapper'

interface OrderTrackQueryOptions {
  loading?: boolean
  login?: boolean
}

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_RANGE_DAYS = 30

const DELETABLE_ORDER_CLASSES = new Set([2, 3, 4, 5, 99])

/**
 *
 * @param value 数字
 * @description 数字补零为两位字符串
 */
function pad(value: number) {
  return String(value).padStart(2, '0')
}

/**
 *
 * @param date 日期对象
 * @description 格式化为接口请求时间文案
 */
function formatRequestDateTime(date: Date) {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 *
 * @param days 查询天数
 * @description 生成订单查询的起止时间
 */
export function getOrderDateRange(days = DEFAULT_RANGE_DAYS) {
  const endDate = new Date()
  const startDate = new Date()
  const rangeDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_RANGE_DAYS

  endDate.setHours(23, 59, 59, 0)
  startDate.setDate(startDate.getDate() - rangeDays)
  startDate.setHours(0, 0, 0, 0)

  return {
    startTime: formatRequestDateTime(startDate),
    endTime: formatRequestDateTime(endDate)
  }
}

/**
 *
 * @description 取默认订单查询时间范围
 */
function getDefaultDateRange() {
  return getOrderDateRange()
}

/**
 *
 * @param order 订单简要信息
 * @description 判断订单是否可删除
 */
export function canDeleteOrder(order: {
  orderClass?: number
  orderClassification?: string | number
  orderNumber?: string | null
  waybillNumber?: string | null
}) {
  const orderClass = Number(order.orderClass ?? order.orderClassification)

  return DELETABLE_ORDER_CLASSES.has(orderClass) && (!!order.orderNumber || !!order.waybillNumber)
}

export const orderService = {
  getDefaultDateRange,
  getDateRange: getOrderDateRange,
  getDetailActions: createOrderDetailActions,
  getStubEntry: createOrderStubEntry,
  getStubView: createOrderStubView,
  queryPickupSchedule: queryOrderPickupSchedule,
  dispatchPickup: dispatchOrderPickup,
  queryStubDocument: queryOrderStubDocument,
  queryStubImages: queryOrderStubImages,
  queryStubPackageFee: queryOrderStubPackageFee,
  queryUrgeAction: queryOrderUrgeAction,
  queryUrgePanel: queryOrderUrgePanel,
  resolveUrgeMenuAction: resolveOrderUrgeMenuAction,
  submitUrge: submitOrderUrge,
  notifyDeliver: notifyOrderDeliver,
  invalidWaybill: invalidOrderWaybill,
  resolveDepartmentPhone,

  /**
   *
   * @param options 列表查询条件
   * @description 按角色分页查询订单列表
   */
  async queryList(options: OrderListOptions = {}): Promise<DepponResponse<OrderListResult>> {
    const range = getDefaultDateRange()
    const role: OrderRole = options.role ?? 'sender'
    const pageIndex = options.pageIndex ?? 1
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
    const baseData = {
      pageIndex,
      pageSize,
      startTime: options.startTime ?? range.startTime,
      endTime: options.endTime ?? range.endTime,
      sysCode: APP_RUNTIME_CONFIG.systemCode,
      owsOrderListKeyword: options.keyword ?? '',
      orderStatus: options.orderStatus ?? '',
      paymentType: options.paymentType ?? ''
    }

    if (role === 'receive') {
      const response = await orderApi.queryConsigneeList({
        ...baseData,
        type: 1,
        status: 0
      })

      if (!response.status || !response.result) {
        return createFailure(response.message || '暂未获取到收件订单')
      }

      return {
        ...response,
        result: {
          list: (response.result.row ?? []).map(normalizeConsigneeOrder),
          pageIndex: response.result.pageIndex || pageIndex,
          pageSize: response.result.pageSize || pageSize,
          totalPage: Math.max(1, Math.ceil((response.result.total || 0) / pageSize)),
          totalRows: response.result.total || 0
        }
      }
    }

    const response = await orderApi.querySenderList({
      ...baseData,
      ordersort: 0
    })

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到寄件订单')
    }

    return {
      ...response,
      result: {
        list: (response.result.queryOrderList ?? []).map(normalizeSenderOrder),
        pageIndex: response.result.pageNum || pageIndex,
        pageSize: response.result.pageSize || pageSize,
        totalPage: response.result.totalPage || 1,
        totalRows: response.result.totalRows || 0
      }
    }
  },

  /**
   *
   * @param data 订单号或运单号
   * @description 按运单号或订单号查询详情
   */
  async queryDetail(data: { orderNumber?: string; waybillNumber?: string }): Promise<DepponResponse<OrderDetail>> {
    // 生产端详情主数据源是 orderService 订单详情(orderNumber);运单详情仅在无订单号(公开物流态)时使用,
    // 避免测试环境 waybillService 缺运单记录时整页报「运单不存在」。
    if (data.orderNumber) {
      const response = await orderApi.queryOrderDetail({
        orderNumber: data.orderNumber,
        sysCode: APP_RUNTIME_CONFIG.systemCode
      })

      if (!response.status || !response.result) {
        return createFailure(response.message || '暂未获取到订单详情')
      }

      const orderClass = Number(response.result.orderClassification)

      return {
        ...response,
        result: {
          ...response.result,
          orderClassName: getOrderClassLabel(orderClass)
        }
      }
    }

    if (data.waybillNumber) {
      const response = await orderApi.queryWaybillDetail({
        waybillNumber: data.waybillNumber,
        sysCode: APP_RUNTIME_CONFIG.systemCode
      })
      const detail = response.result?.orderDetails

      if (!response.status || !detail) {
        return createFailure(response.message || '暂未获取到运单详情')
      }

      const normalizedDetail = normalizeWaybillDetail(detail)
      const orderClass = Number(normalizedDetail.orderClassification)

      return {
        ...response,
        result: {
          ...normalizedDetail,
          orderClassName: getOrderClassLabel(orderClass)
        }
      }
    }

    return createFailure('缺少订单号或运单号')
  },

  /**
   *
   * @param waybillNumber 运单号
   * @param options 轨迹查询选项
   * @description 查询运单物流轨迹列表
   */
  queryTrackList(waybillNumber?: string | null, options: OrderTrackQueryOptions = {}): Promise<DepponResponse<WaybillTrackListResponse>> {
    if (!waybillNumber) {
      return Promise.resolve(createFailure('缺少运单号，暂无法查询轨迹'))
    }

    return orderApi.queryTrackList(waybillNumber, options)
  },

  /**
   *
   * @param orderNumber 订单号
   * @param cancelReason 取消原因
   * @description 取消订单并回传取消原因
   */
  cancelOrder(orderNumber: string, cancelReason = '用户取消') {
    if (!orderNumber) {
      return Promise.resolve(createFailure<boolean>('缺少订单号，无法取消'))
    }

    return orderApi.cancelOrder({
      orderNumber,
      cancelReason,
      sysCode: APP_RUNTIME_CONFIG.systemCode
    })
  },

  /**
   *
   * @param data 订单号或运单号与角色
   * @description 按角色删除订单或运单
   */
  deleteOrder(data: { role: OrderRole; orderNumber?: string | null; waybillNumber?: string | null }) {
    if (!data.orderNumber && !data.waybillNumber) {
      return Promise.resolve(createFailure<boolean>('缺少订单号或运单号，无法删除'))
    }

    return orderApi.deleteOrder({
      orderSource: data.role === 'receive' ? '2' : '1',
      orderListType: data.role,
      orderNumber: data.orderNumber || '',
      waybillNumber: data.waybillNumber || '',
      sysCode: APP_RUNTIME_CONFIG.systemCode
    })
  }
}
