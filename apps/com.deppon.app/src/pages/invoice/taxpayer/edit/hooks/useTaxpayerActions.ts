import Taro from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { invoiceService } from '@/services/invoice'
import type { InvoiceTaxpayerForm, InvoiceTaxpayerMatch, InvoiceTaxpayerType } from '@/services/invoice'

interface UseTaxpayerActionsParams {
  form: InvoiceTaxpayerForm
  updateForm: (patch: Partial<InvoiceTaxpayerForm>) => void
}

interface UseTaxpayerActionsResult {
  matches: InvoiceTaxpayerMatch[]
  matching: boolean
  saving: boolean
  message: string
  setMessage: (next: string) => void
  setMatches: (next: InvoiceTaxpayerMatch[]) => void
  handleMatch: () => Promise<void>
  handleSelectMatch: (item: InvoiceTaxpayerMatch) => void
  handleSave: () => Promise<void>
}

export function useTaxpayerActions({ form, updateForm }: UseTaxpayerActionsParams): UseTaxpayerActionsResult {
  const [matches, setMatches] = useState<InvoiceTaxpayerMatch[]>([])
  const [matching, setMatching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleMatch = useCallback(async () => {
    if (form.customerType !== '1') {
      Taro.showToast({
        title: '仅单位抬头支持联想',
        icon: 'none'
      })
      return
    }

    if (!form.name.trim() || form.name.trim().length <= 3) {
      Taro.showToast({
        title: '请输入至少4个字的单位抬头',
        icon: 'none'
      })
      return
    }

    setMatching(true)

    try {
      const response = await invoiceService.queryTaxpayerMatches(form.name, form.customerType)

      if (!response.status || !response.result?.length) {
        setMatches([])
        Taro.showToast({
          title: response.message || '暂无匹配抬头',
          icon: 'none'
        })
        return
      }

      setMatches(response.result)
    } finally {
      setMatching(false)
    }
  }, [form.customerType, form.name])

  const handleSelectMatch = useCallback(
    (item: InvoiceTaxpayerMatch) => {
      updateForm({
        name: item.taxName,
        taxNumber: item.taxNo,
        address: item.taxAddress,
        phone: item.taxTelephone,
        bank: item.taxBankName,
        bankAccount: item.taxBankNumber
      })
      setMatches([])
    },
    [updateForm]
  )

  const handleSave = useCallback(async () => {
    if (saving) {
      return
    }

    const validationMessage = invoiceService.validateTaxpayer(form)

    if (validationMessage) {
      setMessage(validationMessage)
      Taro.showToast({
        title: validationMessage,
        icon: 'none'
      })
      return
    }

    setSaving(true)

    try {
      const response = await invoiceService.saveTaxpayer(form)

      if (!response.status) {
        setMessage(response.message || '保存失败')
        Taro.showToast({
          title: response.message || '保存失败',
          icon: 'none'
        })
        return
      }

      Taro.showToast({
        title: form.id ? '修改成功' : '新增成功',
        icon: 'none'
      })
      setTimeout(() => {
        Taro.navigateBack()
      }, 500)
    } finally {
      setSaving(false)
    }
  }, [form, saving])

  return {
    matches,
    matching,
    saving,
    message,
    setMessage,
    setMatches,
    handleMatch,
    handleSelectMatch,
    handleSave
  }
}

export function useTaxpayerType(
  form: InvoiceTaxpayerForm,
  updateForm: (patch: Partial<InvoiceTaxpayerForm>) => void,
  setMatches: (next: InvoiceTaxpayerMatch[]) => void
) {
  const handleChangeType = useCallback(
    (customerType: InvoiceTaxpayerType) => {
      updateForm({
        customerType,
        taxNumber: customerType === '0' ? '' : form.taxNumber
      })
      setMatches([])
    },
    [form.taxNumber, updateForm, setMatches]
  )

  return { handleChangeType }
}
