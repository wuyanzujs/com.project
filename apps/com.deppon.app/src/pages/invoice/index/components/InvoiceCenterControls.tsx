import { Input, Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import type { InvoiceTab } from '../../../../services/invoice'

import './InvoiceCenterControls.scss'

export interface InvoiceTabItem {
  label: string
  value: InvoiceTab
}

export function InvoiceTabs(props: {
  tabs: InvoiceTabItem[]
  activeTab: InvoiceTab
  onChange: (tab: InvoiceTab) => void
}) {
  return (
    <View className='invoice-tabs'>
      {props.tabs.map(item => (
        <AppPressable
          accessibilityLabel={item.label}
          className={
            item.value === props.activeTab
              ? 'invoice-tab invoice-tab--active'
              : 'invoice-tab'
          }
          key={item.value}
          onPress={() => props.onChange(item.value)}
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
        </AppPressable>
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
        onInput={event => props.onChange(event.detail.value)}
      />
      <AppPressable
        accessibilityLabel='搜索发票'
        className='invoice-search__button'
        onPress={props.onSearch}
      >
        <Text className='invoice-search__button-text'>搜索</Text>
      </AppPressable>
      {props.onScan && (
        <AppPressable
          accessibilityLabel='扫码搜索发票'
          className='invoice-search__scan'
          onPress={props.onScan}
        >
          <Text className='invoice-search__scan-text'>扫码</Text>
        </AppPressable>
      )}
      {props.value && (
        <AppPressable
          accessibilityLabel='清除发票搜索'
          className='invoice-search__clear'
          onPress={props.onClear}
        >
          <Text className='invoice-search__clear-text'>清除</Text>
        </AppPressable>
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
        <AppPressable
          accessibilityLabel={props.actionText}
          className='invoice-summary__button'
          onPress={props.onAction}
        >
          <Text className='invoice-summary__button-text'>
            {props.actionText}
          </Text>
        </AppPressable>
      ) : (
        <Text className='invoice-summary__hint'>{props.hintText || ''}</Text>
      )}
    </View>
  )
}
