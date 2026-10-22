import { Input, Text, View } from '@tarojs/components'

import type { OrderPaymentFilter, OrderRole, OrderStatusFilter } from '@/services/order'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import '../OrderListTabsSearch.scss'
import '../OrderListFilters.scss'

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
    label: '待揽收',
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

const ORDER_DATE_RANGE_OPTIONS: Array<OrderFilterOption<OrderDateRangeDays>> = [
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

function getFilterChipClassName(active: boolean) {
  return active ? 'order-filter__chip order-filter__chip--active' : 'order-filter__chip'
}

function getFilterChipTextClassName(active: boolean) {
  return active ? 'order-filter__chip-text order-filter__chip-text--active' : 'order-filter__chip-text'
}

function OrderFilterGroup<TValue extends string | number>(props: {
  options: Array<OrderFilterOption<TValue>>
  value: TValue
  getKey?: (value: TValue) => string
  onChange: (value: TValue) => void
}) {
  return (
    <View className='order-filter'>
      {props.options.map(option => {
        const active = option.value === props.value

        return (
          <AppPressable
            accessibilityLabel={option.label}
            className={getFilterChipClassName(active)}
            key={props.getKey ? props.getKey(option.value) : String(option.value)}
            onPress={() => props.onChange(option.value)}
          >
            <Text className={getFilterChipTextClassName(active)}>{option.label}</Text>
          </AppPressable>
        )
      })}
    </View>
  )
}

export function OrderRoleTabs(props: {
  role: OrderRole
  activeCount: number
  onChange: (role: OrderRole) => void
  onOpenPayment: () => void
  onOpenSubscriptions: () => void
  onShare: () => void
}) {
  return (
    <View className='order-tabs'>
      {ORDER_TABS.map(tab => {
        const active = tab.value === props.role
        const label = active && props.activeCount > 0 ? `${tab.label} ${props.activeCount}` : tab.label

        return (
          <AppPressable
            flex
            accessibilityLabel={tab.label}
            className={active ? 'order-tab order-tab--active' : 'order-tab'}
            key={tab.value}
            onPress={() => props.onChange(tab.value)}
          >
            <Text className={active ? 'order-tab__text order-tab__text--active' : 'order-tab__text'}>{label}</Text>
            {active && <View className='order-tab__indicator' />}
          </AppPressable>
        )
      })}
      <AppPressable flex accessibilityLabel='待支付' className='order-tab' onPress={props.onOpenPayment}>
        <Text className='order-tab__text'>待支付</Text>
      </AppPressable>
      <AppPressable flex accessibilityLabel='关注运单' className='order-tab' onPress={props.onOpenSubscriptions}>
        <Text className='order-tab__text'>关注</Text>
      </AppPressable>
      <AppPressable accessibilityLabel='分享订单列表' className='order-tabs__share' onPress={props.onShare}>
        <AppIcon color={APP_STYLE_COLORS.text.heading} name='redo' size={44} />
      </AppPressable>
    </View>
  )
}

export function OrderSearchBar(props: {
  keyword: string
  filterVisible: boolean
  onKeywordChange: (keyword: string) => void
  onSearch: () => void
  onToggleFilter: () => void
}) {
  return (
    <View className='order-search'>
      <View className='order-search__field'>
        <AppIcon color={APP_STYLE_COLORS.text.placeholder} name='search' size={28} />
        <Input
          className='order-search__input'
          placeholder='运单号/姓名/手机/城市查询'
          value={props.keyword}
          onConfirm={props.onSearch}
          onInput={event => props.onKeywordChange(event.detail.value)}
        />
        <AppPressable accessibilityLabel='搜索订单' className='order-search__submit' onPress={props.onSearch}>
          <AppIcon color={APP_STYLE_COLORS.text.placeholder} name='scan' size={28} />
        </AppPressable>
      </View>
      <AppPressable accessibilityLabel='筛选订单' className='order-search__filter' onPress={props.onToggleFilter}>
        <Text className='order-search__filter-text'>筛选</Text>
        <AppIcon color={props.filterVisible ? APP_STYLE_COLORS.brand.default : APP_STYLE_COLORS.text.body} name='filter' size={26} />
      </AppPressable>
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
      <OrderFilterGroup options={ORDER_DATE_RANGE_OPTIONS} value={props.rangeDays} onChange={props.onRangeChange} />

      <Text className='order-filter-panel__label'>状态</Text>
      <OrderFilterGroup options={ORDER_STATUS_OPTIONS} value={props.orderStatus} getKey={value => value || 'all'} onChange={props.onStatusChange} />

      <Text className='order-filter-panel__label'>付款</Text>
      <OrderFilterGroup options={ORDER_PAYMENT_OPTIONS} value={props.paymentType} getKey={value => value || 'all'} onChange={props.onPaymentChange} />
    </View>
  )
}
