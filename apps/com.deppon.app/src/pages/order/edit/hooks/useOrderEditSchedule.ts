import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  acceptOrderEditNightPickupNotice,
  applyOrderEditPickupTimeResponse,
  createOrderEditPickupDateOptions,
  createOrderEditScheduleQueryKey,
  findOrderEditPickupTimeSelection,
  getOrderEditPickupDate,
  getOrderEditPickupTimeSelection,
  isOrderEditDeliveryModeVisible,
  queryOrderEditPickupTimes,
  selectOrderEditPickupTime
} from '../../../../services/order'

import type {
  OrderEditDeliveryMode,
  OrderEditDraft,
  OrderEditPickupTimeResponse
} from '../../../../services/order'

interface UseOrderEditScheduleOptions {
  draft: OrderEditDraft | null
  setDraft: Dispatch<SetStateAction<OrderEditDraft | null>>
}

export function useOrderEditSchedule({
  draft,
  setDraft
}: UseOrderEditScheduleOptions) {
  const [response, setResponse] = useState<OrderEditPickupTimeResponse | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const requestVersion = useRef(0)
  const loadingRef = useRef(false)
  const draftRef = useRef(draft)
  const queryKey = draft ? createOrderEditScheduleQueryKey(draft) : ''
  const latestQueryKey = useRef(queryKey)

  draftRef.current = draft
  latestQueryKey.current = queryKey

  const handleQuery = useCallback(async () => {
    const snapshot = draftRef.current

    if (!snapshot || loadingRef.current) {
      return
    }

    const requestKey = createOrderEditScheduleQueryKey(snapshot)
    const version = requestVersion.current + 1

    requestVersion.current = version
    loadingRef.current = true
    setLoading(true)
    setMessage('')

    try {
      const nextResponse = await queryOrderEditPickupTimes(snapshot)

      if (
        requestVersion.current !== version ||
        latestQueryKey.current !== requestKey
      ) {
        return
      }

      if (!nextResponse.status || !nextResponse.result) {
        setResponse(null)
        setMessage(nextResponse.message || '暂未获取到上门时间')
        return
      }

      const pickupTimeResponse = nextResponse.result
      const matchedSelection = findOrderEditPickupTimeSelection(
        pickupTimeResponse,
        snapshot.schedule.pickup
      )

      setDraft(current => {
        if (
          !current ||
          createOrderEditScheduleQueryKey(current) !== requestKey
        ) {
          return current
        }

        return applyOrderEditPickupTimeResponse(current, pickupTimeResponse)
      })
      setResponse(pickupTimeResponse)

      if (
        snapshot.schedule.pickup.time &&
        !matchedSelection &&
        requestKey === snapshot.schedule.initialInputKey
      ) {
        setMessage('当前订单原上门时间不在最新可选时段中')
      } else {
        setMessage(
          pickupTimeResponse.nightCapability?.enabled
            ? '已加载普通与夜间上门时段'
            : '已加载可用上门时段'
        )
      }
    } catch {
      if (requestVersion.current === version) {
        setResponse(null)
        setMessage('上门时间查询失败，请稍后重试')
      }
    } finally {
      if (requestVersion.current === version) {
        loadingRef.current = false
        setLoading(false)
      }
    }
  }, [setDraft])

  useEffect(() => {
    requestVersion.current += 1
    loadingRef.current = false
    setLoading(false)
    setResponse(null)
    setMessage('')

    if (!queryKey) {
      return undefined
    }

    const timer = setTimeout(() => {
      void handleQuery()
    }, 350)

    return () => clearTimeout(timer)
  }, [handleQuery, queryKey])

  useEffect(
    () => () => {
      requestVersion.current += 1
      loadingRef.current = false
    },
    []
  )

  const dateOptions = useMemo(
    () => createOrderEditPickupDateOptions(response),
    [response]
  )
  const pickup = draft?.schedule.pickup
  const selectedDate = getOrderEditPickupDate(pickup?.time ?? '')
  const selectedTime =
    response && pickup
      ? findOrderEditPickupTimeSelection(response, pickup)?.time ?? ''
      : ''

  const handleDateChange = (date: string) => {
    const dateOption = dateOptions.find(option => option.value === date)
    const selection =
      dateOption?.timeOptions.find(
        option => !option.disabled && option.type === 'NORMAL'
      ) ?? dateOption?.timeOptions.find(option => !option.disabled)

    if (!selection) {
      return
    }

    setDraft(current =>
      current ? selectOrderEditPickupTime(current, selection) : current
    )
  }

  const handleTimeChange = (date: string, time: string) => {
    const selection = getOrderEditPickupTimeSelection(response, date, time)

    if (!selection) {
      return
    }

    setDraft(current =>
      current ? selectOrderEditPickupTime(current, selection) : current
    )
  }

  const handleAcceptNightNotice = () => {
    setDraft(current =>
      current ? acceptOrderEditNightPickupNotice(current) : current
    )
  }

  const handleDeliveryModeChange = (mode: OrderEditDeliveryMode) => {
    if (!mode) {
      return
    }

    setDraft(current =>
      current
        ? {
            ...current,
            schedule: { ...current.schedule, deliveryMode: mode }
          }
        : current
    )
  }

  return {
    dateOptions,
    deliveryVisible: draft ? isOrderEditDeliveryModeVisible(draft) : false,
    loading,
    message,
    onAcceptNightNotice: handleAcceptNightNotice,
    onDateChange: handleDateChange,
    onDeliveryModeChange: handleDeliveryModeChange,
    onQuery: handleQuery,
    onTimeChange: handleTimeChange,
    selectedDate,
    selectedTime,
    showNightNotice:
      pickup?.type === 'NIGHT' && !pickup.nightNoticeAccepted
  }
}

export type OrderEditScheduleController = ReturnType<
  typeof useOrderEditSchedule
>
