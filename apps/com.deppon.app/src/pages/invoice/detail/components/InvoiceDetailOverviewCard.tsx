import { Text, View } from '@tarojs/components'

import {
  AppCard,
  AppPressable,
  AppStatusTag
} from '../../../../shared/components'
import { getInvoiceDetailMoneyText } from '../invoiceDetailView'
import { InvoiceDetailRow } from './InvoiceDetailRow'

import type { InvoiceHistoryView } from '../../../../services/invoice'
import type { AppStatusTagTone } from '../../../../shared/components'

import './InvoiceDetailOverviewCard.scss'

interface InvoiceDetailOverviewCardProps {
  invoice: InvoiceHistoryView
  processingAction: string
  onCancel: () => void
  onPreview: () => void
  onReverse: () => void
}

function getStatusClassName(statusClass: string) {
  return `invoice-detail-status invoice-detail-status--${statusClass.toLowerCase()}`
}

function getStatusTone(statusClass: string): AppStatusTagTone {
  if (statusClass === 'SUCCESS') return 'success'
  if (statusClass === 'CANCEL') return 'neutral'
  if (statusClass === 'ERROR') return 'danger'
  if (statusClass === 'PROCESS') return 'warning'
  return 'brand'
}

export function InvoiceDetailOverviewCard({
  invoice,
  onCancel,
  onPreview,
  onReverse,
  processingAction
}: InvoiceDetailOverviewCardProps) {
  return (
    <AppCard className='invoice-detail-card' padding='none'>
      <View className='invoice-detail-card__top'>
        <Text className='invoice-detail-card__title'>{invoice.title}</Text>
        <AppStatusTag
          className={getStatusClassName(invoice.statusClass)}
          label={invoice.statusText}
          tone={getStatusTone(invoice.statusClass)}
        />
      </View>

      <InvoiceDetailRow label='申请号' value={invoice.id} />
      <InvoiceDetailRow label='发票类型' value={invoice.typeText} />
      <InvoiceDetailRow
        amount
        label='发票金额'
        value={getInvoiceDetailMoneyText(invoice.amount)}
      />
      <InvoiceDetailRow
        label='纳税人识别号'
        value={invoice.taxNumber || '--'}
      />
      <InvoiceDetailRow label='接收邮箱' value={invoice.email || '--'} />
      <InvoiceDetailRow label='申请时间' value={invoice.applyTime} />
      {!!invoice.remark && (
        <InvoiceDetailRow label='备注' value={invoice.remark} />
      )}

      <View className='invoice-detail-actions'>
        <AppPressable
          accessibilityLabel='预览或发送发票邮件'
          className={
            invoice.canPreview
              ? 'invoice-detail-action'
              : 'invoice-detail-action invoice-detail-action--disabled'
          }
          onPress={onPreview}
        >
          <Text
            className={
              invoice.canPreview
                ? 'invoice-detail-action__text'
                : 'invoice-detail-action__text invoice-detail-action__text--disabled'
            }
          >
            预览/发送邮箱
          </Text>
        </AppPressable>
        {invoice.canCancel && (
          <AppPressable
            accessibilityLabel={
              processingAction === 'cancel' ? '正在撤销申请' : '撤销申请'
            }
            className={
              processingAction === 'cancel'
                ? 'invoice-detail-action invoice-detail-action--disabled'
                : 'invoice-detail-action invoice-detail-action--danger'
            }
            disabled={processingAction === 'cancel'}
            onPress={onCancel}
          >
            <Text className='invoice-detail-action__text'>
              {processingAction === 'cancel' ? '撤销中' : '撤销申请'}
            </Text>
          </AppPressable>
        )}
        {invoice.canReverse && (
          <AppPressable
            accessibilityLabel={
              processingAction === 'reverse' ? '正在作废发票' : '作废发票'
            }
            className={
              processingAction === 'reverse'
                ? 'invoice-detail-action invoice-detail-action--disabled'
                : 'invoice-detail-action invoice-detail-action--danger'
            }
            disabled={processingAction === 'reverse'}
            onPress={onReverse}
          >
            <Text className='invoice-detail-action__text'>
              {processingAction === 'reverse' ? '作废中' : '作废发票'}
            </Text>
          </AppPressable>
        )}
      </View>
    </AppCard>
  )
}
