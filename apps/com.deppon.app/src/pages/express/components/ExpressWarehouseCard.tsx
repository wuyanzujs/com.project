import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import type { ExpressDraft } from '../../../services/express'
import type { ExpressWarehouseController } from '../hooks/useExpressWarehouse'

import './ExpressWarehouseCard.scss'

interface ExpressWarehouseCardProps {
  controller: ExpressWarehouseController
  warehouse: ExpressDraft['warehouse']
}

function getWarehouseSummary(warehouse: ExpressDraft['warehouse']) {
  if (!warehouse.enabled) {
    return warehouse.screening.type === 3 || warehouse.screening.type === 4
      ? '当前地址可能涉及进仓服务'
      : '特殊仓库、机场或物流园区预约派送'
  }

  return warehouse.warehouseNo || warehouse.warehouseTime
    ? [warehouse.warehouseNo, warehouse.warehouseTime]
        .filter(Boolean)
        .join(' · ')
    : '已开启，待完善预约信息'
}

function getWarehouseDetails(warehouse: ExpressDraft['warehouse']) {
  return [
    warehouse.deliverWarehouseWay === 'AGXSF'
      ? '按工序收费'
      : warehouse.deliverWarehouseWay === 'APSF'
        ? '按票收费'
        : '',
    warehouse.fileList.length
      ? `${warehouse.fileList.length} 个预约附件`
      : '',
    warehouse.warehouseRemark
  ]
    .filter(Boolean)
    .join(' · ')
}

export function ExpressWarehouseCard({
  controller,
  warehouse
}: ExpressWarehouseCardProps) {
  const details = getWarehouseDetails(warehouse)

  return (
    <View className='express-warehouse'>
      <View className='express-warehouse__header'>
        <View className='express-warehouse__header-content'>
          <Text className='express-option-title'>送货进仓</Text>
          <Text className='express-warehouse__summary'>
            {getWarehouseSummary(warehouse)}
          </Text>
        </View>
        <AppPressable
          accessibilityLabel={
            warehouse.enabled ? '关闭送货进仓' : '开启送货进仓'
          }
          className='express-warehouse-toggle'
          selected={warehouse.enabled}
          onPress={controller.onToggle}
        >
          <View
            className={
              warehouse.enabled
                ? 'express-warehouse-toggle__track express-warehouse-toggle__track--active'
                : 'express-warehouse-toggle__track'
            }
          >
            <View className='express-warehouse-toggle__thumb' />
          </View>
        </AppPressable>
      </View>

      <View className='express-warehouse__tools'>
        <AppPressable
          accessibilityLabel='识别是否需要送货进仓'
          className='express-warehouse__tool'
          disabled={controller.loading}
          layout='row-center'
          onPress={controller.onQuery}
        >
          <AppIcon
            color={APP_STYLE_COLORS.brand.default}
            name='search'
            size={APP_NATIVE_TOKENS.icon.small}
          />
          <Text className='express-warehouse__tool-text'>
            {controller.loading ? '识别中' : '识别地址'}
          </Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel='查看送货进仓服务说明'
          className='express-warehouse__tool'
          layout='row-center'
          onPress={controller.onOpenRules}
        >
          <AppIcon
            color={APP_STYLE_COLORS.text.supporting}
            name='info'
            size={APP_NATIVE_TOKENS.icon.small}
          />
          <Text className='express-warehouse__tool-text express-warehouse__tool-text--secondary'>
            服务说明
          </Text>
        </AppPressable>
      </View>

      {warehouse.enabled ? (
        <View className='express-warehouse__details'>
          <View className='express-warehouse__details-content'>
            <Text className='express-warehouse__details-title'>进仓预约</Text>
            <Text className='express-warehouse__details-summary'>
              {details || '可填写入仓号、预约时间、工序和附件'}
            </Text>
          </View>
          <AppPressable
            accessibilityLabel='设置送货进仓预约'
            className='express-warehouse__appointment'
            disabled={controller.stagingLoading}
            layout='row-center'
            onPress={controller.onOpenAppointment}
          >
            <Text className='express-warehouse__appointment-text'>
              {controller.stagingLoading ? '准备中' : '设置'}
            </Text>
            <AppIcon
              color={APP_STYLE_COLORS.brand.default}
              name='chevronRight'
              size={APP_NATIVE_TOKENS.icon.small}
            />
          </AppPressable>
        </View>
      ) : null}

      {controller.message ? (
        <View className='express-warehouse__message'>
          <Text className='express-warehouse__message-text'>
            {controller.message}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
