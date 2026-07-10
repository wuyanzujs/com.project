import { useState } from 'react'

import { orderService } from '../../../../services/order'

import type {
  OrderDetail,
  OrderDetailActionOptions,
  OrderPickupScheduleView
} from '../../../../services/order'

function getFirstSelection(schedule: OrderPickupScheduleView) {
  const firstDate = schedule.dates[0]

  return {
    selectedDate: firstDate?.date || '',
    selectedTime: firstDate?.slots[0]?.time || ''
  }
}

export function useOrderPickupSchedule() {
  const [schedule, setSchedule] = useState<OrderPickupScheduleView | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setSchedule(null)
    setSelectedDate('')
    setSelectedTime('')
    setLoading(false)
    setSubmitting(false)
  }

  const open = async (
    order: OrderDetail,
    options: OrderDetailActionOptions
  ) => {
    if (loading) {
      return null
    }

    setLoading(true)

    try {
      const response = await orderService.queryPickupSchedule(order, options)

      if (response.status && response.result) {
        const selection = getFirstSelection(response.result)

        setSchedule(response.result)
        setSelectedDate(selection.selectedDate)
        setSelectedTime(selection.selectedTime)
      }

      return response
    } finally {
      setLoading(false)
    }
  }

  const selectDate = (date: string) => {
    const nextDate = schedule?.dates.find(item => item.date === date)

    setSelectedDate(date)
    setSelectedTime(nextDate?.slots[0]?.time || '')
  }

  const selectTime = (time: string) => {
    setSelectedTime(time)
  }

  const submit = async () => {
    if (!schedule || submitting) {
      return null
    }

    setSubmitting(true)

    try {
      const response = await orderService.dispatchPickup({
        orderNumber: schedule.orderNumber,
        beginAcceptTime: selectedTime
      })

      if (response.status) {
        reset()
      }

      return response
    } finally {
      setSubmitting(false)
    }
  }

  const close = () => {
    if (!submitting) {
      reset()
    }
  }

  return {
    schedule,
    selectedDate,
    selectedTime,
    loading,
    submitting,
    open,
    close,
    reset,
    selectDate,
    selectTime,
    submit
  }
}
