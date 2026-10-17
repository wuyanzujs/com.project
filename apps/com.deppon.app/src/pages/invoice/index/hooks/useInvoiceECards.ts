import { useCallback, useMemo, useState } from 'react'

import { invoiceService } from '@/services/invoice'
import type { InvoiceECardView } from '@/services/invoice'

import { getSelectedInvoiceECards, getSelectedInvoiceECardAmount } from '../invoiceCenterViewModel'
import { INVOICE_PAGE_SIZE } from './latestRequestTypes'

import type { LatestRequestRunner } from './latestRequestTypes'

interface UseInvoiceECardsResult {
  ecards: InvoiceECardView[]
  selectedECardIds: string[]
  ecardPageIndex: number
  ecardTotalPage: number
  ecardTotalRows: number
  selectedECardAmount: number
  loadECards: (nextPage?: number) => Promise<void>
  handleToggleECard: (item: InvoiceECardView) => void
  handleApplySelectedECards: () => void
  setSelectedECardIds: React.Dispatch<React.SetStateAction<string[]>>
}

interface UseInvoiceECardsParams {
  runLatestRequest: LatestRequestRunner
  setErrorMessage: (next: string) => void
  showPendingToast: (title: string) => void
  navigateToApply: (items: InvoiceECardView[]) => void
}

/** 发票中心的储值卡开票区域：分页加载储值卡记录、维护多选状态并进入开票申请页。 */
export function useInvoiceECards({ runLatestRequest, setErrorMessage, showPendingToast, navigateToApply }: UseInvoiceECardsParams): UseInvoiceECardsResult {
  const [ecards, setECards] = useState<InvoiceECardView[]>([])
  const [selectedECardIds, setSelectedECardIds] = useState<string[]>([])
  const [ecardPageIndex, setECardPageIndex] = useState(1)
  const [ecardTotalPage, setECardTotalPage] = useState(1)
  const [ecardTotalRows, setECardTotalRows] = useState(0)

  const loadECards = useCallback(
    async (nextPage = 1) => {
      await runLatestRequest(
        `ecards:${nextPage}`,
        () => invoiceService.queryECards(nextPage, INVOICE_PAGE_SIZE),
        response => {
          if (!response.status || !response.result) {
            setErrorMessage(response.message || '暂未获取到储值卡开票记录')
            if (nextPage === 1) {
              setECards([])
              setSelectedECardIds([])
              setECardTotalRows(0)
            }
            return
          }

          if (nextPage === 1) {
            setSelectedECardIds([])
          }
          setECards(current => (nextPage === 1 ? (response.result?.list ?? []) : [...current, ...(response.result?.list ?? [])]))
          setECardPageIndex(response.result.pageIndex)
          setECardTotalPage(response.result.totalPage)
          setECardTotalRows(response.result.totalRows)
        }
      )
    },
    [runLatestRequest, setErrorMessage]
  )

  const handleToggleECard = useCallback((item: InvoiceECardView) => {
    setSelectedECardIds(current => (current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]))
  }, [])

  const handleApplySelectedECards = useCallback(() => {
    const selectedItems = getSelectedInvoiceECards(ecards, selectedECardIds)

    if (!selectedItems.length) {
      showPendingToast('请选择储值卡开票记录')
      return
    }

    navigateToApply(selectedItems)
  }, [ecards, navigateToApply, selectedECardIds, showPendingToast])

  const selectedECardAmount = useMemo(() => getSelectedInvoiceECardAmount(ecards, selectedECardIds), [ecards, selectedECardIds])

  return {
    ecards,
    selectedECardIds,
    ecardPageIndex,
    ecardTotalPage,
    ecardTotalRows,
    selectedECardAmount,
    loadECards,
    handleToggleECard,
    handleApplySelectedECards,
    setSelectedECardIds
  }
}
