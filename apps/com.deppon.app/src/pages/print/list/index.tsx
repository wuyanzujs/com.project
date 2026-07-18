import { ScrollView, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'

import { useCallback, useMemo, useRef, useState } from 'react'

import { PrintListControls } from './components/PrintListControls'
import { PrintListStates } from './components/PrintListStates'
import { PrintOrderCard } from './components/PrintOrderCard'
import {
  DEFAULT_PRINT_DATE_RANGE_KEY,
  mergePrintOrderPages,
  printService
} from '../../../services/print'
import { LatestRequestCoordinator } from '../../../shared/async/latestRequest'
import { AppPage } from '../../../shared/components'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'

import type {
  PrintDateRangeKey,
  PrintListCounts,
  PrintOrderListItem,
  PrintSearchType
} from '../../../services/print'

import './index.scss'

const PAGE_SIZE = 10
const EMPTY_COUNTS: PrintListCounts = {
  waiting: null,
  printed: null,
  failedSearchTypes: []
}

const PrintListPage = () => {
  const [status, setStatus] = useState<PrintSearchType>('1')
  const [rangeKey, setRangeKey] = useState<PrintDateRangeKey>(
    DEFAULT_PRINT_DATE_RANGE_KEY
  )
  const [orders, setOrders] = useState<PrintOrderListItem[]>([])
  const [counts, setCounts] = useState<PrintListCounts>(EMPTY_COUNTS)
  const [countMessage, setCountMessage] = useState('')
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const listCoordinator = useRef(new LatestRequestCoordinator()).current
  const countCoordinator = useRef(new LatestRequestCoordinator()).current
  const dateOptions = useMemo(() => printService.getDateRangeOptions(), [])
  const selectedRange =
    dateOptions.find(option => option.key === rangeKey) ?? dateOptions[0]

  const ensurePrintListAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.printList,
        replace: true
      }),
    []
  )

  const loadOrders = useCallback(
    async (
      nextPage = 1,
      nextStatus = status,
      nextRangeKey = rangeKey,
      force = false
    ) => {
      const requestToken = listCoordinator.begin(
        JSON.stringify([nextPage, nextStatus, nextRangeKey]),
        { force }
      )

      if (!requestToken) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await printService.queryList({
          searchType: nextStatus,
          rangeKey: nextRangeKey,
          pageIndex: nextPage,
          pageSize: PAGE_SIZE
        })

        if (!listCoordinator.isLatest(requestToken)) {
          return
        }

        if (!response.status || !response.result) {
          setErrorMessage(response.message || '打印订单加载失败，请稍后重试')

          if (nextPage === 1) {
            setOrders([])
            setPageIndex(1)
            setTotalPage(1)
            setTotalRows(0)
          }
          return
        }

        const result = response.result

        setOrders(current =>
          mergePrintOrderPages(current, result.list, nextPage === 1)
        )
        setPageIndex(result.pageIndex)
        setTotalPage(result.totalPage)
        setTotalRows(result.totalRows)
      } finally {
        if (listCoordinator.finish(requestToken)) {
          setLoading(false)
        }
      }
    },
    [listCoordinator, rangeKey, status]
  )

  const loadCounts = useCallback(
    async (nextRangeKey = rangeKey, force = false) => {
      const requestToken = countCoordinator.begin(nextRangeKey, { force })

      if (!requestToken) {
        return
      }

      try {
        const response = await printService.queryCounts({
          rangeKey: nextRangeKey
        })

        if (!countCoordinator.isLatest(requestToken)) {
          return
        }

        setCounts(response.result ?? EMPTY_COUNTS)
        setCountMessage(response.message || '')
      } finally {
        countCoordinator.finish(requestToken)
      }
    },
    [countCoordinator, rangeKey]
  )

  useDidShow(() => {
    if (ensurePrintListAccess()) {
      loadOrders(1)
      loadCounts()
    }
  })

  const resetList = () => {
    setOrders([])
    setPageIndex(1)
    setTotalPage(1)
    setTotalRows(0)
    setErrorMessage('')
  }

  const handleStatusChange = (nextStatus: PrintSearchType) => {
    if (nextStatus === status || !ensurePrintListAccess()) {
      return
    }

    setStatus(nextStatus)
    resetList()
    loadOrders(1, nextStatus, rangeKey)
  }

  const handleRangeChange = (nextRangeKey: PrintDateRangeKey) => {
    if (nextRangeKey === rangeKey || !ensurePrintListAccess()) {
      return
    }

    setRangeKey(nextRangeKey)
    setCounts(EMPTY_COUNTS)
    setCountMessage('')
    resetList()
    loadOrders(1, status, nextRangeKey)
    loadCounts(nextRangeKey)
  }

  const handleLoadMore = () => {
    if (!ensurePrintListAccess() || loading || pageIndex >= totalPage) {
      return
    }

    loadOrders(pageIndex + 1)
  }

  const handleRetry = () => {
    if (!ensurePrintListAccess()) {
      return
    }

    loadOrders(orders.length ? pageIndex + 1 : 1, status, rangeKey, true)
  }

  return (
    <AppPage
      className='print-list-shell'
      safeArea='top'
      statusBar='dark'
    >
      <View className='print-list-page'>
        <PrintListControls
          countMessage={countMessage}
          counts={counts}
          dateOptions={dateOptions}
          rangeKey={rangeKey}
          status={status}
          totalRows={totalRows}
          onRangeChange={handleRangeChange}
          onStatusChange={handleStatusChange}
        />

        <ScrollView
          className='print-list-scroll'
          onScrollToLower={handleLoadMore}
          scrollY
        >
          <View className='print-list-content'>
            {orders.map(item => (
              <PrintOrderCard item={item} key={item.key} status={status} />
            ))}

            <PrintListStates
              errorMessage={errorMessage}
              hasItems={!!orders.length}
              hasMore={pageIndex < totalPage}
              loading={loading}
              rangeLabel={selectedRange?.label || '当前范围'}
              status={status}
              onRetry={handleRetry}
            />
          </View>
        </ScrollView>
      </View>
    </AppPage>
  )
}

export default PrintListPage
