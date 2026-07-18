import { Text, View } from '@tarojs/components'

import { useState } from 'react'

import { ExpressCollectionCard } from './ExpressCollectionCard'
import { ExpressDeliveryPointField } from './ExpressDeliveryPointField'
import { ExpressDeliveryPreferenceCard } from './ExpressDeliveryPreferenceCard'
import { ExpressMonthlyPayCard } from './ExpressMonthlyPayCard'
import { ExpressReturnBillCard } from './ExpressReturnBillCard'
import { ExpressScanContextCard } from './ExpressScanContextCard'
import { ExpressSection } from './ExpressSection'
import { ExpressWarehouseCard } from './ExpressWarehouseCard'
import {
  getExpressReturnBillOption,
  getExpressDeliveryPreferenceOption
} from '../../../services/express'
import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import type {
  ExpressDeliveryMode,
  ExpressDraft,
  ExpressMonthlyPayView,
  ExpressPaymentType,
  ExpressScanContextView
} from '../../../services/express'
import type { ExpressCollectionController } from '../hooks/useExpressCollection'
import type { ExpressDeliveryPreferenceController } from '../hooks/useExpressDeliveryPreference'
import type { ExpressWarehouseController } from '../hooks/useExpressWarehouse'

import './ExpressServiceSection.scss'

const PAYMENT_OPTIONS: Array<{ label: string; value: ExpressPaymentType }> = [
  {
    label: '寄付现结',
    value: 'MP'
  },
  {
    label: '到付',
    value: 'PAY_ARIIVE'
  },
  {
    label: '月结',
    value: 'MONTH_PAY'
  }
]

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
  monthlyPayView: ExpressMonthlyPayView | null
  scanContextView: ExpressScanContextView | null
  selectedProduct: ExpressDraft['selectedProduct']
  service: ExpressDraft['service']
  warehouse: ExpressDraft['warehouse']
  warehouseController: ExpressWarehouseController
  onClearScanContext: () => void
  onOpenDeliveryPoints: () => void
  onMonthlyPayAction: (view: ExpressMonthlyPayView) => void
  onPaymentTypeSelect: (paymentType: ExpressPaymentType) => void
  onReturnBillChange: (
    patch: Partial<ExpressDraft['service']['returnBill']>
  ) => void
  onOpenReturnBillCloudSign: () => void
  onPrivacyProtectionChange: (
    value: ExpressDraft['service']['privacyProtection']
  ) => void
  onServiceChange: (patch: Partial<ExpressDraft['service']>) => void
}

