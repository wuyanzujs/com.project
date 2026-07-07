import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { orderService } from '../../../services/order'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { copyTextToClipboard } from '../../../shared/platform/clipboard'

import type {
  OrderStubDocumentView,
  OrderStubFieldView,
  OrderStubImageGroupView,
  OrderStubImagesView,
  OrderStubImageView,
  OrderStubPackageFeeView,
  OrderStubPackageFeeGroupView,
  OrderStubPartyView,
  OrderStubView
} from '../../../services/order'

import './index.scss'

interface OrderStubRouteParams {
  orderNumber: string
  waybillNumber: string
  role: string
  source: string
}

const BARCODE_PATTERN = [
  1, 3, 1, 2, 4, 1, 2, 2, 1, 3, 3, 1, 4, 2, 1, 1, 3, 2, 2, 4, 1, 3, 1, 2
]

function createQuery(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([, value]) => !!value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

function getRouteParams(
  params: Record<string, string | undefined>
): OrderStubRouteParams {
  return {
    orderNumber: params.orderNumber || params.orderNo || '',
    waybillNumber: params.waybillNumber || params.waybillNo || '',
    role: params.role || '',
    source: params.source || ''
  }
}

function getOrderStubUrl(params: OrderStubRouteParams) {
  return `${APP_ROUTES.orderStub}?${createQuery({
    orderNumber: params.orderNumber,
    waybillNumber: params.waybillNumber,
    role: params.role,
    source: params.source
  })}`
}

function getOrderDetailUrl(params: OrderStubRouteParams) {
  return `${APP_ROUTES.orderDetail}?${createQuery({
    orderNumber: params.orderNumber,
    waybillNumber: params.waybillNumber,
    role: params.role,
    source: params.source,
    view: 'secure'
  })}`
}

function getBarcodeBarClassName(value: number) {
  return `order-stub-barcode__bar order-stub-barcode__bar--${value}`
}

interface ImagePreviewState {
  group: OrderStubImageGroupView
  image: OrderStubImageView
  index: number
}

const OrderStubPage = () => {
  const router = useRouter()
  const routeParams = useMemo(
    () => getRouteParams(router.params as Record<string, string | undefined>),
    [router.params]
  )
  const [stub, setStub] = useState<OrderStubView | null>(null)
  const [images, setImages] = useState<OrderStubImagesView | null>(null)
  const [document, setDocument] = useState<OrderStubDocumentView | null>(null)
  const [packageFee, setPackageFee] =
    useState<OrderStubPackageFeeView | null>(null)
  const [loading, setLoading] = useState(false)
  const [imagesLoading, setImagesLoading] = useState(false)
  const [previewImage, setPreviewImage] =
    useState<ImagePreviewState | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const loadStub = async () => {
    const redirectUrl = getOrderStubUrl(routeParams)

    if (!ensureAuthenticated({ redirectUrl, replace: true })) {
      return
    }

    if (!routeParams.orderNumber && !routeParams.waybillNumber) {
      setStub(null)
      setErrorMessage('缺少订单号或运单号，暂无法查看电子存根')
      return
    }

    setLoading(true)
    setImages(null)
    setDocument(null)
    setPackageFee(null)
    setErrorMessage('')

    try {
      const response = await orderService.queryDetail(routeParams)

      if (!response.status || !response.result) {
        setStub(null)
        setErrorMessage(response.message || '暂未获取到电子存根')
        return
      }

      const nextDetail = response.result

      setStub(orderService.getStubView(nextDetail))
      setImagesLoading(true)

      try {
        const [imageResponse, documentResponse, packageFeeResponse] =
          await Promise.all([
            orderService.queryStubImages(nextDetail),
            orderService.queryStubDocument(nextDetail),
            orderService.queryStubPackageFee(nextDetail)
          ])

        setImages(
          imageResponse.result || {
            available: false,
            message: imageResponse.message || '暂未查询到揽收/签收照片',
            groups: []
          }
        )
        setDocument(documentResponse.result || null)
        setPackageFee(packageFeeResponse.result || null)
      } finally {
        setImagesLoading(false)
      }
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadStub()
  })

  const handleCopy = async (value: string, successText = '复制成功') => {
    if (!value || value === '--') {
      Taro.showToast({
        title: '暂无可复制内容',
        icon: 'none'
      })
      return
    }

    try {
      await copyTextToClipboard(value)
      Taro.showToast({
        title: successText,
        icon: 'none'
      })
    } catch {
      Taro.showToast({
        title: '复制失败，请稍后再试',
        icon: 'none'
      })
    }
  }

  const handleBackToDetail = () => {
    if (!routeParams.orderNumber && !routeParams.waybillNumber) {
      navigateToAppRoute(APP_ROUTES.orderList, {
        login: true
      })
      return
    }

    navigateToAppRoute(getOrderDetailUrl(routeParams), {
      login: true
    })
  }

  const handleOpenDocument = () => {
    if (!document?.canPreview || !document.route) {
      Taro.showToast({
        title: document?.statusText || '当前暂无可查看票证',
        icon: 'none'
      })
      return
    }

    navigateToAppRoute(document.route, {
      login: true
    })
  }

  const renderParty = (party: OrderStubPartyView) => (
    <View className='order-stub-party' key={party.role}>
      <Text
        className={
          party.role === 'sender'
            ? 'order-stub-party__tag'
            : 'order-stub-party__tag order-stub-party__tag--receiver'
        }
      >
        {party.role === 'sender' ? '寄' : '收'}
      </Text>
      <View className='order-stub-party__content'>
        <View className='order-stub-party__head'>
          <Text className='order-stub-party__label'>{party.label}</Text>
          {party.encrypted && (
            <Text className='order-stub-party__badge'>隐私保护</Text>
          )}
        </View>
        <Text className='order-stub-party__name'>
          {party.name} {party.mobile}
        </Text>
        <Text className='order-stub-party__address'>{party.address}</Text>
        <View
          className='order-stub-party__copy'
          onClick={() => handleCopy(party.copyText, '地址复制成功')}
        >
          <Text className='order-stub-party__copy-text'>复制地址</Text>
        </View>
      </View>
    </View>
  )

  const renderField = (field: OrderStubFieldView) => (
    <View
      className={
        field.important
          ? 'order-stub-field order-stub-field--important'
          : 'order-stub-field'
      }
      key={`${field.label}-${field.value}`}
    >
      <Text className='order-stub-field__label'>{field.label}</Text>
      <View className='order-stub-field__content'>
        <Text className='order-stub-field__value'>{field.value}</Text>
        {!!field.copyValue && (
          <View
            className='order-stub-field__copy'
            onClick={() => handleCopy(field.copyValue || '')}
          >
            <Text className='order-stub-field__copy-text'>复制</Text>
          </View>
        )}
      </View>
    </View>
  )

  const renderImageGroup = (group: OrderStubImageGroupView) => (
    <View className='order-stub-image-group' key={group.kind}>
      <View className='order-stub-image-group__head'>
        <View className='order-stub-image-group__content'>
          <Text className='order-stub-image-group__title'>{group.title}</Text>
          <Text className='order-stub-image-group__summary'>
            {group.summary}
          </Text>
        </View>
        <Text className='order-stub-image-group__count'>
          {group.images.length}张
        </Text>
      </View>
      <View className='order-stub-image-grid'>
        {group.images.map((image, index) => (
          <View
            className='order-stub-image-thumb'
            key={image.id}
            onClick={() =>
              setPreviewImage({
                group,
                image,
                index
              })
            }
          >
            <Image
              className='order-stub-image-thumb__image'
              mode='aspectFill'
              src={image.url}
            />
          </View>
        ))}
      </View>
    </View>
  )

  const renderPackageFeeGroup = (group: OrderStubPackageFeeGroupView) => (
    <View className='order-stub-package-group' key={group.title}>
      <Text className='order-stub-package-group__title'>{group.title}</Text>
      <View className='order-stub-package-row order-stub-package-row--head'>
        <Text className='order-stub-package-row__name'>{group.nameTitle}</Text>
        <Text className='order-stub-package-row__count'>
          {group.countTitle}
        </Text>
        <Text className='order-stub-package-row__amount'>
          {group.amountTitle}
        </Text>
      </View>
      {group.items.map((item) => (
        <View
          className='order-stub-package-row'
          key={`${group.title}-${item.name}-${item.amount}`}
        >
          <Text className='order-stub-package-row__name'>{item.name}</Text>
          <Text className='order-stub-package-row__count'>{item.count}</Text>
          <Text className='order-stub-package-row__amount'>{item.amount}</Text>
        </View>
      ))}
    </View>
  )

  return (
    <ScrollView className='order-stub-page' scrollY>
      <View className='order-stub-header'>
        <Text className='order-stub-header__label'>Receipt</Text>
        <Text className='order-stub-header__title'>
          {stub?.title || '电子存根'}
        </Text>
        <Text className='order-stub-header__summary'>
          {stub?.subtitle || '订单结构化凭证'}
        </Text>
      </View>

      {loading && !stub && (
        <Text className='order-stub-loading'>正在加载电子存根...</Text>
      )}

      {!loading && !stub && (
        <View className='order-stub-empty'>
          <Text className='order-stub-empty__title'>
            {errorMessage || '暂未获取到电子存根'}
          </Text>
          <View className='order-stub-empty__button' onClick={handleBackToDetail}>
            <Text className='order-stub-empty__button-text'>返回订单详情</Text>
          </View>
        </View>
      )}

      {stub && (
        <>
          <View className='order-stub-card'>
            <View className='order-stub-card__head'>
              <View>
                <Text className='order-stub-card__status'>
                  {stub.statusText}
                </Text>
                <Text className='order-stub-card__number'>
                  {stub.copyNumber || stub.barcodeText}
                </Text>
              </View>
              <View
                className='order-stub-card__copy'
                onClick={() => handleCopy(stub.copyNumber)}
              >
                <Text className='order-stub-card__copy-text'>复制</Text>
              </View>
            </View>

            <View className='order-stub-barcode'>
              <View className='order-stub-barcode__bars'>
                {BARCODE_PATTERN.map((item, index) => (
                  <View
                    className={getBarcodeBarClassName(item)}
                    key={`${item}-${index}`}
                  />
                ))}
              </View>
              <Text className='order-stub-barcode__text'>
                {stub.barcodeText}
              </Text>
            </View>

            <View className='order-stub-divider' />
            {renderParty(stub.sender)}
            {renderParty(stub.receiver)}
          </View>

          {stub.sections.map((section) => (
            <View className='order-stub-section' key={section.title}>
              <Text className='order-stub-section__title'>
                {section.title}
              </Text>
              {section.fields.map(renderField)}
            </View>
          ))}

          {(stub.size.available || packageFee?.available) && (
            <View className='order-stub-section'>
              <View className='order-stub-section__head'>
                <Text className='order-stub-section__title'>货物补充</Text>
                <Text className='order-stub-section__hint'>只读明细</Text>
              </View>
              {stub.size.available && (
                <View className='order-stub-size'>
                  <Text className='order-stub-size__title'>尺寸详情</Text>
                  {stub.size.rows.map((row) => (
                    <Text className='order-stub-size__row' key={row}>
                      {row}
                    </Text>
                  ))}
                  <Text className='order-stub-size__notice'>
                    {stub.size.notice}
                  </Text>
                </View>
              )}
              {packageFee?.available && (
                <View className='order-stub-package'>
                  <View className='order-stub-package__head'>
                    <Text className='order-stub-package__title'>包装费用</Text>
                    <Text className='order-stub-package__amount'>
                      {packageFee.totalAmount}
                    </Text>
                  </View>
                  {packageFee.groups.map(renderPackageFeeGroup)}
                </View>
              )}
            </View>
          )}

          <View className='order-stub-section'>
            <View className='order-stub-section__head'>
              <Text className='order-stub-section__title'>照片凭证</Text>
              <Text className='order-stub-section__hint'>
                {imagesLoading ? '查询中' : '只读预览'}
              </Text>
            </View>
            {imagesLoading && (
              <Text className='order-stub-section__empty'>
                正在查询揽收/签收照片...
              </Text>
            )}
            {!imagesLoading &&
              images?.groups.map((group) => renderImageGroup(group))}
            {!imagesLoading && images && !images.groups.length && (
              <Text className='order-stub-section__empty'>
                {images.message || '暂未查询到揽收/签收照片'}
              </Text>
            )}
          </View>

          {document && (
            <View className='order-stub-section'>
              <View className='order-stub-section__head'>
                <Text className='order-stub-section__title'>单据票证</Text>
                <Text className='order-stub-section__hint'>
                  {document.statusText}
                </Text>
              </View>
              <View className='order-stub-document'>
                <View
                  className={
                    document.canPreview
                      ? 'order-stub-document__mark order-stub-document__mark--ready'
                      : 'order-stub-document__mark'
                  }
                >
                  <Text className='order-stub-document__mark-text'>PDF</Text>
                </View>
                <View className='order-stub-document__content'>
                  <Text className='order-stub-document__title'>
                    {document.title}
                  </Text>
                  <Text className='order-stub-document__summary'>
                    {document.summary}
                  </Text>
                </View>
                <View
                  className={
                    document.canPreview
                      ? 'order-stub-document__button'
                      : 'order-stub-document__button order-stub-document__button--disabled'
                  }
                  onClick={handleOpenDocument}
                >
                  <Text className='order-stub-document__button-text'>
                    {document.actionText}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {stub.notices.map((notice) => (
            <View
              className={
                notice.tone === 'warning'
                  ? 'order-stub-notice order-stub-notice--warning'
                  : 'order-stub-notice'
              }
              key={notice.title}
            >
              <Text className='order-stub-notice__title'>{notice.title}</Text>
              <Text className='order-stub-notice__content'>
                {notice.content}
              </Text>
            </View>
          ))}

          <View className='order-stub-actions'>
            <View className='order-stub-secondary' onClick={loadStub}>
              <Text className='order-stub-secondary__text'>刷新</Text>
            </View>
            <View className='order-stub-primary' onClick={handleBackToDetail}>
              <Text className='order-stub-primary__text'>返回订单详情</Text>
            </View>
          </View>

          {previewImage && (
            <View className='order-stub-preview-mask'>
              <View className='order-stub-preview-card'>
                <View className='order-stub-preview-card__head'>
                  <Text className='order-stub-preview-card__title'>
                    {previewImage.group.title}
                  </Text>
                  <Text className='order-stub-preview-card__index'>
                    {previewImage.index + 1}/{previewImage.group.images.length}
                  </Text>
                </View>
                <Image
                  className='order-stub-preview-card__image'
                  mode='aspectFit'
                  src={previewImage.image.url}
                />
                <View
                  className='order-stub-preview-card__close'
                  onClick={() => setPreviewImage(null)}
                >
                  <Text className='order-stub-preview-card__close-text'>
                    关闭
                  </Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

export default OrderStubPage
