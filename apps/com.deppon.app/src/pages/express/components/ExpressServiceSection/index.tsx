import { Image, Input, Text, View } from '@tarojs/components'

import { useState } from 'react'

import { getExpressDeliveryPreferenceOption, getExpressReturnBillOption } from '@/services/express'
import type { ExpressDeliveryMode, ExpressDraft, ExpressPackagingDraft, ExpressScanContextView } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { AppIcon, APP_IMAGE_ICONS } from '@/shared/components/AppIcon'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ExpressCollectionCard } from '../ExpressCollectionCard'
import { ExpressDeliveryPointField } from '../ExpressDeliveryPointField'
import { ExpressDeliveryPreferenceCard } from '../ExpressDeliveryPreferenceCard'
import { ExpressInsuranceCard } from '../ExpressInsuranceCard'
import { ExpressPackagingCard } from '../ExpressPackagingCard'
import { ExpressReturnBillCard } from '../ExpressReturnBillCard'
import { ExpressScanContextCard } from '../ExpressScanContextCard'
import { ExpressWarehouseCard } from '../ExpressWarehouseCard'

import type { ExpressCollectionController } from '../../hooks/useExpressCollection'
import type { ExpressDeliveryPreferenceController } from '../../hooks/useExpressDeliveryPreference'
import type { ExpressInsuranceController } from '../../hooks/useExpressInsurance'
import type { ExpressWarehouseController } from '../../hooks/useExpressWarehouse'

import './index.scss'

const DELIVERY_OPTIONS: Array<{ label: string; value: ExpressDeliveryMode }> = [
  {
    label: '送货上门',
    value: 'PICKNOTUPSTAIRS'
  },
  {
    label: '自提',
    value: 'PICKSELF'
  },
  {
    label: '送货上楼',
    value: 'PICKUPSTAIRS'
  }
]

interface ExpressServiceSectionProps {
  collection: ExpressDraft['collection']
  collectionController: ExpressCollectionController
  deliveryPreference: ExpressDraft['deliveryPreference']
  deliveryPreferenceController: ExpressDeliveryPreferenceController
  deliveryPoint: ExpressDraft['deliveryPoint']
  draft: ExpressDraft
  insuranceController: ExpressInsuranceController
  packaging: ExpressDraft['packaging']
  remark: string
  scanContextView: ExpressScanContextView | null
  selectedProduct: ExpressDraft['selectedProduct']
  service: ExpressDraft['service']
  warehouse: ExpressDraft['warehouse']
  warehouseController: ExpressWarehouseController
  onClearScanContext: () => void
  onOpenDeliveryPoints: () => void
  onPackagingChange: (patch: Partial<ExpressPackagingDraft>) => void
  onRemarkInput: (value: string) => void
  onReturnBillChange: (patch: Partial<ExpressDraft['service']['returnBill']>) => void
  onOpenReturnBillCloudSign: () => void
  onServiceChange: (patch: Partial<ExpressDraft['service']>) => void
}

