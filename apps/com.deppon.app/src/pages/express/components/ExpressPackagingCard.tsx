import { Image, Text, View } from '@tarojs/components'

import { useMemo, useState } from 'react'

import { ExpressSection } from './ExpressSection'
import {
  EXPRESS_CARTON_OPTIONS,
  EXPRESS_UNPACKING_OPTIONS,
  EXPRESS_WOODEN_PACKAGING_OPTIONS,
  getExpressCartonOption,
  getExpressUnpackingOption,
  getExpressWoodenPackagingOption
} from '../../../services/express'
import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import type {
  ExpressPackagingDraft,
  ExpressUnpackingCode,
  ExpressWoodenPackagingCode
} from '../../../services/express'

import './ExpressPackagingCard.scss'
import './ExpressPackagingGroups.scss'

interface ExpressPackagingCardProps {
  packaging: ExpressPackagingDraft
  onChange: (patch: Partial<ExpressPackagingDraft>) => void
}

function getOptionClassName(selected: boolean) {
  return selected
    ? 'express-packaging-option express-packaging-option--selected'
    : 'express-packaging-option'
}

function PackagingIndicator({
  multiple = false,
  selected
}: {
  multiple?: boolean
  selected: boolean
}) {
  const className = multiple
    ? selected
      ? 'express-packaging-option__indicator express-packaging-option__indicator--multiple express-packaging-option__indicator--selected'
      : 'express-packaging-option__indicator express-packaging-option__indicator--multiple'
    : selected
      ? 'express-packaging-option__indicator express-packaging-option__indicator--selected'
      : 'express-packaging-option__indicator'

  return (
    <View className={className}>
      {selected ? (
        <AppIcon
          color={APP_STYLE_COLORS.brand.default}
          name='badgeCheck'
          size={APP_NATIVE_TOKENS.icon.small}
        />
      ) : null}
    </View>
  )
}

