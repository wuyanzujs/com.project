import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { OrderStubActions } from './components/OrderStubActions'
import { OrderStubDetailSections } from './components/OrderStubDetailSections'
import { OrderStubDocumentSection } from './components/OrderStubDocumentSection'
import { OrderStubGoodsSupplement } from './components/OrderStubGoodsSupplement'
import { OrderStubHeader } from './components/OrderStubHeader'
import { OrderStubImageEvidence } from './components/OrderStubImageEvidence'
import { OrderStubImagePreview } from './components/OrderStubImagePreview'
import { OrderStubNoticeList } from './components/OrderStubNoticeList'
import {
  OrderStubEmptyState,
  OrderStubLoadingState
} from './components/OrderStubPageState'
import { OrderStubSummaryCard } from './components/OrderStubSummaryCard'
import { orderService } from '../../../services/order'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { copyTextToClipboard } from '../../../shared/platform/clipboard'

import type { OrderStubImagePreviewState } from './components/OrderStubImagePreview'
import type {
  OrderStubDocumentView,
  OrderStubImagesView,
  OrderStubPackageFeeView,
  OrderStubView
} from '../../../services/order'

import './index.scss'

interface OrderStubRouteParams {
  orderNumber: string
  waybillNumber: string
  role: string
  source: string
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
  return createAppRouteUrl(APP_ROUTES.orderStub, {
    orderNumber: params.orderNumber,
    waybillNumber: params.waybillNumber,
    role: params.role,
    source: params.source
  })
}

function getOrderDetailUrl(params: OrderStubRouteParams) {
  return createAppRouteUrl(APP_ROUTES.orderDetail, {
    orderNumber: params.orderNumber,
    waybillNumber: params.waybillNumber,
    role: params.role,
    source: params.source,
    view: 'secure'
  })
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
    useState<OrderStubImagePreviewState | null>(null)
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

  return (
    <ScrollView className='order-stub-page' scrollY>
      <OrderStubHeader title={stub?.title} subtitle={stub?.subtitle} />

      {loading && !stub && <OrderStubLoadingState />}

      {!loading && !stub && (
        <OrderStubEmptyState
          message={errorMessage}
          onBack={handleBackToDetail}
        />
      )}

      {stub && (
        <>
          <OrderStubSummaryCard stub={stub} onCopy={handleCopy} />
          <OrderStubDetailSections
            sections={stub.sections}
            onCopy={handleCopy}
          />
          <OrderStubGoodsSupplement
            packageFee={packageFee}
            size={stub.size}
          />
          <OrderStubImageEvidence
            images={images}
            loading={imagesLoading}
            onPreview={(group, image, index) =>
              setPreviewImage({ group, image, index })
            }
          />
          <OrderStubDocumentSection
            document={document}
            onOpen={handleOpenDocument}
          />
          <OrderStubNoticeList notices={stub.notices} />
          <OrderStubActions
            onBack={handleBackToDetail}
            onRefresh={loadStub}
          />
          <OrderStubImagePreview
            preview={previewImage}
            onClose={() => setPreviewImage(null)}
          />
        </>
      )}
    </ScrollView>
  )
}

export default OrderStubPage
