import { APP_ROUTES } from '../../shared/navigation/routes'
import { APP_NATIVE_CAPABILITIES } from '../../shared/platform/capabilities'
import { createServiceFailure } from '../serviceResponse'
import { PRINT_LIST_ENDPOINT, printApi } from './print.api'
import { normalizePrintListResult } from './print.mapper'
import {
  createPrintDateRangeOptions,
  DEFAULT_PRINT_DATE_RANGE_KEY,
  getPrintDateRange,
  resolvePrintListCounts
} from './print.rules'

import type {
  PrintCenterOptions,
  PrintCenterView,
  PrintListCounts,
  PrintListResponse,
  PrintListResult,
  PrintSelectionResult,
  PrintSelectionState,
  QueryPrintCountsOptions,
  QueryPrintListOptions
} from './types'
import type { DepponResponse } from '../../request/deppon'

const DEFAULT_PRINT_PAGE_SIZE = 10

export const PRINT_API_ENDPOINTS = [
  PRINT_LIST_ENDPOINT,
  '/gwapi/onlineService/eco/online/print/order/secure/blueToothPrintCode',
  '/gwapi/onlineService/eco/online/print/secure/queryPrintConfig',
  '/gwapi/onlineService/eco/online/print/secure/userPrintConfig',
  '/gwapi/onlineService/eco/online/print/order/secure/updatePrintStatus'
]

function createResult(
  step: PrintSelectionResult['step'],
  message: string
): PrintSelectionResult {
  return {
    canPrint: step === 'ready',
    step,
    message
  }
}

export function validatePrintSelection(
  state: PrintSelectionState
): PrintSelectionResult {
  if (!state.deviceConnected) {
    return createResult('device', '请先连接打印机')
  }

  if (state.totalOrders <= 0) {
    return createResult('orders', '暂无待打印订单')
  }

  if (!state.selectedWaybillNumbers.length) {
    return createResult('selection', '请选择打印运单后再打印')
  }

  return createResult('ready', '')
}

function createCloudCodeView(options: PrintCenterOptions) {
  const printId = options.printId?.trim()

  if (!printId) {
    return undefined
  }

  return {
    printId,
    source: options.source || 'UNKNOWN',
    title: '已识别云打印码',
    summary: '该打印码暂不支持直接下单，可先查看面单打印订单。',
    statusText: '暂不可用',
    disabledReason: '该打印码暂不支持直接下单'
  }
}

function getFulfilledResponse(
  result: PromiseSettledResult<DepponResponse<PrintListResponse>>
) {
  return result.status === 'fulfilled' ? result.value : null
}

export const printService = {
  getDateRangeOptions: createPrintDateRangeOptions,

  async queryList(
    options: QueryPrintListOptions
  ): Promise<DepponResponse<PrintListResult>> {
    const pageIndex = options.pageIndex ?? 1
    const pageSize = options.pageSize ?? DEFAULT_PRINT_PAGE_SIZE
    const dateRange = getPrintDateRange(
      options.rangeKey ?? DEFAULT_PRINT_DATE_RANGE_KEY,
      options.now
    )
    const response = await printApi.queryList(
      {
        pageNum: pageIndex,
        pageSize,
        searchType: options.searchType,
        startTime: dateRange.startTime,
        endTime: dateRange.endTime
      },
      options.loading ?? false
    )

    if (!response.status || !response.result) {
      return createServiceFailure(
        response.message ||
          (options.searchType === '1'
            ? '暂未获取到待打印订单'
            : '暂未获取到已打印订单')
      )
    }

    return {
      ...response,
      result: normalizePrintListResult(response.result, {
        pageIndex,
        pageSize
      })
    }
  },

  async queryCounts(
    options: QueryPrintCountsOptions = {}
  ): Promise<DepponResponse<PrintListCounts>> {
    const dateRange = getPrintDateRange(
      options.rangeKey ?? DEFAULT_PRINT_DATE_RANGE_KEY,
      options.now
    )
    const createRequest = (searchType: '1' | '2') => ({
      pageNum: 1,
      pageSize: 1,
      searchType,
      startTime: dateRange.startTime,
      endTime: dateRange.endTime
    })
    const [waitingResult, printedResult] = await Promise.allSettled([
      printApi.queryList(createRequest('1'), options.loading ?? false),
      printApi.queryList(createRequest('2'), options.loading ?? false)
    ])
    const counts = resolvePrintListCounts(
      getFulfilledResponse(waitingResult),
      getFulfilledResponse(printedResult)
    )
    const failedCount = counts.failedSearchTypes.length

    return {
      status: failedCount < 2,
      message:
        failedCount === 0
          ? ''
          : failedCount === 1
            ? '部分打印数量暂未更新'
            : '打印数量暂未获取',
      result: counts
    }
  },

  getCenterView(options: PrintCenterOptions = {}): PrintCenterView {
    const nativeReady = APP_NATIVE_CAPABILITIES.print === 'ready'

    return {
      title: '面单打印',
      summary: '查询待打印和已打印面单，并查看打印设备与设置状态。',
      nativeReady,
      cloudCode: createCloudCodeView(options),
      actions: [
        {
          key: 'orderList',
          title: '查看订单',
          summary: '查看寄件订单和运单详情。',
          status: 'ready',
          statusText: '可用',
          route: APP_ROUTES.orderList
        },
        {
          key: 'printOrders',
          title: '打印订单',
          summary: '查询待打印和已打印面单。',
          status: 'ready',
          statusText: '可用',
          route: APP_ROUTES.printList
        },
        {
          key: 'printerDevice',
          title: '打印机管理',
          summary: '连接并管理面单打印设备。',
          status: nativeReady ? 'ready' : 'pending',
          statusText: nativeReady ? '可用' : '暂不可用',
          disabledReason: nativeReady ? undefined : '打印机管理暂不可用'
        },
        {
          key: 'printConfig',
          title: '打印设置',
          summary: '设置打印份数和常用设备。',
          status: 'pending',
          statusText: '暂不可用',
          disabledReason: '打印设置暂不可用'
        },
        {
          key: 'cloudPrintCode',
          title: '云打印码',
          summary: '使用打印码创建云打印任务。',
          status: 'pending',
          statusText: '暂不可用',
          disabledReason: '云打印码暂不可用'
        }
      ],
      apiEndpoints: PRINT_API_ENDPOINTS,
      rules: [
        '打印前必须先连接打印机',
        '没有待打印订单时不能发起打印',
        '必须选择至少一个运单后才能打印',
        '打印成功后才更新面单状态'
      ]
    }
  },

  validateSelection: validatePrintSelection
}
