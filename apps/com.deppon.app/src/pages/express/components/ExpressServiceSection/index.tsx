import { Image, Text, View } from '@tarojs/components'

import { getExpressDeliveryPreferenceOption, getExpressReturnBillOption } from '@/services/express'
import type { ExpressDraft, ExpressScanContextView } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { APP_IMAGE_ICONS } from '@/shared/components/AppIcon'

import { ExpressScanContextCard } from '../ExpressScanContextCard'

import './index.scss'

const DELIVERY_LABELS: Record<ExpressDraft['service']['deliveryMode'], string> = {
  '': '请选择',
  PICKNOTUPSTAIRS: '送货上门',
  PICKSELF: '自提',
  PICKUPSTAIRS: '送货上楼',
  BIGUPSTAIRS: '大件上楼'
}

interface ExpressServiceSectionProps {
  draft: ExpressDraft
  scanContextView: ExpressScanContextView | null
  /** 并入保价卡渲染：只出增值服务行，不带自有白卡与扫描卡外边距。 */
  plain?: boolean
  onClearScanContext: () => void
  onOpenServices: () => void
}

/**
 * @description 寄件页的增值服务入口行：只做入口，点击跳增值服务专属页。
 */
export function ExpressServiceSection({ draft, onClearScanContext, onOpenServices, plain = false, scanContextView }: ExpressServiceSectionProps) {
  const { collection, deliveryPreference, packaging, service, valueAdded, warehouse } = draft
  const packagingSelected = Boolean(packaging.cartonCode || packaging.woodenCodes.length || packaging.unpackingCodes.length)
  const summaryParts = [
    service.deliveryMode !== 'PICKNOTUPSTAIRS' && DELIVERY_LABELS[service.deliveryMode],
    packagingSelected && '包装服务',
    service.passwordSigning === 'Y' && '签收密码',
    service.returnBill.type !== 'NO_RETURN_SIGNED' && getExpressReturnBillOption(service.returnBill.type).label,
    Boolean(collection.type) && '代收货款',
    Boolean(deliveryPreference.type) && getExpressDeliveryPreferenceOption(deliveryPreference.type).label,
    warehouse.enabled && '送货进仓',
    valueAdded?.doubleDelivery && '双人派送',
    valueAdded?.powerMachine.enabled && '通电验机',
    (valueAdded?.photo.sign || valueAdded?.photo.pickup) && '拍照服务'
  ].filter(Boolean) as string[]
  // 摘要最多展示 3 项；含代收货款时最多展示 2 项，超出部分用「…」截断。
  const summaryLimit = summaryParts.includes('代收货款') ? 2 : 3
  const summary = summaryParts.length > summaryLimit ? `${summaryParts.slice(0, summaryLimit).join('、')}…` : summaryParts.join('、')
  const entry = (
    <AppPressable
      accessibilityLabel='打开增值服务'
      block
      className={plain ? 'express-service-entry express-service-entry--plain' : 'express-service-entry'}
      layout='row-start'
      onPress={onOpenServices}
    >
      <Text className='express-service-entry__title'>增值服务</Text>
      <Text className={summary ? 'express-service-entry__summary' : 'express-service-entry__summary express-service-entry__summary--muted'} numberOfLines={1}>
        {summary || '代收货款、签收单…'}
      </Text>
      <Image className='express-service-entry__arrow' mode='aspectFit' src={APP_IMAGE_ICONS.arrowRightGrey} />
    </AppPressable>
  )

  if (plain) {
    return entry
  }

  return (
    <View className='express-value-added'>
      {scanContextView ? <ExpressScanContextCard view={scanContextView} onClear={onClearScanContext} /> : null}

      <View className='express-value-added__card'>{entry}</View>
    </View>
  )
}
