import { useCallback, useState } from 'react'

import { invoiceService } from '@/services/invoice'
import type { InvoiceHistoryView } from '@/services/invoice'
import { getNativeCapabilityErrorMessage } from '@/shared/platform/capabilities'
import { scanAppCode } from '@/shared/platform/scan'

import { INVOICE_PAGE_SIZE } from './latestRequestTypes'

import type { LatestRequestRunner } from './latestRequestTypes'

interface UseInvoiceHistoryParams {
  runLatestRequest: LatestRequestRunner
  setErrorMessage: (next: string) => void
  showPendingToast: (title: string) => void
}

interface UseInvoiceHistoryResult {
  history: InvoiceHistoryView[]
  historyPageIndex: number
  historyTotalPage: number
  historyTotalRows: number
  historyKeyword: string
  setHistoryKeyword: (next: string) => void
  loadHistory: (nextPage?: number, keyword?: string) => Promise<void>
  handleSearchHistory: () => void
  handleScanHistory: () => Promise<void>
  handleClearHistory: () => void
}

export function useInvoiceHistory({ runLatestRequest, setErrorMessage, showPendingToast }: UseInvoiceHistoryParams): UseInvoiceHistoryResult {
  const [history, setHistory] = useState<InvoiceHistoryView[]>([])
  const [historyPageIndex, setHistoryPageIndex] = useState(1)
  const [historyTotalPage, setHistoryTotalPage] = useState(1)
  const [historyTotalRows, setHistoryTotalRows] = useState(0)
  const [historyKeyword, setHistoryKeyword] = useState('')

  const loadHistory = useCallback(
    async (nextPage = 1, keyword = historyKeyword) => {
      await runLatestRequest(
        `history:${nextPage}:${keyword.trim()}`,
        () => invoiceService.queryHistory(nextPage, INVOICE_PAGE_SIZE, keyword),
        response => {
          if (!response.status || !response.result) {
            setErrorMessage(response.message || '暂未获取到开票历史')
            if (nextPage === 1) {
              setHistory([])
              setHistoryTotalRows(0)
            }
            return
          }

          setHistory(current => (nextPage === 1 ? (response.result?.list ?? []) : [...current, ...(response.result?.list ?? [])]))
          setHistoryPageIndex(response.result.pageIndex)
          setHistoryTotalPage(response.result.totalPage)
          setHistoryTotalRows(response.result.totalRows)
        }
      )
    },
    [historyKeyword, runLatestRequest, setErrorMessage]
  )

  const handleSearchHistory = useCallback(() => {
    setHistory([])
    loadHistory(1, historyKeyword)
  }, [historyKeyword, loadHistory])

  const handleScanHistory = useCallback(async () => {
    try {
      const result = await scanAppCode('INVOICE_HISTORY_SEARCH')

      if (result.kind !== 'waybill') {
        showPendingToast(result.kind === 'unsupported' ? result.message : '云打印码不能用于开票历史查询')
        return
      }

      setHistoryKeyword(result.waybillNumber)
      setHistory([])
      loadHistory(1, result.waybillNumber)
    } catch (error) {
      showPendingToast(getNativeCapabilityErrorMessage(error))
    }
  }, [loadHistory, showPendingToast])

  const handleClearHistory = useCallback(() => {
    setHistoryKeyword('')
    setHistory([])
    loadHistory(1, '')
  }, [loadHistory])

  return {
    history,
    historyPageIndex,
    historyTotalPage,
    historyTotalRows,
    historyKeyword,
    setHistoryKeyword,
    loadHistory,
    handleSearchHistory,
    handleScanHistory,
    handleClearHistory
  }
}