export function ExpressPackagingCard({
  packaging,
  onChange
}: ExpressPackagingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const selectedOption = useMemo(
    () => getExpressCartonOption(packaging.cartonCode),
    [packaging.cartonCode]
  )
  const summary = useMemo(() => {
    const names = [
      selectedOption?.name,
      ...packaging.woodenCodes.map(
        code => getExpressWoodenPackagingOption(code)?.name
      ),
      ...packaging.unpackingCodes.map(
        code => getExpressUnpackingOption(code)?.name
      )
    ].filter((name): name is string => !!name)

    if (names.length === 0) {
      return '无需包装'
    }

    return names.length <= 2 ? names.join('、') : `已选${names.length}项`
  }, [packaging.unpackingCodes, packaging.woodenCodes, selectedOption])
  const noneSelected =
    !packaging.cartonCode &&
    packaging.woodenCodes.length === 0 &&
    packaging.unpackingCodes.length === 0

  const toggleWoodenPackaging = (code: ExpressWoodenPackagingCode) => {
    const woodenCodes = packaging.woodenCodes.includes(code)
      ? packaging.woodenCodes.filter(item => item !== code)
      : [...packaging.woodenCodes, code]

    onChange({ woodenCodes })
  }

  const toggleUnpacking = (code: ExpressUnpackingCode) => {
    const unpackingCodes = packaging.unpackingCodes.includes(code)
      ? packaging.unpackingCodes.filter(item => item !== code)
      : [...packaging.unpackingCodes, code]

    onChange({ unpackingCodes })
  }

  return (
    <ExpressSection
      expanded={expanded}
      hint='选填'
      summary={summary}
      title='包装服务'
      onHeaderPress={() => setExpanded(current => !current)}
    >
      {expanded ? (
        <View className='express-packaging-list'>
          <View className='express-packaging-group__head'>
            <Text className='express-packaging-group__title'>纸箱包装</Text>
          </View>
          <AppPressable
            accessibilityLabel='选择无需包装'
            block
            className={getOptionClassName(noneSelected)}
            layout='row-start'
            selected={noneSelected}
            onPress={() =>
              noneSelected
                ? undefined
                : onChange({
                    cartonCode: '',
                    woodenCodes: [],
                    unpackingCodes: []
                  })
            }
          >
            <View className='express-packaging-option__visual express-packaging-option__visual--empty'>
              <AppIcon
                color={APP_STYLE_COLORS.text.supporting}
                name='package'
                size={APP_NATIVE_TOKENS.icon.default}
              />
            </View>
            <View className='express-packaging-option__main'>
              <Text className='express-packaging-option__name'>无需包装</Text>
              <Text className='express-packaging-option__detail'>
                使用自备包装
              </Text>
            </View>
            <PackagingIndicator selected={noneSelected} />
          </AppPressable>

          {EXPRESS_CARTON_OPTIONS.map(option => {
            const selected = packaging.cartonCode === option.code

            return (
              <AppPressable
                accessibilityLabel={'选择' + option.name}
                block
                className={getOptionClassName(selected)}
                key={option.code}
                layout='row-start'
                selected={selected}
                onPress={() =>
                  selected ? undefined : onChange({ cartonCode: option.code })
                }
              >
                <Image
                  className='express-packaging-option__visual'
                  mode='aspectFit'
                  src={option.imageUrl}
                />
                <View className='express-packaging-option__main'>
                  <View className='express-packaging-option__title-row'>
                    <Text className='express-packaging-option__name'>
                      {option.name}
                    </Text>
                    {option.tag ? (
                      <Text className='express-packaging-option__tag'>
                        {option.tag}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    className='express-packaging-option__detail'
                    numberOfLines={1}
                  >
                    {option.dimensions} · {option.suitableFor}
                  </Text>
                </View>
                <View className='express-packaging-option__aside'>
                  <Text className='express-packaging-option__price'>
                    {option.priceLabel}
                  </Text>
                  <PackagingIndicator selected={selected} />
                </View>
              </AppPressable>
            )
          })}

          <View className='express-packaging-group__head express-packaging-group__head--divided'>
            <Text className='express-packaging-group__title'>木包装</Text>
            <Text className='express-packaging-group__note'>
              价格以快递员核实为准
            </Text>
          </View>

          {EXPRESS_WOODEN_PACKAGING_OPTIONS.map(option => {
            const selected = packaging.woodenCodes.includes(option.code)
            const detail = option.minimumPriceLabel
              ? `${option.suitableFor} · ${option.minimumPriceLabel}`
              : option.suitableFor

            return (
              <AppPressable
                accessibilityLabel={`${selected ? '取消' : '选择'}${option.name}`}
                block
                className={getOptionClassName(selected)}
                key={option.code}
                layout='row-start'
                selected={selected}
                onPress={() => toggleWoodenPackaging(option.code)}
              >
                <Image
                  className='express-packaging-option__visual'
                  mode='aspectFit'
                  src={option.imageUrl}
                />
                <View className='express-packaging-option__main'>
                  <Text className='express-packaging-option__name'>
                    {option.name}
                  </Text>
                  <Text
                    className='express-packaging-option__detail'
                    numberOfLines={1}
                  >
                    {detail}
                  </Text>
                </View>
                <View className='express-packaging-option__aside'>
                  <Text className='express-packaging-option__price'>
                    {option.priceLabel}
                  </Text>
                  <PackagingIndicator multiple selected={selected} />
                </View>
              </AppPressable>
            )
          })}

          <View className='express-packaging-group__head express-packaging-group__head--divided'>
            <Text className='express-packaging-group__title'>拆包装</Text>
          </View>

          {EXPRESS_UNPACKING_OPTIONS.map(option => {
            const selected = packaging.unpackingCodes.includes(option.code)

            return (
              <AppPressable
                accessibilityLabel={`${selected ? '取消' : '选择'}${option.name}`}
                block
                className={getOptionClassName(selected)}
                key={option.code}
                layout='row-start'
                selected={selected}
                onPress={() => toggleUnpacking(option.code)}
              >
                <View className='express-packaging-option__visual express-packaging-option__visual--empty'>
                  <AppIcon
                    color={APP_STYLE_COLORS.text.supporting}
                    name='package'
                    size={APP_NATIVE_TOKENS.icon.default}
                  />
                </View>
                <View className='express-packaging-option__main'>
                  <Text className='express-packaging-option__name'>
                    {option.name}
                  </Text>
                  <Text
                    className='express-packaging-option__detail'
                    numberOfLines={1}
                  >
                    {option.description}
                  </Text>
                </View>
                <View className='express-packaging-option__aside'>
                  <Text className='express-packaging-option__price'>
                    {option.priceLabel}
                  </Text>
                  <PackagingIndicator multiple selected={selected} />
                </View>
              </AppPressable>
            )
          })}
        </View>
      ) : null}
    </ExpressSection>
  )
}