export function ExpressServiceSection({
  collection,
  collectionController,
  deliveryPreference,
  deliveryPreferenceController,
  deliveryPoint,
  draft,
  insuranceController,
  packaging,
  remark,
  scanContextView,
  selectedProduct,
  service,
  warehouse,
  warehouseController,
  onClearScanContext,
  onOpenDeliveryPoints,
  onPackagingChange,
  onRemarkInput,
  onReturnBillChange,
  onOpenReturnBillCloudSign,
  onServiceChange
}: ExpressServiceSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [remarkExpanded, setRemarkExpanded] = useState(false)
  const [deliveryExpanded, setDeliveryExpanded] = useState(false)

  const deliveryLabel = DELIVERY_OPTIONS.find(option => option.value === service.deliveryMode)?.label || '请选择'
  const packagingSelected = Boolean(packaging.cartonCode || packaging.woodenCodes.length || packaging.unpackingCodes.length)
  const summaryParts = [
    service.deliveryMode !== 'PICKNOTUPSTAIRS' && deliveryLabel,
    packagingSelected && '包装服务',
    service.passwordSigning === 'Y' && '签收密码',
    service.returnBill.type !== 'NO_RETURN_SIGNED' && getExpressReturnBillOption(service.returnBill.type).label,
    collection.type && '代收货款',
    deliveryPreference.type && getExpressDeliveryPreferenceOption(deliveryPreference.type).label,
    warehouse.enabled && '送货进仓',
    remark && '备注'
  ].filter(Boolean)
  // 摘要最多展示 3 项；含代收货款时最多展示 2 项，超出部分用「…」截断。
  const summaryLimit = summaryParts.includes('代收货款') ? 2 : 3
  const summary = summaryParts.length > summaryLimit ? `${summaryParts.slice(0, summaryLimit).join('、')}…` : summaryParts.join('、')
  const hasSummary = summaryParts.length > 0

  return (
    <View className='express-value-added'>
      {scanContextView ? <ExpressScanContextCard view={scanContextView} onClear={onClearScanContext} /> : null}

      <View className='express-value-added__card'>
        <AppPressable
          accessibilityLabel={expanded ? '收起增值服务' : '展开增值服务'}
          block
          className='express-service-entry express-service-entry--fold'
          layout='row-start'
          onPress={() => setExpanded(current => !current)}
        >
          <Text className='express-service-entry__title'>增值服务</Text>
          <Text
            className={hasSummary ? 'express-service-entry__summary' : 'express-service-entry__summary express-service-entry__summary--muted'}
            numberOfLines={1}
          >
            {summary || '代收货款、签收单…'}
          </Text>
          {expanded ? (
            <AppIcon color={APP_STYLE_COLORS.text.supporting} name='chevronUp' size={APP_NATIVE_TOKENS.icon.small} />
          ) : (
            <Image className='express-service-entry__arrow' mode='aspectFit' src={APP_IMAGE_ICONS.arrowRightGrey} />
          )}
        </AppPressable>

        {expanded ? (
          <View className='express-service-panel'>
            <ExpressInsuranceCard controller={insuranceController} draft={draft} />

            <ExpressPackagingCard packaging={packaging} onChange={onPackagingChange} />

            <AppPressable
              accessibilityLabel={deliveryExpanded ? '收起送货方式' : '展开送货方式'}
              block
              className='express-service-entry'
              layout='row-start'
              onPress={() => setDeliveryExpanded(current => !current)}
            >
              <Text className='express-service-entry__title'>送货方式</Text>
              <Text className='express-service-entry__summary'>{deliveryLabel}</Text>
              <AppIcon color={APP_STYLE_COLORS.text.supporting} name={deliveryExpanded ? 'chevronUp' : 'chevronDown'} size={APP_NATIVE_TOKENS.icon.small} />
            </AppPressable>

            {deliveryExpanded ? (
              <View className='express-service-panel'>
                <View className='express-chip-group'>
                  {DELIVERY_OPTIONS.map(option => (
                    <AppPressable
                      accessibilityLabel={`选择送货方式${option.label}`}
                      className={option.value === service.deliveryMode ? 'express-chip express-chip--active' : 'express-chip'}
                      key={option.value}
                      selected={option.value === service.deliveryMode}
                      onPress={() => onServiceChange({ deliveryMode: option.value })}
                    >
                      <Text className={option.value === service.deliveryMode ? 'express-chip__text express-chip__text--active' : 'express-chip__text'}>
                        {option.label}
                      </Text>
                    </AppPressable>
                  ))}
                </View>
                {service.deliveryMode === 'PICKSELF' ? <ExpressDeliveryPointField deliveryPoint={deliveryPoint} onOpen={onOpenDeliveryPoints} /> : null}
              </View>
            ) : null}

            <View className='express-service-row express-service-row--stack express-service-row--divided'>
              <View className='express-service-row__content'>
                <Text className='express-option-title'>签收密码</Text>
                <Text className='express-service-row__summary'>收方签收时按后端规则校验签收密码</Text>
              </View>
              <View className='express-toggle-group'>
                {(['Y', 'N'] as const).map(value => (
                  <AppPressable
                    accessibilityLabel={value === 'Y' ? '开启签收密码' : '关闭签收密码'}
                    className={value === service.passwordSigning ? 'express-toggle express-toggle--active' : 'express-toggle'}
                    key={value}
                    selected={value === service.passwordSigning}
                    onPress={() => onServiceChange({ passwordSigning: value })}
                  >
                    <Text className={value === service.passwordSigning ? 'express-toggle__text express-toggle__text--active' : 'express-toggle__text'}>
                      {value === 'Y' ? '开启' : '关闭'}
                    </Text>
                  </AppPressable>
                ))}
              </View>
            </View>

            <ExpressReturnBillCard
              onChange={onReturnBillChange}
              onOpenCloudSign={onOpenReturnBillCloudSign}
              productCode={selectedProduct?.omsProductCode || service.transportMode}
              returnBill={service.returnBill}
            />

            <ExpressCollectionCard collection={collection} controller={collectionController} selectedProduct={selectedProduct} />

            <ExpressDeliveryPreferenceCard controller={deliveryPreferenceController} preference={deliveryPreference} />

            <ExpressWarehouseCard controller={warehouseController} warehouse={warehouse} />

            <AppPressable
              accessibilityLabel={remarkExpanded ? '收起备注输入' : '展开备注输入'}
              block
              className='express-service-entry'
              layout='row-start'
              onPress={() => setRemarkExpanded(current => !current)}
            >
              <Text className='express-service-entry__title'>备注</Text>
              <Text className={remark ? 'express-service-entry__summary' : 'express-service-entry__summary express-service-entry__summary--muted'}>
                {remark ? '已填写' : '选填'}
              </Text>
              <AppIcon color={APP_STYLE_COLORS.text.supporting} name={remarkExpanded ? 'chevronUp' : 'chevronDown'} size={APP_NATIVE_TOKENS.icon.small} />
            </AppPressable>

            {remarkExpanded ? (
              <View className='express-service-panel'>
                <Input
                  className='express-service-remark__input'
                  placeholder='选填，交给快递员的信息'
                  style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
                  value={remark}
                  onInput={event => onRemarkInput(event.detail.value)}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}