export function ExpressServiceSection({
  collection,
  collectionController,
  deliveryPreference,
  deliveryPreferenceController,
  deliveryPoint,
  monthlyPayView,
  scanContextView,
  selectedProduct,
  service,
  warehouse,
  warehouseController,
  onClearScanContext,
  onOpenDeliveryPoints,
  onMonthlyPayAction,
  onPaymentTypeSelect,
  onReturnBillChange,
  onOpenReturnBillCloudSign,
  onPrivacyProtectionChange,
  onServiceChange
}: ExpressServiceSectionProps) {
  const [expandedPanel, setExpandedPanel] = useState<
    'delivery' | 'valueAdded' | null
  >(null)
  const deliveryLabel =
    DELIVERY_OPTIONS.find(option => option.value === service.deliveryMode)
      ?.label || '请选择'
  const valueAddedSummary = [
    collection.type && '代收货款',
    service.privacyProtection === 'Y' && '隐私面单',
    service.passwordSigning === 'Y' && '签收密码',
    deliveryPreference.type &&
      getExpressDeliveryPreferenceOption(deliveryPreference.type).label,
    warehouse.enabled && '送货进仓',
    service.returnBill.type !== 'NO_RETURN_SIGNED' &&
      getExpressReturnBillOption(service.returnBill.type).label
  ]
    .filter(Boolean)
    .join('、')

  const togglePanel = (panel: 'delivery' | 'valueAdded') => {
    setExpandedPanel(current => (current === panel ? null : panel))
  }

  return (
    <ExpressSection title='寄件服务'>
      {scanContextView && (
        <ExpressScanContextCard
          view={scanContextView}
          onClear={onClearScanContext}
        />
      )}

      <View className='express-service-payment'>
        <Text className='express-option-title express-option-title--inline'>
          付款方式
        </Text>
        <View className='express-chip-group'>
          {PAYMENT_OPTIONS.map(option => (
            <AppPressable
              accessibilityLabel={`选择付款方式${option.label}`}
              className={
                option.value === service.paymentType
                  ? 'express-chip express-chip--active'
                  : 'express-chip'
              }
              key={option.value}
              selected={option.value === service.paymentType}
              onPress={() => onPaymentTypeSelect(option.value)}
            >
              <Text
                className={
                  option.value === service.paymentType
                    ? 'express-chip__text express-chip__text--active'
                    : 'express-chip__text'
                }
              >
                {option.label}
              </Text>
            </AppPressable>
          ))}
        </View>
      </View>

      {monthlyPayView && (
        <ExpressMonthlyPayCard
          view={monthlyPayView}
          onAction={onMonthlyPayAction}
        />
      )}

      <AppPressable
        accessibilityLabel={
          expandedPanel === 'delivery' ? '收起送货方式' : '展开送货方式'
        }
        block
        className='express-service-entry'
        layout='row-start'
        onPress={() => togglePanel('delivery')}
      >
        <Text className='express-service-entry__title'>送货方式</Text>
        <Text className='express-service-entry__summary'>{deliveryLabel}</Text>
        <AppIcon
          color={APP_STYLE_COLORS.text.supporting}
          name={expandedPanel === 'delivery' ? 'chevronUp' : 'chevronDown'}
          size={APP_NATIVE_TOKENS.icon.small}
        />
      </AppPressable>

      {expandedPanel === 'delivery' ? (
        <View className='express-service-panel'>
          <View className='express-chip-group'>
            {DELIVERY_OPTIONS.map(option => (
              <AppPressable
                accessibilityLabel={`选择送货方式${option.label}`}
                className={
                  option.value === service.deliveryMode
                    ? 'express-chip express-chip--active'
                    : 'express-chip'
                }
                key={option.value}
                selected={option.value === service.deliveryMode}
                onPress={() => onServiceChange({ deliveryMode: option.value })}
              >
                <Text
                  className={
                    option.value === service.deliveryMode
                      ? 'express-chip__text express-chip__text--active'
                      : 'express-chip__text'
                  }
                >
                  {option.label}
                </Text>
              </AppPressable>
            ))}
          </View>
          {service.deliveryMode === 'PICKSELF' && (
            <ExpressDeliveryPointField
              deliveryPoint={deliveryPoint}
              onOpen={onOpenDeliveryPoints}
            />
          )}
        </View>
      ) : null}

      <AppPressable
        accessibilityLabel={
          expandedPanel === 'valueAdded' ? '收起增值服务' : '展开增值服务'
        }
        block
        className='express-service-entry'
        layout='row-start'
        onPress={() => togglePanel('valueAdded')}
      >
        <Text className='express-service-entry__title'>增值服务</Text>
        <Text className='express-service-entry__summary'>
          {valueAddedSummary || '可选'}
        </Text>
        <AppIcon
          color={APP_STYLE_COLORS.text.supporting}
          name={expandedPanel === 'valueAdded' ? 'chevronUp' : 'chevronDown'}
          size={APP_NATIVE_TOKENS.icon.small}
        />
      </AppPressable>

      {expandedPanel === 'valueAdded' ? (
        <View className='express-service-panel'>
          <View className='express-service-row express-service-row--stack'>
            <View className='express-service-row__content'>
              <Text className='express-option-title'>隐私面单</Text>
              <Text className='express-service-row__summary'>
                隐藏收寄件敏感号码，保护寄递隐私
              </Text>
            </View>
            <View className='express-toggle-group'>
              {(['Y', 'N'] as const).map(value => (
                <AppPressable
                  accessibilityLabel={
                    value === 'Y' ? '开启隐私面单' : '关闭隐私面单'
                  }
                  className={
                    value === service.privacyProtection
                      ? 'express-toggle express-toggle--active'
                      : 'express-toggle'
                  }
                  key={value}
                  selected={value === service.privacyProtection}
                  onPress={() => onPrivacyProtectionChange(value)}
                >
                  <Text
                    className={
                      value === service.privacyProtection
                        ? 'express-toggle__text express-toggle__text--active'
                        : 'express-toggle__text'
                    }
                  >
                    {value === 'Y' ? '开启' : '关闭'}
                  </Text>
                </AppPressable>
              ))}
            </View>
          </View>

          <View className='express-service-row express-service-row--stack express-service-row--divided'>
            <View className='express-service-row__content'>
              <Text className='express-option-title'>签收密码</Text>
              <Text className='express-service-row__summary'>
                收方签收时按后端规则校验签收密码
              </Text>
            </View>
            <View className='express-toggle-group'>
              {(['Y', 'N'] as const).map(value => (
                <AppPressable
                  accessibilityLabel={
                    value === 'Y' ? '开启签收密码' : '关闭签收密码'
                  }
                  className={
                    value === service.passwordSigning
                      ? 'express-toggle express-toggle--active'
                      : 'express-toggle'
                  }
                  key={value}
                  selected={value === service.passwordSigning}
                  onPress={() => onServiceChange({ passwordSigning: value })}
                >
                  <Text
                    className={
                      value === service.passwordSigning
                        ? 'express-toggle__text express-toggle__text--active'
                        : 'express-toggle__text'
                    }
                  >
                    {value === 'Y' ? '开启' : '关闭'}
                  </Text>
                </AppPressable>
              ))}
            </View>
          </View>

          <ExpressReturnBillCard
            onChange={onReturnBillChange}
            onOpenCloudSign={onOpenReturnBillCloudSign}
            productCode={
              selectedProduct?.omsProductCode || service.transportMode
            }
            returnBill={service.returnBill}
          />

          <ExpressCollectionCard
            collection={collection}
            controller={collectionController}
            selectedProduct={selectedProduct}
          />

          <ExpressDeliveryPreferenceCard
            controller={deliveryPreferenceController}
            preference={deliveryPreference}
          />

          <ExpressWarehouseCard
            controller={warehouseController}
            warehouse={warehouse}
          />
        </View>
      ) : null}
    </ExpressSection>
  )
}
