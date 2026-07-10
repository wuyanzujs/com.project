import { Text, View } from '@tarojs/components'

import { InvoiceEmpty, InvoiceSummary } from './InvoiceCenterSections'

import type { InvoiceECardView } from '../../../../services/invoice'

import '../index.scss'

function getMoneyText(value: number) {
  if (!Number.isFinite(value)) {
    return '¥0'
  }

  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`
}

export function InvoiceECardPanel(props: {
  ecards: InvoiceECardView[]
  selectedIds: string[]
  selectedAmount: number
  totalRows: number
  loading: boolean
  errorMessage: string
  onApplySelected: () => void
  onToggle: (item: InvoiceECardView) => void
}) {
  const selectedCount = props.selectedIds.length

  return (
    <>
      <InvoiceSummary
        title='储值卡开票'
        countText={`共 ${props.totalRows} 条可开票记录`}
        hintText={
          selectedCount
            ? `已选 ${selectedCount} 条 ${getMoneyText(props.selectedAmount)}`
            : '支持多选合并开票'
        }
        actionText='申请选中'
        onAction={props.onApplySelected}
      />

      <View className='invoice-content'>
        {props.ecards.map((item) => {
          const selected = props.selectedIds.includes(item.id)

          return (
            <View className='invoice-card' key={item.id}>
              <View className='invoice-card__top'>
                <Text className='invoice-card__number'>
                  打款编码 {item.id || '--'}
                </Text>
                <Text
                  className={
                    selected
                      ? 'invoice-card__status invoice-card__status--success'
                      : 'invoice-card__status'
                  }
                >
                  {selected ? '已选择' : '可开票'}
                </Text>
              </View>
              <Text className='invoice-card__desc'>储值卡（预存卡）</Text>
              <View className='invoice-card__meta'>
                <Text className='invoice-card__time'>
                  充值时间 {item.businessTime}
                </Text>
                <Text className='invoice-card__amount'>
                  {getMoneyText(item.amount)}
                </Text>
              </View>
              <View className='invoice-card__actions'>
                <View
                  className={
                    selected
                      ? 'invoice-card__button invoice-card__button--ghost'
                      : 'invoice-card__button'
                  }
                  onClick={() => props.onToggle(item)}
                >
                  <Text
                    className={
                      selected
                        ? 'invoice-card__button-text invoice-card__button-text--ghost'
                        : 'invoice-card__button-text'
                    }
                  >
                    {selected ? '取消选择' : '选择'}
                  </Text>
                </View>
              </View>
            </View>
          )
        })}

        {!props.ecards.length && !props.loading && (
          <InvoiceEmpty
            title={props.errorMessage || '暂无储值卡开票记录'}
            summary='储值卡充值业务按规则开具电子普票，支付快件费用环节不重复开票。'
          />
        )}
      </View>
    </>
  )
}
