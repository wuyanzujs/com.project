import { Text, View } from '@tarojs/components'

import {
  InvoiceSearchBar,
  InvoiceSummary
} from './InvoiceCenterControls'
import { InvoiceEmpty } from './InvoiceCenterStates'
import { AppPressable } from '../../../../shared/components'

import type {
  InvoiceHistoryView,
  InvoiceOrderView,
  InvoiceTaxpayerView
} from '../../../../services/invoice'

import './InvoiceCenterCards.scss'

export { InvoiceTabs } from './InvoiceCenterControls'
export type { InvoiceTabItem } from './InvoiceCenterControls'
export { InvoiceLoading } from './InvoiceCenterStates'

function getMoneyText(value: number) {
  if (!Number.isFinite(value)) {
    return '¥0'
  }

  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`
}

function getStatusClassName(base: string, statusClass: string) {
  return `${base} ${base}--${statusClass.toLowerCase()}`
}

export function InvoiceOrdersPanel(props: {
  orders: InvoiceOrderView[]
  totalRows: number
  keyword: string
  loading: boolean
  errorMessage: string
  onKeywordChange: (value: string) => void
  onSearch: () => void
  onClear: () => void
  onScan: () => void
  onApply: (order: InvoiceOrderView) => void
}) {
  const searching = props.keyword.trim() !== ''

  return (
    <>
      <InvoiceSearchBar
        placeholder='输入运单号搜索可开票记录'
        value={props.keyword}
        onChange={props.onKeywordChange}
        onSearch={props.onSearch}
        onClear={props.onClear}
        onScan={props.onScan}
      />
      <InvoiceSummary
        title={searching ? '运单搜索结果' : '近三个月运单'}
        countText={`共 ${props.totalRows} 条可查询记录`}
        hintText={searching ? '搜索结果' : '支持分页加载'}
      />

      <View className='invoice-content'>
        {props.orders.map((item) => (
          <View className='invoice-card' key={item.id || item.waybillNumber}>
            <View className='invoice-card__top'>
              <Text className='invoice-card__number'>
                运单 {item.waybillNumber || '--'}
              </Text>
              <Text
                className={getStatusClassName(
                  'invoice-card__status',
                  item.statusClass
                )}
              >
                {item.statusText}
              </Text>
            </View>
            <View className='invoice-route'>
              <Text className='invoice-route__text'>
                {item.senderText || '--'}
              </Text>
              <Text className='invoice-route__arrow'>→</Text>
              <Text className='invoice-route__text invoice-route__text--right'>
                {item.consigneeText || '--'}
              </Text>
            </View>
            <View className='invoice-card__meta'>
              <Text className='invoice-card__time'>{item.businessTime}</Text>
              <Text className='invoice-card__amount'>
                {getMoneyText(item.amount)}
              </Text>
            </View>
            {item.pendingPayment && (
              <Text className='invoice-card__warning'>
                仍有待支付金额 {getMoneyText(item.unpaidAmount)}
              </Text>
            )}
            <View className='invoice-card__actions'>
              <AppPressable
                accessibilityLabel={item.canApply ? '申请发票' : item.statusText}
                allowDisabledPress={!item.canApply}
                disabled={!item.canApply}
                className={
                  item.canApply
                    ? 'invoice-card__button'
                    : 'invoice-card__button invoice-card__button--disabled'
                }
                onPress={() => props.onApply(item)}
              >
                <Text
                  className={
                    item.canApply
                      ? 'invoice-card__button-text'
                      : 'invoice-card__button-text invoice-card__button-text--disabled'
                  }
                >
                  {item.canApply ? '申请发票' : item.statusText}
                </Text>
              </AppPressable>
            </View>
          </View>
        ))}

        {!props.orders.length && !props.loading && (
          <InvoiceEmpty
            title={props.errorMessage || '暂无可开票运单'}
            summary='可按运单号搜索可开票记录，需身份校验的运单会按后端规则拦截。'
          />
        )}
      </View>
    </>
  )
}

export function InvoiceHistoryPanel(props: {
  history: InvoiceHistoryView[]
  totalRows: number
  keyword: string
  loading: boolean
  errorMessage: string
  onKeywordChange: (value: string) => void
  onSearch: () => void
  onClear: () => void
  onScan: () => void
  onOpenDetail: (item: InvoiceHistoryView) => void
  onPreview: (item: InvoiceHistoryView) => void
}) {
  return (
    <>
      <InvoiceSearchBar
        placeholder='输入运单号搜索开票历史'
        value={props.keyword}
        onChange={props.onKeywordChange}
        onSearch={props.onSearch}
        onClear={props.onClear}
        onScan={props.onScan}
      />
      <InvoiceSummary
        title='近一年历史'
        countText={`共 ${props.totalRows} 条开票记录`}
        hintText={props.keyword ? '搜索结果' : '支持分页加载'}
      />

      <View className='invoice-content'>
        {props.history.map((item) => (
          <View className='invoice-card' key={item.id}>
            <View className='invoice-card__top'>
              <Text className='invoice-card__number'>{item.title}</Text>
              <Text
                className={getStatusClassName(
                  'invoice-card__status',
                  item.statusClass
                )}
              >
                {item.statusText}
              </Text>
            </View>
            <Text className='invoice-card__desc'>
              {item.typeText} · {item.applyTime}
            </Text>
            <Text className='invoice-card__desc'>
              邮箱 {item.email || '--'}
            </Text>
            <View className='invoice-card__meta'>
              <Text className='invoice-card__time'>
                {item.taxNumber || '无税号'}
              </Text>
              <Text className='invoice-card__amount'>
                {getMoneyText(item.amount)}
              </Text>
            </View>
            <View className='invoice-card__actions'>
              <AppPressable
                accessibilityLabel='查看发票详情'
                className='invoice-card__button invoice-card__button--ghost'
                onPress={() => props.onOpenDetail(item)}
              >
                <Text className='invoice-card__button-text invoice-card__button-text--ghost'>
                  查看详情
                </Text>
              </AppPressable>
              <AppPressable
                accessibilityLabel={item.canPreview ? '预览发票' : '暂无预览'}
                allowDisabledPress={!item.canPreview}
                disabled={!item.canPreview}
                className={
                  item.canPreview
                    ? 'invoice-card__button'
                    : 'invoice-card__button invoice-card__button--disabled'
                }
                onPress={() => props.onPreview(item)}
              >
                <Text
                  className={
                    item.canPreview
                      ? 'invoice-card__button-text'
                      : 'invoice-card__button-text invoice-card__button-text--disabled'
                  }
                >
                  {item.canPreview ? '预览发票' : '暂无预览'}
                </Text>
              </AppPressable>
            </View>
          </View>
        ))}

        {!props.history.length && !props.loading && (
          <InvoiceEmpty
            title={props.errorMessage || '暂无开票历史'}
            summary='可按运单号搜索历史开票记录，也可扫描德邦面单上的条形码或二维码。'
          />
        )}
      </View>
    </>
  )
}

export function InvoiceTaxpayersPanel(props: {
  taxpayers: InvoiceTaxpayerView[]
  loading: boolean
  errorMessage: string
  onManage: () => void
}) {
  return (
    <View className='invoice-content'>
      <InvoiceSummary
        inside
        title='发票抬头'
        countText={`共 ${props.taxpayers.length} 条抬头`}
        actionText='管理'
        onAction={props.onManage}
      />

      {props.taxpayers.map((item) => (
        <View className='invoice-card' key={item.id}>
          <View className='invoice-card__top'>
            <Text className='invoice-card__number'>{item.name || '--'}</Text>
            {item.isDefault && (
              <Text className='invoice-card__status invoice-card__status--success'>
                默认
              </Text>
            )}
          </View>
          <Text className='invoice-card__desc'>{item.typeText}</Text>
          <Text className='invoice-card__desc'>
            税号 {item.taxNumber || '--'}
          </Text>
          <Text className='invoice-card__desc'>电话 {item.phone || '--'}</Text>
          <Text className='invoice-card__desc'>
            地址 {item.address || '--'}
          </Text>
          {(item.bank || item.bankAccount) && (
            <Text className='invoice-card__desc'>
              银行 {item.bank || '--'} {item.bankAccount || ''}
            </Text>
          )}
        </View>
      ))}

      {!props.taxpayers.length && !props.loading && (
        <InvoiceEmpty
          title={props.errorMessage || '暂无发票抬头'}
          summary='可前往发票抬头页面新增或管理常用抬头。'
        />
      )}
    </View>
  )
}
