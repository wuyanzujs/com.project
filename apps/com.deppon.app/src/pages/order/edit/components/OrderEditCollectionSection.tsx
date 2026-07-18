import { Input, Text, View } from '@tarojs/components'

import { useEffect, useState } from 'react'

import {
  maskOrderEditCollectionAccount,
  normalizeOrderEditCollectionAmountInput,
  ORDER_EDIT_COLLECTION_OPTIONS,
  parseOrderEditCollectionAmount
} from '../../../../services/order'
import { AppPressable } from '../../../../shared/components'
import { AppIcon } from '../../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../../styles/nativeTokens'

import type { OrderEditCollectionDraft } from '../../../../services/order'
import type { OrderEditCollectionController } from '../hooks/useOrderEditCollection'

import './OrderEditCollectionSection.scss'
import './OrderEditCollectionDetails.scss'
import './OrderEditSection.scss'

interface OrderEditCollectionSectionProps {
  collection: OrderEditCollectionDraft
  controller: OrderEditCollectionController
}

export function OrderEditCollectionSection({
  collection,
  controller
}: OrderEditCollectionSectionProps) {
  const [amountText, setAmountText] = useState(
    collection.amount > 0 ? String(collection.amount) : ''
  )
  const selectedOption =
    ORDER_EDIT_COLLECTION_OPTIONS.find(
      option => option.value === collection.type
    ) ?? ORDER_EDIT_COLLECTION_OPTIONS[0]
  const accountText = maskOrderEditCollectionAccount(collection.account)

  useEffect(() => {
    setAmountText(current => {
      if (!collection.enabled) {
        return ''
      }

      if (
        current &&
        parseOrderEditCollectionAmount(current) === collection.amount
      ) {
        return current
      }

      return collection.amount > 0 ? String(collection.amount) : ''
    })
  }, [collection.amount, collection.enabled])

  const handleAmountInput = (value: string) => {
    const normalized = normalizeOrderEditCollectionAmountInput(value)

    setAmountText(normalized)
    controller.onAmountChange(normalized)
  }

  return (
    <View className='order-edit-section'>
      <View className='order-edit-collection__header'>
        <View className='order-edit-collection__header-content'>
          <Text className='order-edit-section__title'>代收货款</Text>
          <Text className='order-edit-collection__summary'>
            {collection.enabled
              ? selectedOption.label + ' · ' + collection.amount + ' 元'
              : '由快递员向收件人代收货款并返款'}
          </Text>
        </View>
        <AppPressable
          accessibilityLabel={
            collection.enabled ? '关闭改单代收货款' : '开启改单代收货款'
          }
          className='order-edit-collection-toggle'
          selected={collection.enabled}
          onPress={
            collection.enabled ? controller.onClear : controller.onEnable
          }
        >
          <View
            className={
              collection.enabled
                ? 'order-edit-collection-toggle__track order-edit-collection-toggle__track--active'
                : 'order-edit-collection-toggle__track'
            }
          >
            <View className='order-edit-collection-toggle__thumb' />
          </View>
        </AppPressable>
      </View>

      {collection.enabled ? (
        <View className='order-edit-collection__body'>
          <Text className='order-edit-collection__label'>返款类型</Text>
          <View className='order-edit-collection__types'>
            {ORDER_EDIT_COLLECTION_OPTIONS.map(option => {
              const selected = collection.type === option.value

              return (
                <AppPressable
                  accessibilityLabel={'选择' + option.label}
                  className={
                    selected
                      ? 'order-edit-collection-type order-edit-collection-type--active'
                      : 'order-edit-collection-type'
                  }
                  key={option.value}
                  selected={selected}
                  onPress={() => controller.onTypeChange(option.value)}
                >
                  <Text
                    className={
                      selected
                        ? 'order-edit-collection-type__text order-edit-collection-type__text--active'
                        : 'order-edit-collection-type__text'
                    }
                  >
                    {option.label}
                  </Text>
                </AppPressable>
              )
            })}
          </View>
          <Text className='order-edit-collection__hint'>
            {selectedOption.summary}
          </Text>

          <View className='order-edit-collection__amount-head'>
            <Text className='order-edit-collection__label'>代收金额</Text>
            <Text className='order-edit-collection__limit'>
              上限 {collection.limit} 元
            </Text>
          </View>
          <View className='order-edit-collection__amount'>
            <Text className='order-edit-collection__currency'>¥</Text>
            <Input
              className='order-edit-collection__input'
              maxlength={11}
              placeholder='请输入代收金额'
              style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
              type='digit'
              value={amountText}
              onInput={event => handleAmountInput(event.detail.value)}
            />
          </View>

          <AppPressable
            accessibilityLabel='选择改单代收货款收款账户'
            block
            className='order-edit-collection-account'
            layout='row-start'
            onPress={controller.onOpenAccount}
          >
            <View className='order-edit-collection-account__content'>
              <Text className='order-edit-collection__label'>收款账户</Text>
              <Text className='order-edit-collection-account__value'>
                {accountText
                  ? collection.accountName + ' ' + accountText
                  : '请选择已审核通过的账户'}
              </Text>
            </View>
            <AppIcon
              color={APP_STYLE_COLORS.text.supporting}
              name='chevronRight'
              size={APP_NATIVE_TOKENS.icon.small}
            />
          </AppPressable>

          <View className='order-edit-collection-agreement'>
            <AppPressable
              accessibilityLabel={
                collection.agreementAccepted
                  ? '取消同意代收货款服务协议'
                  : '同意代收货款服务协议'
              }
              className='order-edit-collection-agreement__check'
              layout='row-start'
              selected={collection.agreementAccepted}
              onPress={controller.onToggleAgreement}
            >
              <View
                className={
                  collection.agreementAccepted
                    ? 'order-edit-collection-agreement__box order-edit-collection-agreement__box--active'
                    : 'order-edit-collection-agreement__box'
                }
              >
                {collection.agreementAccepted ? (
                  <AppIcon
                    color={APP_STYLE_COLORS.text.inverse}
                    name='badgeCheck'
                    size={APP_NATIVE_TOKENS.icon.small}
                  />
                ) : null}
              </View>
              <Text className='order-edit-collection-agreement__text'>
                已阅读并同意代收货款服务协议
              </Text>
            </AppPressable>
            <AppPressable
              accessibilityLabel='查看代收货款服务协议'
              className='order-edit-collection-agreement__rules'
              onPress={controller.onOpenRules}
            >
              <Text className='order-edit-collection-agreement__rules-text'>
                查看
              </Text>
            </AppPressable>
          </View>

          {controller.capabilityLoading ||
          controller.capabilityMessage ? (
            <View className='order-edit-collection-message'>
              <Text className='order-edit-collection-message__text'>
                {controller.capabilityLoading
                  ? '正在同步代收货款额度'
                  : controller.capabilityMessage}
              </Text>
              {!controller.capabilityLoading ? (
                <AppPressable
                  accessibilityLabel='刷新改单代收货款额度'
                  className='order-edit-collection-message__action'
                  onPress={controller.onRefreshCapability}
                >
                  <Text className='order-edit-collection-message__action-text'>
                    刷新
                  </Text>
                </AppPressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
