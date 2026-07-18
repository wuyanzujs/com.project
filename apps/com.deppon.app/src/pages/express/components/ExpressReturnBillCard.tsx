import { Input, Text, View } from '@tarojs/components'

import {
  EXPRESS_RETURN_BILL_COUNT_MAX,
  EXPRESS_RETURN_BILL_COUNT_MIN,
  expressReturnBillOptions,
  expressReturnBillRequirementOptions,
  getExpressReturnBillOptions,
  isExpressCloudSignType,
  isExpressPaperReturnBillType
} from '../../../services/express'
import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import type {
  ExpressReturnBillDraft,
  ExpressReturnBillRequirement
} from '../../../services/express'

import './ExpressReturnBillCard.scss'

interface ExpressReturnBillCardProps {
  productCode: string
  returnBill: ExpressReturnBillDraft
  onChange: (patch: Partial<ExpressReturnBillDraft>) => void
  onOpenCloudSign: () => void
}

export function ExpressReturnBillCard({
  productCode,
  returnBill,
  onChange,
  onOpenCloudSign
}: ExpressReturnBillCardProps) {
  const availableOptions = getExpressReturnBillOptions(productCode)
  const selectedOption =
    availableOptions.find(option => option.value === returnBill.type) ??
    expressReturnBillOptions[0]
  const enabled = returnBill.type !== 'NO_RETURN_SIGNED'
  const cloudSign = isExpressCloudSignType(returnBill.type)
  const paperReturn = isExpressPaperReturnBillType(returnBill.type)

  const toggleRequirement = (code: ExpressReturnBillRequirement) => {
    const requirements = returnBill.requirements.includes(code)
      ? returnBill.requirements.filter(item => item !== code)
      : [...returnBill.requirements, code]

    onChange({ requirements })
  }

  return (
    <View className='express-return-bill'>
      <View className='express-return-bill__header'>
        <View className='express-return-bill__header-content'>
          <Text className='express-option-title'>签收单返单</Text>
          <Text className='express-return-bill__summary'>
            {selectedOption.summary}
          </Text>
        </View>
      </View>

      <View className='express-return-bill__types'>
        {availableOptions.map(option => {
          const selected = option.value === returnBill.type

          return (
            <AppPressable
              accessibilityLabel={`选择${option.label}`}
              className={
                selected
                  ? 'express-return-bill__chip express-return-bill__chip--active'
                  : 'express-return-bill__chip'
              }
              key={option.value}
              selected={selected}
              onPress={() =>
                onChange(
                  option.value === 'NO_RETURN_SIGNED'
                    ? {
                        type: option.value,
                        requirements: [],
                        customRequirement: '',
                        fileCode: ''
                      }
                    : { type: option.value }
                )
              }
            >
              <Text
                className={
                  selected
                    ? 'express-return-bill__chip-text express-return-bill__chip-text--active'
                    : 'express-return-bill__chip-text'
                }
              >
                {option.label}
              </Text>
            </AppPressable>
          )
        })}
      </View>

      {enabled && (
        <>
          {paperReturn && (
            <>
              <Text className='express-return-bill__label'>签收单要求</Text>
              <View className='express-return-bill__requirements'>
                {expressReturnBillRequirementOptions.map(option => {
                  const selected = returnBill.requirements.includes(option.code)

                  return (
                    <AppPressable
                      accessibilityLabel={`选择${option.label}`}
                      className={
                        selected
                          ? 'express-return-bill__requirement express-return-bill__requirement--active'
                          : 'express-return-bill__requirement'
                      }
                      key={option.code}
                      selected={selected}
                      onPress={() => toggleRequirement(option.code)}
                    >
                      <Text
                        className={
                          selected
                            ? 'express-return-bill__requirement-text express-return-bill__requirement-text--active'
                            : 'express-return-bill__requirement-text'
                        }
                      >
                        {option.label}
                      </Text>
                    </AppPressable>
                  )
                })}
              </View>

              <View className='express-return-bill__custom'>
                <Text className='express-return-bill__label'>其他要求</Text>
                <Input
                  className='express-return-bill__input'
                  maxlength={20}
                  placeholder='可填写其他签收要求'
                  style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
                  value={returnBill.customRequirement}
                  onInput={event =>
                    onChange({ customRequirement: event.detail.value })
                  }
                />
              </View>

              <View className='express-return-bill__count'>
                <Text className='express-return-bill__label express-return-bill__count-label'>
                  返回张数
                </Text>
                <View className='express-return-bill__stepper'>
                  <AppPressable
                    accessibilityLabel='减少返单张数'
                    className='express-return-bill__stepper-button'
                    disabled={
                      returnBill.returnCount <= EXPRESS_RETURN_BILL_COUNT_MIN
                    }
                    onPress={() =>
                      onChange({
                        returnCount: Math.max(
                          EXPRESS_RETURN_BILL_COUNT_MIN,
                          returnBill.returnCount - 1
                        )
                      })
                    }
                  >
                    <AppIcon
                      color={APP_STYLE_COLORS.text.body}
                      name='minus'
                      size={APP_NATIVE_TOKENS.icon.small}
                    />
                  </AppPressable>
                  <Input
                    className='express-return-bill__count-input'
                    maxlength={2}
                    type='number'
                    value={String(returnBill.returnCount)}
                    onInput={event => {
                      const count = Number(event.detail.value)

                      onChange({
                        returnCount: Number.isFinite(count)
                          ? Math.min(
                              EXPRESS_RETURN_BILL_COUNT_MAX,
                              Math.max(
                                EXPRESS_RETURN_BILL_COUNT_MIN,
                                Math.trunc(count)
                              )
                            )
                          : EXPRESS_RETURN_BILL_COUNT_MIN
                      })
                    }}
                  />
                  <AppPressable
                    accessibilityLabel='增加返单张数'
                    className='express-return-bill__stepper-button'
                    disabled={
                      returnBill.returnCount >= EXPRESS_RETURN_BILL_COUNT_MAX
                    }
                    onPress={() =>
                      onChange({
                        returnCount: Math.min(
                          EXPRESS_RETURN_BILL_COUNT_MAX,
                          returnBill.returnCount + 1
                        )
                      })
                    }
                  >
                    <AppIcon
                      color={APP_STYLE_COLORS.text.body}
                      name='plus'
                      size={APP_NATIVE_TOKENS.icon.small}
                    />
                  </AppPressable>
                </View>
              </View>
            </>
          )}

          {cloudSign && (
            <AppPressable
              accessibilityLabel='前往电子云签'
              block
              className='express-return-bill__cloud'
              layout='row-start'
              onPress={onOpenCloudSign}
            >
              <View className='express-return-bill__cloud-content'>
                <Text className='express-return-bill__label'>电子云签</Text>
                <Text className='express-return-bill__cloud-status'>
                  {returnBill.fileCode ? '已完成签署，可继续下单' : '尚未完成签署'}
                </Text>
              </View>
              <AppIcon
                color={APP_STYLE_COLORS.text.supporting}
                name='chevronRight'
                size={APP_NATIVE_TOKENS.icon.small}
              />
            </AppPressable>
          )}
        </>
      )}
    </View>
  )
}
