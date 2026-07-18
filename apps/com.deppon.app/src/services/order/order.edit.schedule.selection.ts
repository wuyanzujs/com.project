import { createOrderEditScheduleQueryKey } from './order.edit.schedule'
import {
  createOrderEditPickupDateTime,
  findOrderEditPickupTimeSelection,
  getFirstOrderEditPickupTimeSelection
} from './order.edit.schedule.options'

import type { OrderEditPickupTimeSelection } from './order.edit.schedule.options'
import type { OrderEditDraft, OrderEditPickupTimeResponse } from './types'

function normalizeNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

export function selectOrderEditPickupTime(
  draft: OrderEditDraft,
  selection: OrderEditPickupTimeSelection
): OrderEditDraft {
  if (selection.type === 'DISABLE') {
    return draft
  }

  const time = createOrderEditPickupDateTime(selection.date, selection.time)
  const changed =
    time !== draft.schedule.pickup.time ||
    selection.type !== draft.schedule.pickup.type

  return {
    ...draft,
    schedule: {
      ...draft.schedule,
      pickup: {
        ...draft.schedule.pickup,
        time,
        timeSlot: selection.text.trim(),
        type: selection.type,
        nightNoticeAccepted:
          selection.type === 'NIGHT' && !changed
            ? draft.schedule.pickup.nightNoticeAccepted
            : false,
        selectionKey: createOrderEditScheduleQueryKey(draft)
      }
    }
  }
}

export function applyOrderEditPickupTimeResponse(
  draft: OrderEditDraft,
  response: OrderEditPickupTimeResponse
): OrderEditDraft {
  const queryKey = createOrderEditScheduleQueryKey(draft)
  const selection = findOrderEditPickupTimeSelection(
    response,
    draft.schedule.pickup
  )
  const pickPeriodTime = normalizeNumber(response.pickPeriodTime)
  const pickup = {
    ...draft.schedule.pickup,
    nightCapability: response.nightCapability,
    pickPeriodTime: pickPeriodTime > 0 ? pickPeriodTime : undefined
  }
  const nextDraft: OrderEditDraft = {
    ...draft,
    schedule: { ...draft.schedule, pickup }
  }

  if (selection) {
    return selectOrderEditPickupTime(nextDraft, selection)
  }

  if (!pickup.time) {
    const firstSelection = getFirstOrderEditPickupTimeSelection(response)

    return firstSelection
      ? selectOrderEditPickupTime(nextDraft, firstSelection)
      : nextDraft
  }

  if (queryKey !== draft.schedule.initialInputKey) {
    return {
      ...nextDraft,
      schedule: {
        ...nextDraft.schedule,
        pickup: {
          ...pickup,
          time: '',
          timeSlot: '',
          type: 'NORMAL',
          nightNoticeAccepted: false,
          selectionKey: queryKey
        }
      }
    }
  }

  return nextDraft
}

export function acceptOrderEditNightPickupNotice(draft: OrderEditDraft) {
  if (
    draft.schedule.pickup.type !== 'NIGHT' ||
    draft.schedule.pickup.nightNoticeAccepted
  ) {
    return draft
  }

  return {
    ...draft,
    schedule: {
      ...draft.schedule,
      pickup: {
        ...draft.schedule.pickup,
        nightNoticeAccepted: true
      }
    }
  }
}
