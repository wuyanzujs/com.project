import { ScrollView } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'

import { useMemo } from 'react'

import { OrderAddressSection } from './components/OrderAddressSection'
import {
  OrderDetailFooterActions,
  OrderPublicTrackActions
} from './components/OrderDetailActions'
import { OrderDetailHeader } from './components/OrderDetailHeader'
import {
  OrderDetailEmpty,
  OrderDetailLoading
} from './components/OrderDetailStates'
import { OrderPaymentAlert } from './components/OrderPaymentAlert'
import { OrderPdcFeedbackPanel } from './components/OrderPdcFeedbackPanel'
import { OrderPickupSchedulePanel } from './components/OrderPickupSchedulePanel'
import { OrderSceneSurveyPanel } from './components/OrderSceneSurveyPanel'
import { OrderServiceActions } from './components/OrderServiceActions'
import { OrderStubEntryCard } from './components/OrderStubEntryCard'
import { OrderTrackSection } from './components/OrderTrackSection'
import { OrderTransportSection } from './components/OrderTransportSection'
import { OrderUrgePanel } from './components/OrderUrgePanel'
import { useOrderDetailActions } from './hooks/useOrderDetailActions'
import { useOrderDetailData } from './hooks/useOrderDetailData'
import { useOrderPdcFeedback } from './hooks/useOrderPdcFeedback'
import { useOrderSceneSurvey } from './hooks/useOrderSceneSurvey'
import { getOrderDetailRouteParams } from './orderDetailViewModel'
import { getOrderIdentityText } from '../../../services/order'

import './index.scss'

const OrderDetailPage = () => {
  const router = useRouter()
  const routeParams = useMemo(
    () =>
      getOrderDetailRouteParams(
        router.params as Record<string, string | undefined>
      ),
    [router.params]
  )
  const data = useOrderDetailData(routeParams)
  const pdcFeedback = useOrderPdcFeedback({
    detail: data.detail,
    source: routeParams.source,
    publicTrackMode: data.publicTrackMode
  })
  const sceneSurvey = useOrderSceneSurvey({
    detail: data.detail,
    role: data.detailRole,
    source: routeParams.source,
    publicTrackMode: data.publicTrackMode
  })
  const actions = useOrderDetailActions({
    routeParams,
    detail: data.detail,
    detailRole: data.detailRole,
    publicTrackMode: data.publicTrackMode,
    deletable: data.deletable,
    paymentSummary: data.paymentSummary,
    stubEntry: data.stubEntry,
    urgeAction: data.urgeAction,
    urgePanel: data.urgePanel,
    pickupSchedule: data.pickupSchedule,
    toggleSubscription: data.toggleSubscription,
    setUrgeAction: data.setUrgeAction,
    setUrgePanel: data.setUrgePanel,
    loadDetail: data.loadDetail
  })

  return (
    <ScrollView className='order-detail-page' scrollY>
      <OrderDetailHeader
        title={
          data.detail?.orderClassName ||
          data.trackState ||
          (data.publicTrackMode ? '物流轨迹' : '订单详情')
        }
        identityText={
          data.detail
            ? getOrderIdentityText(data.detail)
            : getOrderIdentityText(routeParams)
        }
        onCopy={actions.handleCopyNumber}
      />

      {!data.detail && !data.publicTrackMode && !data.loading && (
        <OrderDetailEmpty
          title={data.errorMessage || '未查询到订单'}
          buttonText='返回订单列表'
          onPress={actions.handleBackToList}
        />
      )}

      {!data.detail &&
        data.publicTrackMode &&
        !data.loading &&
        !data.tracks.length && (
        <OrderDetailEmpty
          title={data.errorMessage || '未查询到物流轨迹'}
          buttonText='返回首页'
          onPress={actions.handleBackToList}
        />
      )}

      {data.loading && !data.detail && (
        <OrderDetailLoading publicTrackMode={data.publicTrackMode} />
      )}

      {!data.detail && data.publicTrackMode && data.tracks.length > 0 && (
        <>
          <OrderTrackSection
            tracks={data.tracks}
            hintText={data.trackState || '公开查询'}
          />
          <OrderPublicTrackActions
            onRefresh={actions.handleRefresh}
            onOpenSecureDetail={actions.handleOpenSecureDetail}
          />
        </>
      )}

      {data.detail && (
        <>
          <OrderPaymentAlert
            summary={data.paymentSummary}
            paying={actions.paying}
            onPay={actions.handlePayOrder}
          />
          <OrderStubEntryCard
            entry={data.stubEntry}
            onOpen={actions.handleOpenStub}
          />
          <OrderTransportSection
            detail={data.detail}
            onDial={actions.handleDial}
          />
          <OrderAddressSection
            detail={data.detail}
            onDial={actions.handleDial}
          />
          <OrderServiceActions
            actions={data.detailActions}
            onAction={actions.handleDetailAction}
          />
          <OrderTrackSection
            tracks={data.tracks}
            hintText={data.trackState || '基础轨迹'}
            emptyText='暂无物流轨迹，请稍后再试。'
          />
          <OrderDetailFooterActions
            resendActionText={data.resendActionText}
            cancelable={data.cancelable}
            deletable={data.deletable}
            deleting={actions.deleting}
            onRefresh={actions.handleRefresh}
            onResend={actions.handleResendOrder}
            onCancel={actions.handleCancelOrder}
            onDelete={actions.handleDeleteOrder}
            onBackToList={actions.handleBackToList}
          />
        </>
      )}

      <OrderUrgePanel
        panel={data.urgePanel}
        urging={actions.urging}
        onSelect={actions.handleSelectUrgeMenu}
        onClose={actions.handleCloseUrgePanel}
      />
      <OrderPickupSchedulePanel
        schedule={data.pickupSchedule.schedule}
        selectedDate={data.pickupSchedule.selectedDate}
        selectedTime={data.pickupSchedule.selectedTime}
        submitting={data.pickupSchedule.submitting}
        onClose={data.pickupSchedule.close}
        onConfirm={actions.handleConfirmPickupSchedule}
        onSelectDate={data.pickupSchedule.selectDate}
        onSelectTime={data.pickupSchedule.selectTime}
      />
      <OrderPdcFeedbackPanel
        submitting={pdcFeedback.submitting}
        visible={pdcFeedback.visible}
        onClose={pdcFeedback.close}
        onSubmit={pdcFeedback.submit}
      />
      <OrderSceneSurveyPanel
        activeItem={sceneSurvey.activeItem}
        completed={sceneSurvey.completed}
        failedCount={sceneSurvey.failedCount}
        position={sceneSurvey.position}
        submitting={sceneSurvey.submitting}
        total={sceneSurvey.total}
        visible={sceneSurvey.visible && !pdcFeedback.visible}
        onClose={sceneSurvey.close}
        onSubmit={sceneSurvey.submit}
      />
    </ScrollView>
  )
}

export default OrderDetailPage
