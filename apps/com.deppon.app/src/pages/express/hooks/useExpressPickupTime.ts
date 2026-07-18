import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  acceptExpressNightPickupNotice,
  applyExpressPickupTime,
  createExpressPickupDateOptions,
  expressService,
  selectExpressPickupTime
} from '../../../services/express'

import type {
  ExpressDraft,
  ExpressPickupTimeResponse,
  ExpressPickupTimeSelection
} from '../../../services/express'

interface UseExpressPickupTimeOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
}

function createPickupQueryKey(draft: ExpressDraft) {
  const sender = draft.sender

  return [
    sender?.province,
    sender?.city,
    sender?.county,
    sender?.town,
    sender?.address,
    draft.goods.count,
    draft.goods.weight,
    draft.goods.volume,
    draft.selectedProduct?.omsProductCode || draft.service.transportMode
  ]
    .map(value => String(value ?? '').trim())
    .join('|')
}

function getPickupDate(value: string) {
  return value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? ''
}

function getSelection(
  response: ExpressPickupTimeResponse | null,
  date: string,
  time: string
): ExpressPickupTimeSelection | null {
  const opening = response?.openingList.find(item => item.date === date)

  if (!opening) {
    return null
  }

  const item = opening.dateList.find(
    candidate => candidate.time === time && candidate.type !== 'DISABLE'
  )

  return item ? { date, ...item } : null
}

export function useExpressPickupTime({
  draft,
  setDraft
}: UseExpressPickupTimeOptions) {
  const [response, setResponse] = useState<ExpressPickupTimeResponse | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const requestVersion = useRef(0)
  const queryKey = createPickupQueryKey(draft)
  const latestQueryKey = useRef(queryKey)

  latestQueryKey.current = queryKey

  useEffect(() => {
    requestVersion.current += 1
    setLoading(false)
    setResponse(null)
    setMessage('')
  }, [queryKey])

  useEffect(
    () => () => {
      requestVersion.current += 1
    },
    []
  )

  const dateOptions = useMemo(
    () => createExpressPickupDateOptions(response),
    [response]
  )
  const selectedDate = getPickupDate(draft.pickup.time)

  const handleQuery = async () => {
    if (loading) {
      return
    }

    if (!draft.sender) {
      setMessage('请先选择寄件地址')
      return
    }

    const version = requestVersion.current + 1
    const requestKey = queryKey

    requestVersion.current = version
    setLoading(true)
    setMessage('')

    try {
      const nextResponse = await expressService.queryPickupTime(draft)

      if (
        requestVersion.current !== version ||
        latestQueryKey.current !== requestKey
      ) {
        return
      }

      if (!nextResponse.status || !nextResponse.result) {
        setMessage(nextResponse.message || '暂未获取到取件时间')
        return
      }

      const pickupTimeResponse = nextResponse.result

      setDraft(current => {
        if (createPickupQueryKey(current) !== requestKey) {
          return current
        }

        return applyExpressPickupTime(current, pickupTimeResponse)
      })
      setResponse(pickupTimeResponse)
      setMessage(
        pickupTimeResponse.nightCapability?.enabled
          ? '已加载普通和夜间取件时段，夜间揽收会产生额外费用'
          : '已加载可用取件时段'
      )
    } catch {
      if (requestVersion.current === version) {
        setMessage('取件时间查询失败，请稍后重试')
      }
    } finally {
      if (requestVersion.current === version) {
        setLoading(false)
      }
    }
  }

  const handleDateChange = (date: string) => {
    const dateOption = dateOptions.find(option => option.value === date)
    const selection = dateOption?.timeOptions.find(
      option => !option.disabled && option.type === 'NORMAL'
    ) ?? dateOption?.timeOptions.find(option => !option.disabled)

    if (!selection) {
      return
    }

    setDraft(current => selectExpressPickupTime(current, selection))
  }

  const handleTimeChange = (date: string, time: string) => {
    const selection = getSelection(response, date, time)

    if (!selection) {
      return
    }

    setDraft(current => selectExpressPickupTime(current, selection))
  }

  const handleAcceptNightNotice = () => {
    setDraft(current => acceptExpressNightPickupNotice(current))
  }

  const selectedTimeOption = getSelection(
    response,
    selectedDate,
    draft.pickup.time
      .replace(`${selectedDate} `, '')
      .trim()
  )

  return {
    dateOptions,
    loading,
    message,
    onAcceptNightNotice: handleAcceptNightNotice,
    onDateChange: handleDateChange,
    onQuery: handleQuery,
    onTimeChange: handleTimeChange,
    selectedDate,
    selectedTime: selectedTimeOption?.time ?? '',
    showNightNotice:
      draft.pickup.type === 'NIGHT' && !draft.pickup.nightNoticeAccepted
  }
}

export type ExpressPickupTimeController = ReturnType<
  typeof useExpressPickupTime
>
