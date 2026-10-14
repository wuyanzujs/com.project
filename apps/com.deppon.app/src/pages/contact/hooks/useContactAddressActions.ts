import Taro from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { contactService } from '@/services/contact'
import type { Contact } from '@/services/contact'

interface UseContactAddressActionsParams {
  contact: Contact
  setContact: React.Dispatch<React.SetStateAction<Contact>>
  ensureAccess: () => boolean
}

interface UseContactAddressActionsResult {
  analysisText: string
  setAnalysisText: (next: string) => void
  analyzing: boolean
  refiningAddress: boolean
  handleAnalyze: () => Promise<void>
  handleRefineAddress: () => Promise<void>
}

export function useContactAddressActions({ contact, setContact, ensureAccess }: UseContactAddressActionsParams): UseContactAddressActionsResult {
  const [analysisText, setAnalysisText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [refiningAddress, setRefiningAddress] = useState(false)

  const handleAnalyze = useCallback(async () => {
    if (!ensureAccess() || analyzing) {
      return
    }

    const value = analysisText.trim()

    if (!value) {
      Taro.showToast({
        title: '请先粘贴地址文本',
        icon: 'none'
      })
      return
    }

    setAnalyzing(true)

    try {
      const response = await contactService.analyze(value)

      if (!response.status || !response.result) {
        Taro.showToast({
          title: response.message || '识别失败，请手动填写',
          icon: 'none'
        })
        return
      }

      const analysis = response.result

      setContact(current => contactService.applyAnalysisToContact(current, analysis))
      Taro.showToast({
        title: '识别成功，请核对',
        icon: 'none'
      })
    } finally {
      setAnalyzing(false)
    }
  }, [analysisText, analyzing, ensureAccess, setContact])

  const handleRefineAddress = useCallback(async () => {
    if (!ensureAccess() || refiningAddress) {
      return
    }

    if (!contact.address.trim()) {
      Taro.showToast({
        title: '请先填写详细地址',
        icon: 'none'
      })
      return
    }

    setRefiningAddress(true)

    try {
      if (contact.province && contact.city && contact.county) {
        const hintResponse = await contactService.queryAddressHints(contact)
        const hints = (hintResponse.result || [])
          .map(contactService.parseAddressHint)
          .filter(item => item.address)
          .slice(0, 6)

        if (hintResponse.status && hints.length) {
          const selected = await Taro.showActionSheet({
            itemList: hints.map(contactService.getAddressHintLabel)
          }).catch(() => null)

          if (!selected) {
            return
          }

          const hint = hints[selected.tapIndex]

          if (hint) {
            setContact(current => contactService.applyAddressHintToContact(current, hint))
            Taro.showToast({
              title: '已应用地址候选，请核对',
              icon: 'none'
            })
          }
          return
        }
      }

      const response = await contactService.analyze4(contact.address, contact)

      if (!response.status || !response.result) {
        Taro.showToast({
          title: response.message || '暂未识别到更准确地址',
          icon: 'none'
        })
        return
      }

      const analysis = response.result

      setContact(current => contactService.applyAnalysis4ToContact(current, analysis))
      Taro.showToast({
        title: '地址已补全，请核对',
        icon: 'none'
      })
    } finally {
      setRefiningAddress(false)
    }
  }, [contact, ensureAccess, refiningAddress, setContact])

  return {
    analysisText,
    setAnalysisText,
    analyzing,
    refiningAddress,
    handleAnalyze,
    handleRefineAddress
  }
}
