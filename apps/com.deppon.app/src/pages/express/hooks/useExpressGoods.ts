import { useCallback } from 'react'

import { updateExpressPackaging } from '@/services/express'
import type { ExpressDraft, ExpressPackagingDraft } from '@/services/express'

interface UseExpressGoodsParams {
  setDraft: React.Dispatch<React.SetStateAction<ExpressDraft>>
  restoreQuotes: (quotes: []) => void
}

/**
 * 寄件页的货物相关入口：货物编辑在独立物品信息页完成，这里只处理包装服务变更并清空旧报价。
 */
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
