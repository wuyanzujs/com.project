import { beforeEach, describe, expect, it, vi } from 'vitest'

import { printService, validatePrintSelection } from '@/services/print/print.service'

const mocks = vi.hoisted(() => ({
  queryList: vi.fn()
}))

vi.mock('@/services/print/print.api', () => ({
  PRINT_LIST_ENDPOINT: '/gwapi/print',
  printApi: { queryList: mocks.queryList }
}))

const now = new Date(2026, 9, 21)

function okCount(totalRows: number) {
  return { message: '', result: { list: [], totalRows }, status: true }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('printService.queryList', () => {
  it('queries the default first page and normalizes the result', async () => {
    mocks.queryList.mockResolvedValue({
      message: '',
      result: {
        list: [
          {
            deviceType: '1',
            id: 'P1',
            receiveAddress: '明珠路 100 号',
            receiveCity: '上海市',
            receiveArea: '青浦区',
            receiveName: '张三',
            receivePhone: '13800000000',
            receiveProvince: '上海',
            waybillNumber: 'DP001'
          }
        ],
        pageNum: 1,
        pageSize: 10,
        totalPage: 1,
        totalRows: 1
      },
      status: true
    })

    const response = await printService.queryList({ now, searchType: '1' })

    expect(mocks.queryList).toHaveBeenCalledWith(
      {
        endTime: '2026-10-21 23:59:59',
        pageNum: 1,
        pageSize: 10,
        searchType: '1',
        startTime: '2026-10-19 00:00:00'
      },
      false
    )
    expect(response.result).toMatchObject({
      list: [{ key: 'P1', recipientPhone: '138****0000', waybillNumber: 'DP001' }],
      pageIndex: 1,
      pageSize: 10,
      totalRows: 1
    })
  })

  it('passes the caller page, range and loading flag through', async () => {
    mocks.queryList.mockResolvedValue({ message: '', result: null, status: false })

    await printService.queryList({ loading: true, now, pageIndex: 3, pageSize: 20, rangeKey: 'today', searchType: '2' })

    expect(mocks.queryList).toHaveBeenCalledWith(expect.objectContaining({ pageNum: 3, pageSize: 20, searchType: '2' }), true)
  })

  it('falls back to the tab specific failure copy', async () => {
    mocks.queryList.mockResolvedValue({ message: '', result: null, status: false })

    await expect(printService.queryList({ now, searchType: '1' })).resolves.toMatchObject({ message: '暂未获取到待打印订单', status: false })
    await expect(printService.queryList({ now, searchType: '2' })).resolves.toMatchObject({ message: '暂未获取到已打印订单', status: false })

    mocks.queryList.mockResolvedValue({ message: '后端说不行', result: null, status: false })
    await expect(printService.queryList({ now, searchType: '1' })).resolves.toMatchObject({ message: '后端说不行' })
  })
})

describe('printService.queryCounts', () => {
  it('queries both tabs independently', async () => {
    mocks.queryList.mockImplementation(async (request: { searchType: string }) =>
      request.searchType === '1' ? okCount(3) : okCount(4)
    )

    const response = await printService.queryCounts({ now })

    expect(mocks.queryList).toHaveBeenNthCalledWith(1, expect.objectContaining({ searchType: '1' }), false)
    expect(mocks.queryList).toHaveBeenNthCalledWith(2, expect.objectContaining({ searchType: '2' }), false)
    expect(response).toEqual({
      message: '',
      result: { failedSearchTypes: [], printed: 4, waiting: 3 },
      status: true
    })
  })

  it('keeps the printed count when the waiting endpoint rejects', async () => {
    mocks.queryList.mockImplementation(async (request: { searchType: string }) => {
      if (request.searchType === '1') {
        throw new Error('waiting offline')
      }

      return okCount(7)
    })

    const response = await printService.queryCounts({ now })

    expect(response).toEqual({
      message: '部分打印数量暂未更新',
      result: { failedSearchTypes: ['1'], printed: 7, waiting: null },
      status: true
    })
  })

  it('keeps the waiting count when the printed endpoint fails', async () => {
    mocks.queryList.mockImplementation(async (request: { searchType: string }) =>
      request.searchType === '1' ? okCount(2) : { message: 'printed failed', result: null, status: false }
    )

    const response = await printService.queryCounts({ now })

    expect(response).toEqual({
      message: '部分打印数量暂未更新',
      result: { failedSearchTypes: ['2'], printed: null, waiting: 2 },
      status: true
    })
  })

  it('reports a full failure only when both counts fail', async () => {
    mocks.queryList.mockRejectedValue(new Error('offline'))

    const response = await printService.queryCounts({ loading: true, now, rangeKey: 'today' })

    expect(mocks.queryList).toHaveBeenCalledWith(expect.objectContaining({ searchType: '1' }), true)
    expect(response).toEqual({
      message: '打印数量暂未获取',
      result: { failedSearchTypes: ['1', '2'], printed: null, waiting: null },
      status: false
    })
  })
})

describe('validatePrintSelection', () => {
  it('requires a printer, orders and at least one waybill', () => {
    expect(validatePrintSelection({ deviceConnected: false, selectedWaybillNumbers: [], totalOrders: 0 })).toEqual({
      canPrint: false,
      message: '请先连接打印机',
      step: 'device'
    })
    expect(validatePrintSelection({ deviceConnected: true, selectedWaybillNumbers: [], totalOrders: 0 })).toEqual({
      canPrint: false,
      message: '暂无待打印订单',
      step: 'orders'
    })
    expect(validatePrintSelection({ deviceConnected: true, selectedWaybillNumbers: [], totalOrders: 2 })).toEqual({
      canPrint: false,
      message: '请选择打印运单后再打印',
      step: 'selection'
    })
    expect(validatePrintSelection({ deviceConnected: true, selectedWaybillNumbers: ['DP001'], totalOrders: 2 })).toEqual({
      canPrint: true,
      message: '',
      step: 'ready'
    })
  })
})

describe('printService.getCenterView', () => {
  it('exposes the print center actions without a cloud code', () => {
    const view = printService.getCenterView()

    expect(view.title).toBe('面单打印')
    expect(view.nativeReady).toBe(false)
    expect(view.cloudCode).toBeUndefined()
    expect(view.actions.map(action => action.key)).toEqual(['orderList', 'printOrders', 'printerDevice', 'printConfig', 'cloudPrintCode'])
    expect(view.actions.find(action => action.key === 'printerDevice')).toMatchObject({ status: 'pending', statusText: '暂不可用' })
    expect(view.apiEndpoints).toHaveLength(5)
    expect(view.rules).toHaveLength(4)
  })

  it('recognizes a trimmed cloud print code and defaults its source', () => {
    const view = printService.getCenterView({ printId: '  CODE-1  ' })

    expect(view.cloudCode).toEqual({
      disabledReason: '该打印码暂不支持直接下单',
      printId: 'CODE-1',
      source: 'UNKNOWN',
      statusText: '暂不可用',
      summary: '该打印码暂不支持直接下单，可先查看面单打印订单。',
      title: '已识别云打印码'
    })
  })

  it('keeps the provided cloud print source and ignores a blank code', () => {
    expect(printService.getCenterView({ printId: 'CODE-2', source: 'EXPRESS' }).cloudCode).toMatchObject({ source: 'EXPRESS' })
    expect(printService.getCenterView({ printId: '   ' }).cloudCode).toBeUndefined()
  })
})
