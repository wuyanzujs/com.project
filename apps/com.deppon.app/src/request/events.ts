export type RequestEventName = 'authExpired' | 'rateLimited'

export interface RequestEventPayload {
  url: string
  statusCode: number
  message?: string | null
}

type RequestEventHandler = (payload: RequestEventPayload) => void

const listeners = new Map<RequestEventName, Set<RequestEventHandler>>()

export function onRequestEvent(
  eventName: RequestEventName,
  handler: RequestEventHandler
) {
  const handlers = listeners.get(eventName) ?? new Set<RequestEventHandler>()
  handlers.add(handler)
  listeners.set(eventName, handlers)

  return () => {
    handlers.delete(handler)
  }
}

export function emitRequestEvent(
  eventName: RequestEventName,
  payload: RequestEventPayload
) {
  const handlers = listeners.get(eventName)

  if (!handlers) {
    return
  }

  handlers.forEach((handler) => handler(payload))
}
