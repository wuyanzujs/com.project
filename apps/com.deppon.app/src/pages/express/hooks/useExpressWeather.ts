import { useEffect, useRef, useState } from 'react'

import type { ExpressDraft } from '@/services/express'
import { loadWaterproofText } from '@/services/gis'

// 降水横幅依赖的草稿字段：寄件/收件区县 + 取件日 + 产品到达日。
function createWeatherQueryKey(draft: ExpressDraft) {
  const sender = draft.sender
  const consignee = draft.consignee
  const senderDate = draft.pickup.time.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? ''
  const consigneeDate = draft.selectedProduct?.arriveDate?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? ''

  return [sender?.province, sender?.city, sender?.county, senderDate, consignee?.province, consignee?.city, consignee?.county, consigneeDate]
    .map(value => String(value ?? '').trim())
    .join('|')
}

function getTodayText() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** 寄件页降水提示：根据寄收件地区和取派件日期查询雨水天气文案，草稿变化时自动刷新。 */
export function useExpressWeather({ draft }: { draft: ExpressDraft }) {
  const [weatherText, setWeatherText] = useState('')
  const requestVersion = useRef(0)
  const queryKey = createWeatherQueryKey(draft)
  const latestQueryKey = useRef(queryKey)

  latestQueryKey.current = queryKey

  useEffect(() => {
    const [senderProvince, senderCity, senderCounty, senderDate, ...rest] = queryKey.split('|')
    const [consigneeProvince, consigneeCity, consigneeCounty, consigneeDate] = rest
    const hasSender = Boolean(senderProvince && senderCity && senderCounty)
    const hasConsignee = Boolean(consigneeProvince && consigneeCity && consigneeCounty)

    if (!hasSender && !hasConsignee) {
      requestVersion.current += 1
      setWeatherText('')
      return
    }

    const version = requestVersion.current + 1

    requestVersion.current = version

    loadWaterproofText({
      sender: hasSender ? { province: senderProvince, city: senderCity, county: senderCounty } : null,
      senderDate: senderDate || getTodayText(),
      consignee: hasConsignee
        ? {
            province: consigneeProvince,
            city: consigneeCity,
            county: consigneeCounty
          }
        : null,
      consigneeDate
    })
      .then(text => {
        if (requestVersion.current === version && latestQueryKey.current === queryKey) {
          setWeatherText(text)
        }
      })
      .catch(() => {
        if (requestVersion.current === version) {
          setWeatherText('')
        }
      })
  }, [queryKey])

  useEffect(
    () => () => {
      requestVersion.current += 1
    },
    []
  )

  return { weatherText }
}
