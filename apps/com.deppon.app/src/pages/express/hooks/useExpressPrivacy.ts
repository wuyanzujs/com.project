import Taro from '@tarojs/taro'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import {
  expressPrivacyStorage,
  setExpressPrivacyProtection
} from '@/services/express'
import type { ExpressDraft } from '@/services/express'

export function useExpressPrivacy(
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
) {
  const onChange = useCallback(
    (value: ExpressDraft['service']['privacyProtection']) => {
      if (value === 'N' || expressPrivacyStorage.hasConfirmed()) {
        setDraft(current => setExpressPrivacyProtection(current, value))
        return
      }

      void Taro.showModal({
        title: '开启隐私面单',
        content:
          '开启后，运单将按后端规则隐藏收寄件手机号等敏感信息。请确认快递员仍可通过系统联系收寄方。',
        confirmText: '开启',
        success: async res => {
          if (!res.confirm) {
            return
          }

          if (!(await expressPrivacyStorage.confirm())) {
            void Taro.showToast({ title: '设置保存失败，请重试', icon: 'none' })
            return
          }

          setDraft(current => setExpressPrivacyProtection(current, value))
        }
      })
    },
    [setDraft]
  )

  const onOpenTerms = useCallback(() => {
    void Taro.showModal({
      title: '信息加密说明',
      content:
        '开启后，纸质运单和德邦自助查单渠道（APP、小程序等）会对收寄双方姓名、电话、地址做隐藏处理，仅保留必要信息用于揽派。快递员仍可通过系统联系收寄方。',
      showCancel: false,
      confirmText: '我知道了'
    })
  }, [])

  return { onChange, onOpenTerms }
}
