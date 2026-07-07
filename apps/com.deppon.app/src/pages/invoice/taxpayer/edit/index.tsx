import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { useEffect, useState } from 'react'

import { invoiceService } from '../../../../services/invoice'

import type {
  InvoiceTaxpayerForm,
  InvoiceTaxpayerMatch,
  InvoiceTaxpayerType,
  InvoiceTaxpayerView
} from '../../../../services/invoice'

import './index.scss'

const TAXPAYER_TYPE_OPTIONS: Array<{
  label: string
  value: InvoiceTaxpayerType
}> = [
  {
    label: '个人/事业单位',
    value: '0'
  },
  {
    label: '单位',
    value: '1'
  }
]

function parseTaxpayer(value?: string): InvoiceTaxpayerView | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as InvoiceTaxpayerView
  } catch {
    return null
  }
}

function cleanInput(value: string) {
  return value.replace(/\s+/g, '')
}

const InvoiceTaxpayerEditPage = () => {
  const router = useRouter()
  const [form, setForm] = useState<InvoiceTaxpayerForm>(() =>
    invoiceService.createTaxpayerForm()
  )
  const [matches, setMatches] = useState<InvoiceTaxpayerMatch[]>([])
  const [matching, setMatching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const taxpayer = parseTaxpayer(router.params.data)

    setForm(invoiceService.createTaxpayerForm(taxpayer))
    Taro.setNavigationBarTitle({
      title: taxpayer?.id ? '编辑抬头' : '新增抬头'
    })
  }, [router.params.data])

  const updateForm = (patch: Partial<InvoiceTaxpayerForm>) => {
    setForm((current) => ({
      ...current,
      ...patch
    }))
    setMessage('')
  }

  const handleChangeType = (customerType: InvoiceTaxpayerType) => {
    updateForm({
      customerType,
      taxNumber: customerType === '0' ? '' : form.taxNumber
    })
    setMatches([])
  }

  const handleMatch = async () => {
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
      const response = await invoiceService.queryTaxpayerMatches(
        form.name,
        form.customerType
      )

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
  }

  const handleSelectMatch = (item: InvoiceTaxpayerMatch) => {
    updateForm({
      name: item.taxName,
      taxNumber: item.taxNo,
      address: item.taxAddress,
      phone: item.taxTelephone,
      bank: item.taxBankName,
      bankAccount: item.taxBankNumber
    })
    setMatches([])
  }

  const handleSave = async () => {
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
  }

  return (
    <ScrollView className='invoice-taxpayer-edit-page' scrollY>
      <View className='invoice-taxpayer-edit-header'>
        <Text className='invoice-taxpayer-edit-header__label'>Taxpayer</Text>
        <Text className='invoice-taxpayer-edit-header__title'>
          {form.id ? '编辑抬头' : '新增抬头'}
        </Text>
        <Text className='invoice-taxpayer-edit-header__summary'>
          单位抬头可通过企业名称联想补全税号、地址、电话和银行信息。
        </Text>
      </View>

      <View className='invoice-taxpayer-edit-section'>
        <Text className='invoice-taxpayer-edit-section__title'>抬头类型</Text>
        <View className='invoice-taxpayer-edit-chips'>
          {TAXPAYER_TYPE_OPTIONS.map((item) => (
            <View
              className={
                item.value === form.customerType
                  ? 'invoice-taxpayer-edit-chip invoice-taxpayer-edit-chip--active'
                  : 'invoice-taxpayer-edit-chip'
              }
              key={item.value}
              onClick={() => handleChangeType(item.value)}
            >
              <Text
                className={
                  item.value === form.customerType
                    ? 'invoice-taxpayer-edit-chip__text invoice-taxpayer-edit-chip__text--active'
                    : 'invoice-taxpayer-edit-chip__text'
                }
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        <View className='invoice-taxpayer-edit-field'>
          <View className='invoice-taxpayer-edit-field__row'>
            <Text className='invoice-taxpayer-edit-field__label'>
              发票抬头 *
            </Text>
            <View
              className='invoice-taxpayer-edit-field__button'
              onClick={handleMatch}
            >
              <Text className='invoice-taxpayer-edit-field__button-text'>
                {matching ? '匹配中' : '联想'}
              </Text>
            </View>
          </View>
          <Input
            className='invoice-taxpayer-edit-input'
            maxlength={100}
            placeholder='请输入发票抬头'
            value={form.name}
            onBlur={(event) =>
              updateForm({ name: cleanInput(event.detail.value) })
            }
            onInput={(event) => updateForm({ name: event.detail.value })}
          />
        </View>

        {matches.length > 0 && (
          <View className='invoice-taxpayer-edit-matches'>
            {matches.map((item) => (
              <View
                className='invoice-taxpayer-edit-match'
                key={`${item.taxName}-${item.taxNo}`}
                onClick={() => handleSelectMatch(item)}
              >
                <Text className='invoice-taxpayer-edit-match__title'>
                  {item.taxName}
                </Text>
                <Text className='invoice-taxpayer-edit-match__summary'>
                  {item.taxNo || '暂无税号'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className='invoice-taxpayer-edit-field'>
          <Text className='invoice-taxpayer-edit-field__label'>
            企业税号{form.customerType === '1' ? ' *' : ''}
          </Text>
          <Input
            className='invoice-taxpayer-edit-input'
            maxlength={20}
            placeholder='请输入企业税号'
            value={form.taxNumber}
            onBlur={(event) =>
              updateForm({
                taxNumber: cleanInput(event.detail.value).toUpperCase()
              })
            }
            onInput={(event) =>
              updateForm({
                taxNumber: event.detail.value.toUpperCase()
              })
            }
          />
        </View>

        <View
          className='invoice-taxpayer-edit-default'
          onClick={() => updateForm({ isDefault: !form.isDefault })}
        >
          <View
            className={
              form.isDefault
                ? 'invoice-taxpayer-edit-checkbox invoice-taxpayer-edit-checkbox--checked'
                : 'invoice-taxpayer-edit-checkbox'
            }
          >
            <Text className='invoice-taxpayer-edit-checkbox__text'>
              {form.isDefault ? '✓' : ''}
            </Text>
          </View>
          <Text className='invoice-taxpayer-edit-default__text'>
            设为默认抬头
          </Text>
        </View>
      </View>

      {form.customerType === '1' && (
        <View className='invoice-taxpayer-edit-section'>
          <Text className='invoice-taxpayer-edit-section__title'>单位信息</Text>
          <View className='invoice-taxpayer-edit-field'>
            <Text className='invoice-taxpayer-edit-field__label'>纳税人地址</Text>
            <Input
              className='invoice-taxpayer-edit-input'
              maxlength={50}
              placeholder='请输入纳税人地址'
              value={form.address}
              onBlur={(event) =>
                updateForm({ address: cleanInput(event.detail.value) })
              }
              onInput={(event) => updateForm({ address: event.detail.value })}
            />
          </View>

          <View className='invoice-taxpayer-edit-field'>
            <Text className='invoice-taxpayer-edit-field__label'>纳税人电话</Text>
            <Input
              className='invoice-taxpayer-edit-input'
              maxlength={20}
              placeholder='请输入纳税人电话'
              value={form.phone}
              onBlur={(event) =>
                updateForm({ phone: cleanInput(event.detail.value) })
              }
              onInput={(event) => updateForm({ phone: event.detail.value })}
            />
          </View>

          <View className='invoice-taxpayer-edit-field'>
            <Text className='invoice-taxpayer-edit-field__label'>开户银行</Text>
            <Input
              className='invoice-taxpayer-edit-input'
              maxlength={50}
              placeholder='请输入开户银行'
              value={form.bank}
              onBlur={(event) =>
                updateForm({ bank: cleanInput(event.detail.value) })
              }
              onInput={(event) => updateForm({ bank: event.detail.value })}
            />
          </View>

          <View className='invoice-taxpayer-edit-field'>
            <Text className='invoice-taxpayer-edit-field__label'>银行账号</Text>
            <Input
              className='invoice-taxpayer-edit-input'
              maxlength={30}
              placeholder='请输入银行账号'
              type='number'
              value={form.bankAccount}
              onBlur={(event) =>
                updateForm({ bankAccount: cleanInput(event.detail.value) })
              }
              onInput={(event) =>
                updateForm({ bankAccount: event.detail.value })
              }
            />
          </View>
        </View>
      )}

      {message && (
        <View className='invoice-taxpayer-edit-message'>
          <Text className='invoice-taxpayer-edit-message__text'>{message}</Text>
        </View>
      )}

      <View className='invoice-taxpayer-edit-actions'>
        <View className='invoice-taxpayer-edit-submit' onClick={handleSave}>
          <Text className='invoice-taxpayer-edit-submit__text'>
            {saving ? '保存中' : '保存'}
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

export default InvoiceTaxpayerEditPage
