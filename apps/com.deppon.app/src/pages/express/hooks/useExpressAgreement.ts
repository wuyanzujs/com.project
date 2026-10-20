import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { expressAgreementStorage } from '@/services/express'
import type { ExpressDraft } from '@/services/express'

interface UseExpressAgreementOptions {
  accepted: boolean
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
}

/**
 * @description 电子运单协议勾选：首次勾选先弹协议确认弹层，确认过之后直接勾选。
 */
export function useExpressAgreement({ accepted, setDraft }: UseExpressAgreementOptions) {
  const [sheetVisible, setSheetVisible] = useState(false)

  const accept = useCallback(() => {
    setDraft(current => ({ ...current, agreementAccepted: true }))
  }, [setDraft])

  const onToggleAgreement = useCallback(() => {
    if (accepted) {
      setDraft(current => ({ ...current, agreementAccepted: false }))
      return
    }

    // 本地已有确认记录时直接勾选；首次勾选先展示协议确认弹层。
    if (expressAgreementStorage.hasConfirmed()) {
      accept()
      return
    }

    setSheetVisible(true)
  }, [accept, accepted, setDraft])

  const onAgree = useCallback(async () => {
    await expressAgreementStorage.confirm()
    setSheetVisible(false)
    accept()
  }, [accept])

  const onCloseSheet = useCallback(() => setSheetVisible(false), [])

  return {
    onAgree,
    onCloseSheet,
    onToggleAgreement,
    sheetVisible
  }
}
