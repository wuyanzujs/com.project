import { orderApi } from './order.api'
import {
  getDetailWaybillNumber,
  isExpressOrder,
  isSignedOrder,
  isTransitOrder
} from './order.detailRules'

import type {
  OrderDetail,
  OrderServiceImageScene,
  OrderStubImageGroupView,
  OrderStubImagesView,
  OrderStubImageView
} from './types'
import type { DepponResponse } from '../../request/deppon'

const EXPRESS_SERVICE_IMAGE_SCENES: Record<OrderServiceImageScene, string> = {
  1: 'RETURNBILLTYPE_FAX',
  2: 'SUBSIDY_PHOTO',
  3: 'OPEN_PACKING',
  4: 'CHECK_CODE_GOODS',
  5: 'PASTING_SERVER_PICTURE',
  6: 'DOUBLE_DELIVERY_PHOTO',
  7: 'PICKUP_TAKE_PHOTO'
}

const LOGISTICS_SERVICE_IMAGE_SCENES: Record<OrderServiceImageScene, string> = {
  1: 'PDC_RETURNBILL',
  2: '7',
  3: '4',
  4: '6',
  5: 'PASTING_SERVER_PICTURE',
  6: 'DOUBLE_DELIVERY_PHOTO',
  7: 'PICKUP_TAKE_PHOTO'
}

function normalizeImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const urls = value
    .map((item) => {
      if (typeof item !== 'string') {
        return ''
      }

      const url = item.trim()

      if (!url) {
        return ''
      }

      return url.startsWith('http://')
        ? url.replace('http://', 'https://')
        : url
    })
    .filter(Boolean)

  return Array.from(new Set(urls))
}

function createOrderStubImageGroup(
  kind: OrderStubImageGroupView['kind'],
  title: string,
  summary: string,
  urls: string[]
): OrderStubImageGroupView | null {
  if (!urls.length) {
    return null
  }

  return {
    kind,
    title,
    summary,
    images: urls.map<OrderStubImageView>((url, index) => ({
      id: `${kind}-${index}-${url}`,
      url
    }))
  }
}

function createEmptyImageResponse(): DepponResponse<string[]> {
  return {
    status: true,
    message: '',
    result: []
  }
}

function getOrderServiceImageScene(
  scene: OrderServiceImageScene,
  isLogistics: boolean
) {
  return isLogistics
    ? LOGISTICS_SERVICE_IMAGE_SCENES[scene]
    : EXPRESS_SERVICE_IMAGE_SCENES[scene]
}

function queryServiceImagesByScene(
  wayBill: string,
  scene: OrderServiceImageScene,
  isLogistics: boolean
) {
  const imageScene = getOrderServiceImageScene(scene, isLogistics)

  return orderApi.queryServiceImages(
    {
      wayBill,
      imageScene
    },
    isLogistics
  )
}

function normalizePackageImageUrls(value: unknown) {
  if (!value || typeof value !== 'object' || !('list' in value)) {
    return []
  }

  const list = (value as { list?: Array<{ savePath?: string | null }> | null })
    .list

  return normalizeImageUrls(
    Array.isArray(list) ? list.map((item) => item.savePath || '') : []
  )
}

function getSettledResponse<TResult>(
  result: PromiseSettledResult<DepponResponse<TResult>>
) {
  return result.status === 'fulfilled' ? result.value : null
}

