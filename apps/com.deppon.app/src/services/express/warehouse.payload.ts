import { normalizeExpressWarehouseDraft } from './warehouse.rules'

import type {
  ExpressDeliveryToWarehouse,
  ExpressOrderExtendField,
  ExpressWarehouseDraft,
  ExpressWarehouseStagingPayload
} from './types'

export function createExpressWarehouseQuoteFields(
  value: ExpressWarehouseDraft
) {
  const warehouse = normalizeExpressWarehouseDraft(value)

  return {
    isWarehousingService: warehouse.enabled ? ('Y' as const) : ('N' as const),
    deliverWarehouseWay:
      warehouse.enabled && warehouse.deliverWarehouseWay
        ? warehouse.deliverWarehouseWay
        : undefined,
    warehouseCode:
      warehouse.enabled && warehouse.warehouseCode
        ? warehouse.warehouseCode
        : undefined,
    warehouseProcess:
      warehouse.enabled && warehouse.warehouseProcess
        ? warehouse.warehouseProcess
        : undefined,
    jcType:
      warehouse.enabled && warehouse.warehouseType
        ? warehouse.warehouseType
        : undefined
  }
}

export function createExpressWarehouseOrderFields(
  value: ExpressWarehouseDraft
): {
  deliveryToWarehouse?: ExpressDeliveryToWarehouse
  orderExtendFields: ExpressOrderExtendField[]
} {
  const warehouse = normalizeExpressWarehouseDraft(value)
  const orderExtendFields: ExpressOrderExtendField[] = []

  if (warehouse.enabled && warehouse.deliverWarehouseWay) {
    orderExtendFields.push({
      key: 'deliverWarehouseWay',
      value: warehouse.deliverWarehouseWay
    })

    if (warehouse.warehouseProcess) {
      orderExtendFields.push({
        key: 'warehouseProcess',
        value: warehouse.warehouseProcess
      })
    }
  }

  if (warehouse.enabled && warehouse.warehouseRemark) {
    orderExtendFields.push({
      key: 'warehouseRemark',
      value: warehouse.warehouseRemark
    })
  }

  return {
    deliveryToWarehouse: warehouse.enabled
      ? {
          isWarehousingService: 'Y',
          appointmentEntryCode: warehouse.warehouseNo,
          appointmentTime: warehouse.warehouseTime,
          appointmentUrl: warehouse.fileList.map(file => file.previewPath),
          warehouseType: warehouse.warehouseType || undefined,
          deliverWarehouseWay: warehouse.deliverWarehouseWay || undefined,
          warehouseProcess: warehouse.warehouseProcess || undefined
        }
      : undefined,
    orderExtendFields
  }
}

export function createExpressWarehouseStagingPayload(
  value: ExpressWarehouseDraft
): ExpressWarehouseStagingPayload {
  const warehouse = normalizeExpressWarehouseDraft(value)

  return {
    fileList: warehouse.fileList.map(file => ({ ...file })),
    warehouseNo: warehouse.warehouseNo,
    warehouseTime: warehouse.warehouseTime,
    warehouseType: warehouse.warehouseType,
    deliverWarehouseWay: warehouse.deliverWarehouseWay,
    warehouseProcess: warehouse.warehouseProcess,
    warehouseCode: warehouse.warehouseCode,
    warehouseRemark: warehouse.warehouseRemark
  }
}
