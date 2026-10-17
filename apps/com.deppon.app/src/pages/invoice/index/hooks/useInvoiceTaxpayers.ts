import { useCallback, useState } from 'react'

import { invoiceService } from '@/services/invoice'
import type { InvoiceTaxpayerView } from '@/services/invoice'

import type { LatestRequestRunner } from './latestRequestTypes'

interface UseInvoiceTaxpayersParams {
  runLatestRequest: LatestRequestRunner
  setErrorMessage: (next: string) => void
}

interface UseInvoiceTaxpayersResult {
  taxpayers: InvoiceTaxpayerView[]
  loadTaxpayers: () => Promise<void>
  setTaxpayers: (next: InvoiceTaxpayerView[] | ((current: InvoiceTaxpayerView[]) => InvoiceTaxpayerView[])) => void
}

/** 发票中心的发票抬头区域：加载已保存抬头，并向编辑页提供可更新的抬头列表状态。 */
export function useInvoiceTaxpayers({ runLatestRequest, setErrorMessage }: UseInvoiceTaxpayersParams): UseInvoiceTaxpayersResult {
  const [taxpayers, setTaxpayers] = useState<InvoiceTaxpayerView[]>([])

  const loadTaxpayers = useCallback(async () => {
    await runLatestRequest(
      'taxpayers',
      () => invoiceService.queryTaxpayers(),
      response => {
        if (!response.status || !response.result) {
          setTaxpayers([])
          setErrorMessage(response.message || '暂未获取到发票抬头')
          return
        }

        setTaxpayers(response.result)
      }
    )
  }, [runLatestRequest, setErrorMessage])

  return { taxpayers, loadTaxpayers, setTaxpayers }
}
