import { useCallback } from 'react'

import { updateExpressPackaging } from '@/services/express'
import type { ExpressDraft, ExpressPackagingDraft } from '@/services/express'

interface UseExpressGoodsParams {
  setDraft: React.Dispatch<React.SetStateAction<ExpressDraft>>
  restoreQuotes: (quotes: []) => void
}

// 货物编辑已迁到独立物品信息页（生产端 /pages/sendService/goods 模式），
// 寄件页上只保留包装服务的改动入口。
export function useExpressGoods({ restoreQuotes, setDraft }: UseExpressGoodsParams) {
  const handlePackagingChange = useCallback(
    (patch: Partial<ExpressPackagingDraft>) => {
      restoreQuotes([])
      setDraft(current => updateExpressPackaging(current, patch))
    },
    [restoreQuotes, setDraft]
  )

  return {
    handlePackagingChange
  }
}
