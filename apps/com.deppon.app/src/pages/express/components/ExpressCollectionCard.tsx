import { Input, Text, View } from '@tarojs/components'

import { useEffect, useState } from 'react'

import {
  EXPRESS_COLLECTION_OPTIONS,
  getExpressCollectionFee,
  getExpressCollectionOption,
  maskExpressCollectionAccount,
  normalizeExpressCollectionAmountInput,
  parseExpressCollectionAmount
} from '../../../services/express'
import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import type { ExpressDraft } from '../../../services/express'
import type { ExpressCollectionController } from '../hooks/useExpressCollection'

import './ExpressCollectionCard.scss'
import './ExpressCollectionDetails.scss'

interface ExpressCollectionCardProps {
  collection: ExpressDraft['collection']
  controller: ExpressCollectionController
  selectedProduct: ExpressDraft['selectedProduct']
}

function formatMoney(value: number | null) {
  if (value === null) {
    return '--'
  }

  return `¥${value.toFixed(2)}`
}

export function ExpressCollectionCard({
  collection,
  controller,
  selectedProduct
}: ExpressCollectionCardProps) {
  const enabled = Boolean(collection.type)
  const selectedOption = getExpressCollectionOption(collection.type)
  const accountText = maskExpressCollectionAccount(collection.account)
  const collectionFee = getExpressCollectionFee(selectedProduct)
  const [amountText, setAmountText] = useState(
    collection.amount > 0 ? String(collection.amount) : ''
  )

  useEffect(() => {
    setAmountText(current => {
      if (!enabled) {
        return ''
      }

      if (
        current &&
        parseExpressCollectionAmount(current) === collection.amount
      ) {
        return current
      }

      return collection.amount > 0 ? String(collection.amount) : ''
    })
  }, [collection.amount, enabled])

  const handleAmountInput = (value: string) => {
    const normalized = normalizeExpressCollectionAmountInput(value)

    setAmountText(normalized)
    controller.onAmountChange(normalized)
  }

  return (
    <View className='express-collection'>
      <View className='express-collection__header'>
        <View className='express-collection__header-content'>
          <Text className='express-option-title'>代收货款</Text>
          <Text className='express-collection__summary'>
            {enabled
              ? `${selectedOption.label} · ${collection.amount || 0} 元`
              : '由快递员向收件人代收货款并返款'}
          </Text>
        </View>
        <AppPressable
          accessibilityLabel={enabled ? '关闭代收货款' : '开启代收货款'}
          className='express-collection-toggle'
          selected={enabled}
          onPress={enabled ? controller.onClear : controller.onEnable}
        >
          <View
            className={
              enabled
                ? 'express-collection-toggle__track express-collection-toggle__track--active'
                : 'express-collection-toggle__track'
            }
          >
            <View className='express-collection-toggle__thumb' />
          </View>
        </AppPressable>
      </View>

      {enabled ? (
        <>
          <View className='express-collection__field'>
            <Text className='express-collection__label'>返款类型</Text>
            <View className='express-chip-group express-chip-group--wrap'>
              {EXPRESS_COLLECTION_OPTIONS.map(option => (
                <AppPressable
                  accessibilityLabel={`选择${option.label}`}
                  className={
                    collection.type === option.value
                      ? 'express-chip express-chip--wrap express-chip--active'
                      : 'express-chip express-chip--wrap'
                  }
                  key={option.value}
                  selected={collection.type === option.value}
                  onPress={() => controller.onTypeChange(option.value)}
                >
                  <Text
                    className={
                      collection.type === option.value
                        ? 'express-chip__text express-chip__text--active'
                        : 'express-chip__text'
                    }
                  >
                    {option.label}
                  </Text>
                </AppPressable>
              ))}
            </View>
            <Text className='express-collection__hint'>
              {selectedOption.summary}
            </Text>
          </View>

          <View className='express-collection__field'>
            <View className='express-collection__field-head'>
              <Text className='express-collection__label'>代收金额</Text>
              <Text className='express-collection__limit'>
                上限 {collection.limit} 元
              </Text>
            </View>
            <View className='express-collection-amount'>
              <Text className='express-collection-amount__currency'>¥</Text>
              <Input
                className='express-collection-amount__input'
                maxlength={11}
                placeholder='请输入代收金额'
                style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
                type='digit'
                value={amountText}
                onInput={event => handleAmountInput(event.detail.value)}
              />
            </View>
          </View>

          <AppPressable
            accessibilityLabel='选择代收货款收款账户'
            block
            className='express-collection-account'
            layout='row-start'
            onPress={controller.onOpenAccount}
          >
            <View className='express-collection-account__content'>
              <Text className='express-collection__label'>收款账户</Text>
              <Text className='express-collection-account__value'>
                {accountText
                  ? `${collection.accountName} ${accountText}`
                  : '请选择已审核通过的账户'}
              </Text>
            </View>
            <AppIcon
              color={APP_STYLE_COLORS.text.supporting}
              name='chevronRight'
              size={APP_NATIVE_TOKENS.icon.small}
            />
          </AppPressable>

          <View className='express-collection__fee-row'>
            <Text className='express-collection__fee-label'>预计代收手续费</Text>
            <Text className='express-collection__fee-value'>
              {formatMoney(collectionFee)}
            </Text>
          </View>

          <View className='express-collection-agreement'>
            <AppPressable
              accessibilityLabel={
                collection.agreementAccepted
                  ? '取消同意代收货款服务协议'
                  : '同意代收货款服务协议'
              }
              className='express-collection-agreement__check'
              layout='row-start'
              selected={collection.agreementAccepted}
              onPress={controller.onToggleAgreement}
            >
              <View
                className={
                  collection.agreementAccepted
                    ? 'express-collection-agreement__box express-collection-agreement__box--checked'
                    : 'express-collection-agreement__box'
                }
              >
                <Text className='express-collection-agreement__mark'>
                  {collection.agreementAccepted ? '✓' : ''}
                </Text>
              </View>
              <Text className='express-collection-agreement__text'>
                已阅读并同意代收货款服务协议
              </Text>
            </AppPressable>
            <AppPressable
              accessibilityLabel='查看代收货款服务协议'
              className='express-collection-agreement__rules'
              onPress={controller.onOpenRules}
            >
              <Text className='express-collection-agreement__rules-text'>
                查看
              </Text>
            </AppPressable>
          </View>

          {(controller.capabilityLoading ||
            controller.capabilityMessage) && (
            <View className='express-collection-message'>
              <Text className='express-collection-message__text'>
                {controller.capabilityLoading
                  ? '正在同步代收货款额度'
                  : controller.capabilityMessage}
              </Text>
              {!controller.capabilityLoading && (
                <AppPressable
                  accessibilityLabel='刷新代收货款额度'
                  className='express-collection-message__action'
                  onPress={controller.onRefreshCapability}
                >
                  <Text className='express-collection-message__action-text'>
                    刷新
                  </Text>
                </AppPressable>
              )}
            </View>
          )}
        </>
      ) : null}
    </View>
  )
}
