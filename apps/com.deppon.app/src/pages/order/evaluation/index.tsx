import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useCallback, useMemo, useState } from 'react'

import { OrderEvaluationForm } from './components/OrderEvaluationForm'
import { getCurrentUser } from '../../../services/auth'
import {
  applyOrderEvaluationSubmission,
  createOrderEvaluationDraft,
  createOrderEvaluationFallbackWebUri,
  orderEvaluationService,
  orderService,
  toggleOrderEvaluationLabel,
  updateOrderEvaluationLevel,
  updateOrderEvaluationSuggestion,
  validateOrderEvaluationDraft
} from '../../../services/order'
import {
  AppButton,
  AppEmptyState,
  AppLoadingState,
  AppPage,
  AppPageHeader,
  AppStatusTag
} from '../../../shared/components'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type {
  OrderDetail,
  OrderEvaluationView,
  OrderRole
} from '../../../services/order'

import './content.scss'

interface OrderEvaluationRouteParams {
  orderNumber: string
  waybillNumber: string
  role: OrderRole
  source: string
}

function parseRouteParams(
  params: Record<string, string | undefined>
): OrderEvaluationRouteParams {
  return {
    orderNumber: (params.orderNumber || params.orderNo || '').trim(),
    waybillNumber: (params.waybillNumber || params.waybillNo || '').trim(),
    role: params.role === 'receive' ? 'receive' : 'sender',
    source: params.source?.trim() || 'ORDER_DETAIL'
  }
}

