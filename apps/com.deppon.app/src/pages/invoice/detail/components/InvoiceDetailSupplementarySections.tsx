import { Input, Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'
import { getInvoiceDetailMoneyText } from '../invoiceDetailView'
import { InvoiceDetailRow } from './InvoiceDetailRow'

import type {
  InvoiceHistoryView,
  InvoiceHistoryWaybillView
} from '../../../../services/invoice'

import './InvoiceDetailSupplementarySections.scss'

interface InvoiceDetailSupplementarySectionsProps {
  addressText: string
  email: string
  invoice: InvoiceHistoryView
  loading: boolean
  message: string
  modifyingAddress: boolean
  sending: boolean
  waybills: InvoiceHistoryWaybillView[]
  onEmailBlur: (value: string) => void
  onEmailInput: (value: string) => void
  onSelectAddress: () => void
  onSendEmail: () => void
}

export function InvoiceDetailSupplementarySections({
  addressText,
  email,
  invoice,
  loading,
  message,
  modifyingAddress,
  onEmailBlur,
  onEmailInput,
  onSelectAddress,
  onSendEmail,
  sending,
  waybills
}: InvoiceDetailSupplementarySectionsProps) {
  return (
    <>
      {invoice.billCategory === '01' && (
        <View className='invoice-detail-section'>
          <View className='invoice-detail-section__head'>
            <Text className='invoice-detail-section__title'>收票地址</Text>
            {invoice.canModifyAddress && (
              <AppPressable
                accessibilityLabel={
                  modifyingAddress ? '正在修改收票地址' : '修改收票地址'
                }
                className={
                  modifyingAddress
                    ? 'invoice-detail-section__button invoice-detail-section__button--disabled'
                    : 'invoice-detail-section__button'
                }
                disabled={modifyingAddress}
                onPress={onSelectAddress}
              >
                <Text className='invoice-detail-section__button-text'>
                  {modifyingAddress ? '修改中' : '修改'}
                </Text>
              </AppPressable>
            )}
          </View>

          {invoice.contactName ||
          invoice.contactPhone ||
          invoice.contactAddress ? (
            <>
              <InvoiceDetailRow
                label='收票人'
                value={
                  [invoice.contactName, invoice.contactPhone]
                    .filter(Boolean)
                    .join(' ') || '--'
                }
              />
              <InvoiceDetailRow
                address
                label='收票地址'
                value={addressText}
              />
            </>
          ) : (
            <View className='invoice-detail-empty-block'>
              <Text className='invoice-detail-empty-block__title'>
                暂无收票地址
              </Text>
            </View>
          )}
        </View>
      )}

      <View className='invoice-detail-section'>
        <Text className='invoice-detail-section__title'>发送至邮箱</Text>
        <Text className='invoice-detail-section__summary invoice-detail-section__summary--block'>
          可发送状态由发票网关状态决定，邮箱会在本机保留以便下次使用。
        </Text>
        <View className='invoice-detail-mail'>
          <Input
            className='invoice-detail-mail__input'
            maxlength={50}
            placeholder='请输入接收邮箱'
            value={email}
            onBlur={event => onEmailBlur(event.detail.value)}
            onInput={event => onEmailInput(event.detail.value)}
          />
          <AppPressable
            accessibilityLabel={
              sending
                ? '正在发送发票邮件'
                : invoice.canSendEmail
                  ? '发送发票邮件'
                  : '当前状态暂不可发送发票邮件'
            }
            className={
              invoice.canSendEmail && !sending
                ? 'invoice-detail-mail__button'
                : 'invoice-detail-mail__button invoice-detail-mail__button--disabled'
            }
            disabled={sending}
            onPress={onSendEmail}
          >
            <Text className='invoice-detail-mail__button-text'>
              {sending ? '发送中' : '发送'}
            </Text>
          </AppPressable>
        </View>
        {!invoice.canSendEmail && (
          <Text className='invoice-detail-mail__hint'>当前状态暂不可发送</Text>
        )}
      </View>

      <View className='invoice-detail-section'>
        <View className='invoice-detail-section__head'>
          <Text className='invoice-detail-section__title'>包含运单</Text>
          <Text className='invoice-detail-section__summary'>
            共 {waybills.length} 条
          </Text>
        </View>

        {waybills.map((item, index) => (
          <View className='invoice-detail-waybill' key={item.waybillNumber}>
            <View>
              <Text className='invoice-detail-waybill__index'>
                {index + 1}. 运单
              </Text>
              <Text className='invoice-detail-waybill__number'>
                {item.waybillNumber}
              </Text>
            </View>
            <Text className='invoice-detail-waybill__amount'>
              {getInvoiceDetailMoneyText(item.amount)}
            </Text>
          </View>
        ))}

        {!waybills.length && !loading && (
          <View className='invoice-detail-empty-block'>
            <Text className='invoice-detail-empty-block__title'>
              {message || '暂无包含运单信息'}
            </Text>
          </View>
        )}
      </View>
    </>
  )
}
