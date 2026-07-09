import { Input, Text, View } from '@tarojs/components'

import type {
  OrderPaymentFilter,
  OrderRole,
  OrderStatusFilter
} from '../../../../services/order'

export type OrderDateRangeDays = 7 | 30 | 90

export interface OrderFilterOption<TValue extends string | number> {
  label: string
  value: TValue
}

const ORDER_TABS: Array<OrderFilterOption<OrderRole>> = [
  {
    label: '我寄的',
    value: 'sender'
  },
  {
    label: '我收的',
    value: 'receive'
  }
]

const ORDER_STATUS_OPTIONS: Array<OrderFilterOption<OrderStatusFilter>> = [
  {
    label: '全部',
    value: ''
  },
  {
    label: '待揽件',
    value: 'RECEIPTING'
  },
  {
    label: '运输中',
    value: 'IN_TRANSIT'
  },
  {
    label: '已签收',
    value: 'SIGN'
  },
  {
    label: '已取消',
    value: 'CANCEL'
  },
  {
    label: '已作废',
    value: 'INVALID'
  }
]

const ORDER_PAYMENT_OPTIONS: Array<OrderFilterOption<OrderPaymentFilter>> = [
  {
    label: '全部',
    value: ''
  },
  {
    label: '现付',
    value: 'MP'
  },
  {
    label: '到付',
    value: 'FC'
  },
  {
    label: '月结',
    value: 'CT'
  }
]

const ORDER_DATE_RANGE_OPTIONS: Array<
  OrderFilterOption<OrderDateRangeDays>
> = [
  {
    label: '近7天',
    value: 7
  },
  {
    label: '近30天',
    value: 30
  },
  {
    label: '近90天',
    value: 90
  }
]

function getDateRangeTitle(days: OrderDateRangeDays) {
  if (days === 7) {
    return '最近7天'
  }

  if (days === 90) {
    return '最近90天'
  }

  return '最近一个月'
}

function getFilterChipClassName(active: boolean) {
  return active
    ? 'order-filter__chip order-filter__chip--active'
    : 'order-filter__chip'
}

function getFilterChipTextClassName(active: boolean) {
  return active
    ? 'order-filter__chip-text order-filter__chip-text--active'
    : 'order-filter__chip-text'
}

function OrderFilterGroup<TValue extends string | number>(props: {
  options: Array<OrderFilterOption<TValue>>
  value: TValue
  getKey?: (value: TValue) => string
  onChange: (value: TValue) => void
}) {
  return (
    <View className='order-filter'>
      {props.options.map((option) => {
        const active = option.value === props.value

        return (
          <View
            className={getFilterChipClassName(active)}
            key={
              props.getKey ? props.getKey(option.value) : String(option.value)
            }
            onClick={() => props.onChange(option.value)}
          >
            <Text className={getFilterChipTextClassName(active)}>
              {option.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export function OrderListHeader() {
  return (
    <View className='order-list-header'>
      <Text className='order-list-header__label'>Order</Text>
      <Text className='order-list-header__title'>查快递</Text>
      <Text className='order-list-header__summary'>
        先承接寄件和收件订单的基础查询、搜索和详情跳转，支付、订阅和售后动作后置。
      </Text>
    </View>
  )
}

export function OrderRoleTabs(props: {
  role: OrderRole
  onChange: (role: OrderRole) => void
}) {
  return (
    <View className='order-tabs'>
      {ORDER_TABS.map((tab) => (
        <View
          className={
            tab.value === props.role ? 'order-tab order-tab--active' : 'order-tab'
          }
          key={tab.value}
          onClick={() => props.onChange(tab.value)}
        >
          <Text
            className={
              tab.value === props.role
                ? 'order-tab__text order-tab__text--active'
                : 'order-tab__text'
            }
          >
            {tab.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function OrderSearchBar(props: {
  keyword: string
  onKeywordChange: (keyword: string) => void
  onSearch: () => void
}) {
  return (
    <View className='order-search'>
      <Input
        className='order-search__input'
        placeholder='订单号、运单号、姓名'
        value={props.keyword}
        onInput={(event) => props.onKeywordChange(event.detail.value)}
      />
      <View className='order-search__button' onClick={props.onSearch}>
        <Text className='order-search__button-text'>搜索</Text>
      </View>
    </View>
  )
}

export function OrderFilterPanel(props: {
  rangeDays: OrderDateRangeDays
  orderStatus: OrderStatusFilter
  paymentType: OrderPaymentFilter
  onRangeChange: (days: OrderDateRangeDays) => void
  onStatusChange: (status: OrderStatusFilter) => void
  onPaymentChange: (paymentType: OrderPaymentFilter) => void
}) {
  return (
    <View className='order-filter-panel'>
      <Text className='order-filter-panel__label'>时间</Text>
      <OrderFilterGroup
        options={ORDER_DATE_RANGE_OPTIONS}
        value={props.rangeDays}
        onChange={props.onRangeChange}
      />

      <Text className='order-filter-panel__label'>状态</Text>
      <OrderFilterGroup
        options={ORDER_STATUS_OPTIONS}
        value={props.orderStatus}
        getKey={(value) => value || 'all'}
        onChange={props.onStatusChange}
      />

      <Text className='order-filter-panel__label'>付款</Text>
      <OrderFilterGroup
        options={ORDER_PAYMENT_OPTIONS}
        value={props.paymentType}
        getKey={(value) => value || 'all'}
        onChange={props.onPaymentChange}
      />
    </View>
  )
}

export function OrderListSummary(props: {
  rangeDays: OrderDateRangeDays
  totalRows: number
  onOpenPaymentList: () => void
}) {
  return (
    <View className='order-list-summary'>
      <Text className='order-list-summary__title'>
        {getDateRangeTitle(props.rangeDays)}
      </Text>
      <View className='order-list-summary__side'>
        <Text className='order-list-summary__count'>共 {props.totalRows} 单</Text>
        <View
          className='order-list-summary__pay'
          onClick={props.onOpenPaymentList}
        >
          <Text className='order-list-summary__pay-text'>待支付</Text>
        </View>
      </View>
    </View>
  )
}