const OrderEvaluationPage = () => {
  const router = useRouter()
  const routeParams = useMemo(
    () =>
      parseRouteParams(
        router.params as Record<string, string | undefined>
      ),
    [router.params]
  )
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [evaluation, setEvaluation] = useState<OrderEvaluationView | null>(
    null
  )
  const [draft, setDraft] = useState(() => createOrderEvaluationDraft())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const validation = useMemo(
    () => validateOrderEvaluationDraft(draft),
    [draft]
  )

  const loadEvaluation = useCallback(async () => {
    if (!routeParams.waybillNumber && !routeParams.orderNumber) {
      setErrorMessage('缺少订单号或运单号，暂无法加载评价')
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')
    setEvaluation(null)

    try {
      const detailResponse = await orderService.queryDetail({
        orderNumber: routeParams.orderNumber,
        waybillNumber: routeParams.waybillNumber
      })

      if (!detailResponse.status || !detailResponse.result) {
        setDetail(null)
        setErrorMessage(detailResponse.message || '暂未获取到订单详情')
        return
      }

      const nextDetail = detailResponse.result
      setDetail(nextDetail)

      const evaluationResponse = await orderEvaluationService.query(
        nextDetail,
        routeParams.role
      )

      if (!evaluationResponse.status || !evaluationResponse.result) {
        setErrorMessage(evaluationResponse.message || '暂未获取到评价信息')
        return
      }

      setEvaluation(evaluationResponse.result)
      setDraft(createOrderEvaluationDraft(evaluationResponse.result.level))
    } catch {
      setErrorMessage('评价信息加载失败，请检查网络后重试')
    } finally {
      setLoading(false)
    }
  }, [routeParams])

  useDidShow(() => {
    const redirectUrl = createAppRouteUrl(
      APP_ROUTES.orderEvaluation,
      {
        orderNumber: routeParams.orderNumber,
        waybillNumber: routeParams.waybillNumber,
        role: routeParams.role,
        source: routeParams.source
      }
    )

    if (ensureAuthenticated({ redirectUrl, replace: true })) {
      void loadEvaluation()
    }
  })

  const handleOpenWebFallback = () => {
    if (!detail) {
      return
    }

    const uri = createOrderEvaluationFallbackWebUri(
      detail,
      routeParams.role,
      getCurrentUser()?.mobile || ''
    )

    navigateToAppRoute(
      createAppWebUrl({
        source: 'ORDER_DETAIL_EVALUATE',
        uri,
        title: '服务评价',
        auth: true
      }),
      { login: true }
    )
  }

  const handleSubmit = async () => {
    if (!evaluation || evaluation.committed || submitting) {
      return
    }

    if (!validation.valid) {
      Taro.showToast({
        title: validation.message,
        icon: 'none'
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await orderEvaluationService.submit(evaluation, draft)

      if (!response.status) {
        Taro.showToast({
          title: response.message || '评价提交失败，请稍后重试',
          icon: 'none'
        })
        return
      }

      setEvaluation(applyOrderEvaluationSubmission(evaluation, draft))
      Taro.showToast({
        title: '评价成功，感谢您的反馈',
        icon: 'none'
      })
    } catch {
      Taro.showToast({
        title: '评价提交失败，请检查网络后重试',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const footer =
    evaluation && !evaluation.committed ? (
      <View className='order-evaluation-footer'>
        <AppButton
          disabled={!validation.valid}
          label='匿名提交评价'
          loading={submitting}
          loadingLabel='正在提交'
          onPress={handleSubmit}
        />
      </View>
    ) : undefined

  return (
    <AppPage
      footer={footer}
      keyboardAvoiding
      safeArea='bottom'
      statusBar='dark'
      surface='page'
    >
      <ScrollView className='order-evaluation-page' scrollY>
        <AppPageHeader
          eyebrow='SERVICE REVIEW'
          subtitle={`运单 ${routeParams.waybillNumber || '--'}`}
          title='服务评价'
        />

        {loading ? (
          <AppLoadingState label='正在加载评价信息' />
        ) : errorMessage ? (
          <AppEmptyState
            action={
              <View className='order-evaluation-error-actions'>
                <AppButton
                  density='compact'
                  label='重新加载'
                  onPress={loadEvaluation}
                />
                {detail ? (
                  <AppButton
                    density='compact'
                    label='使用网页评价'
                    variant='secondary'
                    onPress={handleOpenWebFallback}
                  />
                ) : null}
              </View>
            }
            description={errorMessage}
            title='暂无法加载原生评价'
            tone='error'
          />
        ) : evaluation ? (
          <>
            <View className='order-evaluation-overview'>
              <View className='order-evaluation-overview__main'>
                <Text className='order-evaluation-overview__name'>
                  {evaluation.courierName}
                </Text>
                <Text className='order-evaluation-overview__summary'>
                  {evaluation.recordType === 'DELIVERY'
                    ? '派送服务'
                    : '揽收服务'}
                  {' · '}
                  {evaluation.courierRole === 'Driver' ? '司机' : '快递员'}
                  {evaluation.averageLevel
                    ? ` · 平均 ${evaluation.averageLevel.toFixed(1)} 星`
                    : ''}
                </Text>
              </View>
              <AppStatusTag
                label={evaluation.committed ? '已评价' : '待评价'}
                tone={evaluation.committed ? 'success' : 'warning'}
              />
            </View>

            {evaluation.committed ? (
              <View className='order-evaluation-result'>
                <Text className='order-evaluation-result__score'>
                  {evaluation.level} 星
                </Text>
                <Text className='order-evaluation-result__title'>
                  本次服务评价已提交
                </Text>
                <Text className='order-evaluation-result__summary'>
                  {evaluation.label || '感谢你对本次服务的反馈'}
                </Text>
              </View>
            ) : (
              <OrderEvaluationForm
                draft={draft}
                recordType={evaluation.recordType}
                validation={validation}
                onLabelToggle={label =>
                  setDraft(current =>
                    toggleOrderEvaluationLabel(
                      current,
                      evaluation.recordType,
                      label
                    )
                  )
                }
                onLevelChange={level =>
                  setDraft(current =>
                    updateOrderEvaluationLevel(current, level)
                  )
                }
                onSuggestionChange={suggestion =>
                  setDraft(current =>
                    updateOrderEvaluationSuggestion(current, suggestion)
                  )
                }
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </AppPage>
  )
}

export default OrderEvaluationPage
