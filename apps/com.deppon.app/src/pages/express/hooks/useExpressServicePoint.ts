import { useDidShow } from '@tarojs/taro'

import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react'

import type { ExpressDraft } from '@/services/express'
import { applyExpressServicePoint, applyExpressServicePointCandidates } from '@/services/express/pickup/servicePoint.rules'
import { queryService, stationSelection } from '@/services/query'

interface UseExpressServicePointOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
}

/** 自送网点默认按寄件地址匹配最近服务点，并接收查询页的手动选择。 */
export function useExpressServicePoint({ draft, setDraft }: UseExpressServicePointOptions) {
  const addressKey = stationSelection.createAddressKey(draft.sender)
  const dispatch = draft.pickup.dispatch
  const requestVersion = useRef(0)

  useDidShow(() => {
    const selection = stationSelection.consumeSelection('EXPRESS_SERVICE_POINT')

    if (selection) {
      if (dispatch === 'N' && addressKey && selection.addressKey === addressKey) {
        requestVersion.current += 1
      }

      setDraft(current => applyExpressServicePoint(current, selection.station, selection.addressKey ?? ''))
    }
  })

  useEffect(() => {
    if (dispatch !== 'N' || !addressKey) {
      return
    }

    let cancelled = false
    const version = ++requestVersion.current
    const [province, city, county, address] = JSON.parse(addressKey) as string[]
    const params = stationSelection.createParams('EXPRESS_SERVICE_POINT', { province, city, county, address })

    queryService
      .queryStations(stationSelection.createQuery(params))
      .then(response => {
        if (cancelled || requestVersion.current !== version || !response.status || !response.result) {
          return
        }

        const { list } = stationSelection.filterResult('EXPRESS_SERVICE_POINT', response.result)

        setDraft(current => (requestVersion.current === version ? applyExpressServicePointCandidates(current, list, addressKey) : current))
      })
      .catch(() => {
        // 查询失败允许用户稍后通过服务点入口重试，不阻断寄件。
      })

    return () => {
      cancelled = true
    }
  }, [addressKey, dispatch, setDraft])
}
