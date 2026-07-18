import Taro from '@tarojs/taro'

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  EXPRESS_DELIVERY_TIME_WINDOWS,
  createExpressDeliveryAvailabilityKey,
  createExpressScheduledDateOptions,
  createExpressScheduledWindow,
  createExpressUnavailableDateOptions,
  clearExpressWarehouse,
  expressService,
  getExpressScheduledDate,
  getExpressScheduledTimeWindow,
  isExpressScheduledDeliveryProductSupported,
  updateExpressDeliveryPreference
} from '../../../services/express'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'

import type {
  ExpressDeliveryPreferenceType,
  ExpressDraft
} from '../../../services/express'

interface UseExpressDeliveryPreferenceOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
}

function confirmWarehouseReplacement() {
  return new Promise<boolean>(resolve => {
    Taro.showModal({
      title: '切换送货服务',
      content:
        '派送偏好和送货进仓不能同时选择，继续后将清除送货进仓信息。',
      confirmText: '继续选择',
      cancelText: '取消',
      success: result => resolve(Boolean(result.confirm)),
      fail: () => resolve(false)
    })
  })
}

export function useExpressDeliveryPreference({
  draft,
  setDraft
}: UseExpressDeliveryPreferenceOptions) {
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityMessage, setAvailabilityMessage] = useState('')
  const [arrivalReference, setArrivalReference] = useState(
    draft.selectedProduct?.arriveDate ?? ''
  )
  const requestVersion = useRef(0)
  const availabilityQueryKey = createExpressDeliveryAvailabilityKey(draft)
  const latestAvailabilityQueryKey = useRef(availabilityQueryKey)

  latestAvailabilityQueryKey.current = availabilityQueryKey

  useEffect(() => {
    if (draft.selectedProduct?.arriveDate) {
      setArrivalReference(draft.selectedProduct.arriveDate)
    }
  }, [draft.selectedProduct?.arriveDate])

  useEffect(() => {
    requestVersion.current += 1
    setAvailabilityLoading(false)
    setAvailabilityMessage('')
  }, [availabilityQueryKey])

  useEffect(
    () => () => {
      requestVersion.current += 1
    },
    []
  )

  const scheduledDateOptions = useMemo(
    () =>
      createExpressScheduledDateOptions(
        arrivalReference,
        draft.deliveryPreference.scheduledWindow
      ),
    [arrivalReference, draft.deliveryPreference.scheduledWindow]
  )
  const unavailableDateOptions = useMemo(
    () => createExpressUnavailableDateOptions(),
    []
  )
  const selectedScheduledDate = getExpressScheduledDate(
    draft.deliveryPreference.scheduledWindow
  )
  const selectedTimeWindow = getExpressScheduledTimeWindow(
    draft.deliveryPreference.scheduledWindow
  )

  const handleScheduledMode = async () => {
    if (!draft.selectedProduct?.arriveDate) {
      setAvailabilityMessage('请先获取并选择包含预计到达时间的产品')
      return
    }

    if (
      !isExpressScheduledDeliveryProductSupported(
        draft.selectedProduct.omsProductCode
      )
    ) {
      setAvailabilityMessage('当前产品暂不支持定时派送')
      return
    }

    if (
      !ensureAuthenticated({
        message: '请先登录后校验定时派送范围'
      })
    ) {
      return
    }

    const version = requestVersion.current + 1
    const requestKey = availabilityQueryKey

    requestVersion.current = version
    setAvailabilityLoading(true)
    setAvailabilityMessage('')

    try {
      const response = await expressService.queryDeliveryAppointment(draft)

      if (
        requestVersion.current !== version ||
        latestAvailabilityQueryKey.current !== requestKey
      ) {
        return
      }

      if (!response.status || !response.result) {
        setAvailabilityMessage(response.message || '暂未获取到定时派送范围')
        return
      }

      if (!response.result.appointmentDelivery) {
        setAvailabilityMessage('当前收件地址暂不支持定时派送')
        return
      }

      const arriveDate = draft.selectedProduct.arriveDate
      const firstDate = createExpressScheduledDateOptions(arriveDate)[0]
      const firstTime = EXPRESS_DELIVERY_TIME_WINDOWS[0]

      if (!firstDate || !firstTime) {
        setAvailabilityMessage('暂未生成可选派送时间')
        return
      }

      setArrivalReference(arriveDate)
      setDraft(current => {
        if (createExpressDeliveryAvailabilityKey(current) !== requestKey) {
          return current
        }

        return updateExpressDeliveryPreference(
          clearExpressWarehouse(current),
          {
            type: 'SCHEDULED',
            scheduledWindow: createExpressScheduledWindow(
              firstDate.value,
              firstTime.value
            ),
            availabilityKey: requestKey
          }
        )
      })
      setAvailabilityMessage('当前地址支持定时派送，费用以重新报价为准')
    } catch {
      if (requestVersion.current === version) {
        setAvailabilityMessage('定时派送范围查询失败，请稍后重试')
      }
    } finally {
      if (requestVersion.current === version) {
        setAvailabilityLoading(false)
      }
    }
  }

  const handleTypeChange = async (type: ExpressDeliveryPreferenceType) => {
    if (type === draft.deliveryPreference.type) {
      return
    }

    if (type && draft.service.deliveryMode === 'PICKSELF') {
      setAvailabilityMessage('自提订单不能选择预约或通知派送')
      return
    }

    if (
      type &&
      draft.warehouse.enabled &&
      !(await confirmWarehouseReplacement())
    ) {
      return
    }

    if (type === 'SCHEDULED') {
      void handleScheduledMode()
      return
    }

    requestVersion.current += 1
    setAvailabilityLoading(false)
    setAvailabilityMessage('')
    setDraft(current => {
      const nextDraft = type ? clearExpressWarehouse(current) : current

      return updateExpressDeliveryPreference(nextDraft, { type })
    })
  }

  const handleScheduledDateChange = (date: string) => {
    const timeWindow =
      selectedTimeWindow || EXPRESS_DELIVERY_TIME_WINDOWS[0]?.value || ''

    setDraft(current =>
      updateExpressDeliveryPreference(current, {
        type: 'SCHEDULED',
        scheduledWindow: createExpressScheduledWindow(date, timeWindow)
      })
    )
  }

  const handleScheduledTimeChange = (timeWindow: string) => {
    const date = selectedScheduledDate || scheduledDateOptions[0]?.value || ''

    setDraft(current =>
      updateExpressDeliveryPreference(current, {
        type: 'SCHEDULED',
        scheduledWindow: createExpressScheduledWindow(date, timeWindow)
      })
    )
  }

  const handleUnavailableDateToggle = (date: string) => {
    const selected = draft.deliveryPreference.unavailableDates
    const unavailableDates = selected.includes(date)
      ? selected.filter(item => item !== date)
      : [...selected, date]

    setDraft(current =>
      updateExpressDeliveryPreference(current, {
        type: 'NOTIFY_RECEIVER',
        unavailableDates
      })
    )
  }

  return {
    availabilityLoading,
    availabilityMessage,
    scheduledDateOptions,
    selectedScheduledDate,
    selectedTimeWindow,
    timeWindowOptions: EXPRESS_DELIVERY_TIME_WINDOWS,
    unavailableDateOptions,
    onScheduledDateChange: handleScheduledDateChange,
    onScheduledTimeChange: handleScheduledTimeChange,
    onTypeChange: handleTypeChange,
    onUnavailableDateToggle: handleUnavailableDateToggle
  }
}

export type ExpressDeliveryPreferenceController = ReturnType<
  typeof useExpressDeliveryPreference
>
