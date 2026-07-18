import Taro from '@tarojs/taro'

import { useCallback, useRef, useState } from 'react'

import {
  contactService,
  resolveContactAddressIntegrity
} from '../../../services/contact'

import type { Contact } from '../../../services/contact'

export type ContactAddressIntegrityAction =
  | 'continue'
  | 'review'
  | 'blocked'

interface ContactAddressIntegrityOptions {
  cancelText: string
  confirmText: string
}

function getContactCheckKey(contact: Contact) {
  return contact.id || `${contact.telephone}-${contact.address}`
}

export function useContactAddressIntegrity() {
  const inFlightRef = useRef(false)
  const [checkingKey, setCheckingKey] = useState('')

  const checkAddressIntegrity = useCallback(
    async (
      contact: Contact,
      options: ContactAddressIntegrityOptions
    ): Promise<ContactAddressIntegrityAction> => {
      if (inFlightRef.current) {
        return 'blocked'
      }

      inFlightRef.current = true
      setCheckingKey(getContactCheckKey(contact))

      try {
        const response = await contactService.checkAddressDetail(contact)
        const outcome = resolveContactAddressIntegrity(response)

        if (outcome.kind === 'pass') {
          return 'continue'
        }

        if (outcome.kind === 'blocked') {
          return 'blocked'
        }

        if (outcome.kind === 'unavailable') {
          Taro.showToast({
            title: `${outcome.message}，已继续`,
            icon: 'none'
          })
          return 'continue'
        }

        try {
          const modal = await Taro.showModal({
            title: '地址可能不完整',
            content: outcome.message,
            confirmText: options.confirmText,
            cancelText: options.cancelText
          })

          return modal.confirm ? 'review' : 'continue'
        } catch {
          Taro.showToast({
            title: '地址确认未完成，请重试',
            icon: 'none'
          })
          return 'blocked'
        }
      } finally {
        inFlightRef.current = false
        setCheckingKey('')
      }
    },
    []
  )

  return {
    checkingKey,
    checkAddressIntegrity
  }
}