export async function queryOrderStubImages(
  order: OrderDetail
): Promise<DepponResponse<OrderStubImagesView>> {
  const wayBill = getDetailWaybillNumber(order)

  if (!wayBill) {
    return Promise.resolve({
      status: true,
      message: '缺少运单号，暂无法查询揽收/签收照片',
      result: {
        available: false,
        message: '缺少运单号，暂无法查询揽收/签收照片',
        groups: []
      }
    })
  }

  if (!isTransitOrder(order) && !isSignedOrder(order)) {
    return Promise.resolve({
      status: true,
      message: '运输中或已签收后可查看揽收/签收照片',
      result: {
        available: false,
        message: '运输中或已签收后可查看揽收/签收照片',
        groups: []
      }
    })
  }

  const isLogistics = !isExpressOrder(order)
  const [
    pickupResult,
    reweighResult,
    receiptResult,
    signResult,
    returnBillResult,
    subsidyResult,
    openPackingResult,
    checkCodeGoodsResult,
    pastingResult,
    homeDecorationResult,
    powerOnResult,
    doubleDeliveryResult,
    woodenPackageResult,
    homeExchangeResult,
    pickupServiceResult
  ] = await Promise.allSettled([
    orderApi.queryOpenBoxImages({ wayBill }),
    orderApi.queryOpenBoxImages({ wayBill, operationType: '10' }),
    orderApi.queryReceiptImages({ wayBill }),
    isLogistics
      ? queryServiceImagesByScene(wayBill, 2, isLogistics)
      : orderApi.querySignImages({ wayBill }),
    orderApi.queryReturnBillImages({ waybillNo: wayBill }),
    isLogistics
      ? Promise.resolve(createEmptyImageResponse())
      : queryServiceImagesByScene(wayBill, 2, isLogistics),
    queryServiceImagesByScene(wayBill, 3, isLogistics),
    queryServiceImagesByScene(wayBill, 4, isLogistics),
    queryServiceImagesByScene(wayBill, 5, isLogistics),
    orderApi.queryDecorationImages({ wayBill }),
    orderApi.queryPowerOnImages({ wayBill }, isLogistics),
    queryServiceImagesByScene(wayBill, 6, isLogistics),
    orderApi.queryPackageImages({ wayBill }),
    orderApi.queryHomeImages({ wayBill }),
    queryServiceImagesByScene(wayBill, 7, isLogistics)
  ])

  const pickupResponse = getSettledResponse(pickupResult)
  const reweighResponse = getSettledResponse(reweighResult)
  const receiptResponse = getSettledResponse(receiptResult)
  const signResponse = getSettledResponse(signResult)
  const returnBillResponse = getSettledResponse(returnBillResult)
  const subsidyResponse = getSettledResponse(subsidyResult)
  const openPackingResponse = getSettledResponse(openPackingResult)
  const checkCodeGoodsResponse = getSettledResponse(checkCodeGoodsResult)
  const pastingResponse = getSettledResponse(pastingResult)
  const homeDecorationResponse = getSettledResponse(homeDecorationResult)
  const powerOnResponse = getSettledResponse(powerOnResult)
  const doubleDeliveryResponse = getSettledResponse(doubleDeliveryResult)
  const woodenPackageResponse = getSettledResponse(woodenPackageResult)
  const homeExchangeResponse = getSettledResponse(homeExchangeResult)
  const pickupServiceResponse = getSettledResponse(pickupServiceResult)
  const failedMessage =
    [
      pickupResponse,
      reweighResponse,
      receiptResponse,
      signResponse,
      returnBillResponse,
      subsidyResponse,
      openPackingResponse,
      checkCodeGoodsResponse,
      pastingResponse,
      homeDecorationResponse,
      powerOnResponse,
      doubleDeliveryResponse,
      woodenPackageResponse,
      homeExchangeResponse,
      pickupServiceResponse
    ].find((item) => !!item?.message)?.message || ''
  const groups = [
    createOrderStubImageGroup(
      'pickup',
      '取货照片',
      '揽收、取货或开箱环节留存',
      normalizeImageUrls(pickupResponse?.result)
    ),
    createOrderStubImageGroup(
      'reweigh',
      '复磅照片',
      '复核重量或体积时留存',
      normalizeImageUrls(reweighResponse?.result)
    ),
    createOrderStubImageGroup(
      'delivered',
      '送达照片',
      '签收底单或送达凭证',
      normalizeImageUrls(receiptResponse?.result?.signList)
    ),
    createOrderStubImageGroup(
      'signed',
      '签收照片',
      '拍照签收环节留存',
      normalizeImageUrls(signResponse?.result)
    ),
    createOrderStubImageGroup(
      'returnBill',
      '签回单',
      '回单或返单照片凭证',
      normalizeImageUrls(returnBillResponse?.result)
    ),
    createOrderStubImageGroup(
      'subsidy',
      '国补信息采集',
      '国补信息采集环节留存',
      normalizeImageUrls(subsidyResponse?.result)
    ),
    createOrderStubImageGroup(
      'openPacking',
      '拆包装',
      '拆包装服务环节留存',
      normalizeImageUrls(openPackingResponse?.result)
    ),
    createOrderStubImageGroup(
      'checkCodeGoods',
      '清点码货',
      '清点码货服务环节留存',
      normalizeImageUrls(checkCodeGoodsResponse?.result)
    ),
    createOrderStubImageGroup(
      'pastingService',
      '贴码服务',
      '贴码服务环节留存',
      normalizeImageUrls(pastingResponse?.result)
    ),
    createOrderStubImageGroup(
      'homeDecoration',
      '家装完工',
      '家装完工或安装完成后留存',
      normalizeImageUrls(homeDecorationResponse?.result)
    ),
    createOrderStubImageGroup(
      'powerOn',
      '简易安装/通电验机',
      '简易安装或通电验机环节留存',
      normalizeImageUrls(powerOnResponse?.result)
    ),
    createOrderStubImageGroup(
      'doubleDelivery',
      '双人派送',
      '双人派送服务环节留存',
      normalizeImageUrls(doubleDeliveryResponse?.result)
    ),
    createOrderStubImageGroup(
      'woodenPackage',
      '代打木包装',
      '木包装或代打包装服务留存',
      normalizePackageImageUrls(woodenPackageResponse?.result)
    ),
    createOrderStubImageGroup(
      'homeExchange',
      '送新取旧',
      '送新取旧服务环节留存',
      normalizeImageUrls(homeExchangeResponse?.result)
    ),
    createOrderStubImageGroup(
      'pickupService',
      '揽收拍照',
      '揽收拍照服务环节留存',
      normalizeImageUrls(pickupServiceResponse?.result)
    )
  ].filter((item): item is OrderStubImageGroupView => !!item)
  const message = groups.length
    ? ''
    : failedMessage || '暂未查询到揽收/签收照片'

  return {
    status: true,
    message,
    result: {
      available: groups.length > 0,
      message,
      groups
    }
  }
}
