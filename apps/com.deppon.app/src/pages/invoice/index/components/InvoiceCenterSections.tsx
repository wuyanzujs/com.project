import { Input, Text, View } from '@tarojs/components'

import type {
  InvoiceHistoryView,
  InvoiceOrderView,
  InvoiceTab,
  InvoiceTaxpayerView
} from '../../../../services/invoice'

import '../index.scss'

export interface InvoiceTabItem {
  label: string
  value: InvoiceTab
}

function getMoneyText(value: number) {
  if (!Number.isFinite(value)) {
    return '¥0'
  }

  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`
}

function getStatusClassName(base: string, statusClass: string) {
  return `${base} ${base}--${statusClass.toLowerCase()}`
}

export function InvoiceHeader() {
  return (
    <View className='invoice-header'>
      <Text className='invoice-header__label'>Invoice</Text>
      <Text className='invoice-header__title'>发票中心</Text>
      <Text className='invoice-header__summary'>
        支持可开票运单、储值卡开票、开票历史、发票预览和抬头管理。
      </Text>
    </View>
  )
}

export function InvoiceTabs(props: {
  tabs: InvoiceTabItem[]
  activeTab: InvoiceTab
  onChange: (tab: InvoiceTab) => void
}) {
  return (
    <View className='invoice-tabs'>
      {props.tabs.map((item) => (
        <View
          className={
            item.value === props.activeTab
              ? 'invoice-tab invoice-tab--active'
              : 'invoice-tab'
          }
          key={item.value}
          onClick={() => props.onChange(item.value)}
        >
          <Text
            className={
              item.value === props.activeTab
                ? 'invoice-tab__text invoice-tab__text--active'
                : 'invoice-tab__text'
            }
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function InvoiceSearchBar(props: {
  placeholder: string
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  onClear: () => void
  onScan?: () => void
}) {
  return (
    <View className='invoice-search'>
      <Input
        className='invoice-search__input'
        placeholder={props.placeholder}
        value={props.value}
        onInput={(event) => props.onChange(event.detail.value)}
      />
      <View className='invoice-search__button' onClick={props.onSearch}>
        <Text className='invoice-search__button-text'>搜索</Text>
      </View>
      {props.onScan && (
        <View className='invoice-search__scan' onClick={props.onScan}>
          <Text className='invoice-search__scan-text'>扫码</Text>
        </View>
      )}
      {props.value && (
        <View className='invoice-search__clear' onClick={props.onClear}>
          <Text className='invoice-search__clear-text'>清除</Text>
        </View>
      )}
    </View>
  )
}

export function InvoiceSummary(props: {
  title: string
  countText: string
  hintText?: string
  inside?: boolean
  actionText?: string
  onAction?: () => void
}) {
  return (
    <View
      className={
        props.inside
          ? 'invoice-summary invoice-summary--inside'
          : 'invoice-summary'
      }
    >
      <View>
        <Text className='invoice-summary__title'>{props.title}</Text>
        <Text className='invoice-summary__count'>{props.countText}</Text>
      </View>
      {props.actionText ? (
        <View className='invoice-summary__button' onClick={props.onAction}>
          <Text className='invoice-summary__button-text'>
            {props.actionText}
          </Text>
        </View>
      ) : (
        <Text className='invoice-summary__hint'>{props.hintText || ''}</Text>
      )}
    </View>
  )
}

export function InvoiceEmpty(props: { title: string; summary: string }) {
  return (
    <View className='invoice-empty'>
      <Text className='invoice-empty__title'>{props.title}</Text>
      <Text className='invoice-empty__summary'>{props.summary}</Text>
    </View>
  )
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
              <View
                className={
                  item.canApply
                    ? 'invoice-card__button'
                    : 'invoice-card__button invoice-card__button--disabled'
                }
                onClick={() => props.onApply(item)}
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
              </View>
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
              <View
                className='invoice-card__button invoice-card__button--ghost'
                onClick={() => props.onOpenDetail(item)}
              >
                <Text className='invoice-card__button-text invoice-card__button-text--ghost'>
                  查看详情
                </Text>
              </View>
              <View
                className={
                  item.canPreview
                    ? 'invoice-card__button'
                    : 'invoice-card__button invoice-card__button--disabled'
                }
                onClick={() => props.onPreview(item)}
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
              </View>
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
          summary='合同客户和抬头新增/编辑规则较多，后续单独迁移抬头管理页。'
        />
      )}
    </View>
  )
}

export function InvoiceLoading(props: { tab: InvoiceTab }) {
  return (
    <Text className='invoice-loading'>
      {props.tab === 'orders'
        ? '正在加载可开票运单...'
        : props.tab === 'ecards'
          ? '正在加载储值卡开票记录...'
        : props.tab === 'history'
          ? '正在加载开票历史...'
          : '正在加载发票抬头...'}
    </Text>
  )
}
