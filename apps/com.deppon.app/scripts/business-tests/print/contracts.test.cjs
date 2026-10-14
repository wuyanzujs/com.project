require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  DEFAULT_PRINT_DATE_RANGE_KEY,
  PRINT_API_ENDPOINTS,
  createPrintDateRangeOptions,
  createPrintRecipientAddress,
  mergePrintOrderPages,
  normalizePrintListResult,
  printApi,
  printService,
  resolvePrintListCounts,
  validatePrintSelection
} = require('@/services/print')

const cases = [
  {
    name: 'print center exposes the read-only list while native print actions stay pending',
    run() {
      const view = printService.getCenterView({
        printId: 'PRINT_001',
        source: 'HOME_SCAN'
      })
      const actions = Object.fromEntries(view.actions.map(item => [item.key, item]))

      assert.equal(actions.orderList.status, 'ready')
      assert.equal(actions.printOrders.status, 'ready')
      assert.equal(actions.printOrders.route, '/pages/print/list/index')
      assert.equal(actions.printerDevice.status, 'pending')
      assert.equal(actions.printConfig.status, 'pending')
      assert.equal(actions.cloudPrintCode.status, 'pending')
      assert.equal(view.nativeReady, false)
      assert.equal(view.cloudCode.printId, 'PRINT_001')
      assert.equal(view.cloudCode.source, 'HOME_SCAN')
      assert.equal(view.cloudCode.statusText, '暂不可用')
      assert.ok(PRINT_API_ENDPOINTS.includes('/gwapi/onlineService/eco/online/print/order/secure/queryNewOrderPrintList'))
    }
  },
  {
    name: 'print date ranges use inclusive local calendar boundaries',
    run() {
      const options = createPrintDateRangeOptions(new Date(2026, 6, 16, 12, 30, 15))
      const byKey = Object.fromEntries(options.map(option => [option.key, option]))

      assert.equal(DEFAULT_PRINT_DATE_RANGE_KEY, 'threeDays')
      assert.equal(byKey.today.startTime, '2026-07-16 00:00:00')
      assert.equal(byKey.today.endTime, '2026-07-16 23:59:59')
      assert.equal(byKey.threeDays.startTime, '2026-07-14 00:00:00')
      assert.equal(byKey.oneWeek.startTime, '2026-07-10 00:00:00')
      assert.equal(byKey.oneMonth.startTime, '2026-06-17 00:00:00')
      assert.equal(byKey.threeMonths.startTime, '2026-04-18 00:00:00')
    }
  },
  {
    name: 'print list mapper masks recipients and normalizes pagination',
    run() {
      const result = normalizePrintListResult(
        {
          pageNum: 2,
          pageSize: 10,
          totalPage: 0,
          totalRows: 11,
          list: [
            {
              id: ' PRINT_1 ',
              waybillNumber: ' DPK123456789 ',
              receiveName: ' 张三 ',
              receivePhone: '13800138000',
              receiveProvince: '上海市',
              receiveCity: '上海市',
              receiveArea: '青浦区',
              receiveAddress: '明珠路100号',
              deviceType: '2'
            }
          ]
        },
        { pageIndex: 1, pageSize: 10 }
      )

      assert.equal(result.pageIndex, 2)
      assert.equal(result.totalPage, 2)
      assert.equal(result.totalRows, 11)
      assert.equal(result.list[0].key, 'PRINT_1')
      assert.equal(result.list[0].waybillNumber, 'DPK123456789')
      assert.equal(result.list[0].recipientPhone, '138****8000')
      assert.equal(result.list[0].address, '上海市青浦区明珠路100号')
      assert.equal(createPrintRecipientAddress('', '', '', ''), '地址信息暂缺')
      assert.equal(
        normalizePrintListResult(
          {
            pageNum: 2,
            pageSize: 10,
            totalRows: 11,
            list: [{}]
          },
          { pageIndex: 1, pageSize: 10 }
        ).list[0].key,
        'print-order-11'
      )
      assert.equal(
        normalizePrintListResult(
          {
            totalRows: null,
            list: [{}]
          },
          { pageIndex: 1, pageSize: 10 }
        ).totalRows,
        1
      )
    }
  },
  {
    name: 'print pagination deduplicates items and count failures stay isolated',
    run() {
      const first = {
        key: 'PRINT_1',
        id: 'PRINT_1',
        waybillNumber: 'DPK1',
        recipientName: '张三',
        recipientPhone: '138****8000',
        address: '上海市青浦区'
      }
      const second = {
        ...first,
        key: 'PRINT_2',
        id: 'PRINT_2',
        waybillNumber: 'DPK2'
      }
      const merged = mergePrintOrderPages([first], [first, second])
      const counts = resolvePrintListCounts(
        {
          status: true,
          result: { totalRows: 8, list: [] }
        },
        {
          status: false,
          message: 'printed count failed',
          result: null
        }
      )

      assert.deepEqual(
        merged.map(item => item.key),
        ['PRINT_1', 'PRINT_2']
      )
      assert.deepEqual(counts, {
        waiting: 8,
        printed: null,
        failedSearchTypes: ['2']
      })
    }
  },
  {
    name: 'print service sends the exact list contract and maps the response',
    async run() {
      const originalQueryList = printApi.queryList
      let request = null
      let loading = null

      try {
        printApi.queryList = async (nextRequest, nextLoading) => {
          request = nextRequest
          loading = nextLoading

          return {
            status: true,
            result: {
              pageNum: 2,
              pageSize: 10,
              totalPage: 3,
              totalRows: 21,
              list: [
                {
                  id: 'PRINT_21',
                  waybillNumber: 'DPK21',
                  receiveName: '李四',
                  receivePhone: '13900139000',
                  receiveProvince: '浙江省',
                  receiveCity: '杭州市',
                  receiveArea: '西湖区',
                  receiveAddress: '文一路1号'
                }
              ]
            }
          }
        }

        const response = await printService.queryList({
          searchType: '1',
          rangeKey: 'threeDays',
          pageIndex: 2,
          pageSize: 10,
          now: new Date(2026, 6, 16, 12, 30, 15)
        })

        assert.deepEqual(request, {
          pageNum: 2,
          pageSize: 10,
          searchType: '1',
          startTime: '2026-07-14 00:00:00',
          endTime: '2026-07-16 23:59:59'
        })
        assert.equal(loading, false)
        assert.equal(response.status, true)
        assert.equal(response.result.pageIndex, 2)
        assert.equal(response.result.list[0].recipientPhone, '139****9000')
      } finally {
        printApi.queryList = originalQueryList
      }
    }
  },
  {
    name: 'print tab counts degrade independently when one query rejects',
    async run() {
      const originalQueryList = printApi.queryList
      const requests = []

      try {
        printApi.queryList = async request => {
          requests.push(request)

          if (request.searchType === '2') {
            throw new Error('printed count unavailable')
          }

          return {
            status: true,
            result: {
              pageNum: 1,
              pageSize: 1,
              totalPage: 7,
              totalRows: 7,
              list: []
            }
          }
        }

        const response = await printService.queryCounts({
          rangeKey: 'oneWeek',
          now: new Date(2026, 6, 16, 12, 30, 15)
        })

        assert.equal(response.status, true)
        assert.equal(response.message, '部分打印数量暂未更新')
        assert.deepEqual(response.result, {
          waiting: 7,
          printed: null,
          failedSearchTypes: ['2']
        })
        assert.deepEqual(
          requests.map(item => [item.searchType, item.pageNum, item.pageSize]),
          [
            ['1', 1, 1],
            ['2', 1, 1]
          ]
        )
        assert.equal(requests[0].startTime, requests[1].startTime)
        assert.equal(requests[0].endTime, requests[1].endTime)
      } finally {
        printApi.queryList = originalQueryList
      }
    }
  },
  {
    name: 'print selection validation requires device, orders and selected waybills',
    run() {
      assert.deepEqual(
        validatePrintSelection({
          deviceConnected: false,
          totalOrders: 1,
          selectedWaybillNumbers: ['DPK123456789']
        }),
        {
          canPrint: false,
          step: 'device',
          message: '请先连接打印机'
        }
      )
      assert.equal(
        validatePrintSelection({
          deviceConnected: true,
          totalOrders: 0,
          selectedWaybillNumbers: ['DPK123456789']
        }).message,
        '暂无待打印订单'
      )
      assert.equal(
        validatePrintSelection({
          deviceConnected: true,
          totalOrders: 1,
          selectedWaybillNumbers: []
        }).message,
        '请选择打印运单后再打印'
      )
      assert.deepEqual(
        validatePrintSelection({
          deviceConnected: true,
          totalOrders: 1,
          selectedWaybillNumbers: ['DPK123456789']
        }),
        {
          canPrint: true,
          step: 'ready',
          message: ''
        }
      )
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
