import { useDidShow } from '@tarojs/taro'

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import {
  consumeExpressWarehouseResult,
  createExpressWarehouseStageKey,
  expectExpressWarehouseResult,
  getExpressWarehouseScreeningMessage,
  resolveExpressWarehouseScreeningDecision,
  showExpressWarehouseConfirmation
} from './warehouseInteraction'
import {
  acknowledgeExpressWarehouseScreening,
  applyExpressWarehouseScreening,
  createExpressWarehouseInputKey,
  expressService,
  rejectExpressWarehouse,
  updateExpressWarehouse
} from '../../../services/express'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type { ExpressDraft } from '../../../services/express'

interface UseExpressWarehouseOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
}

export interface ExpressWarehouseSubmitPreparation {
  draft: ExpressDraft
  proceed: boolean
}

interface QueryScreeningOptions {
  apply?: boolean
}

export function useExpressWarehouse({
  draft,
  setDraft
}: UseExpressWarehouseOptions) {
  const [screeningLoading, setScreeningLoading] = useState(false)
  const [screeningMessage, setScreeningMessage] = useState('')
  const [stagingLoading, setStagingLoading] = useState(false)
  const requestVersion = useRef(0)
  const stagingVersion = useRef(0)
  const lastAutoQueryKey = useRef('')
  const latestDraft = useRef(draft)
  const inputKey = createExpressWarehouseInputKey(draft)
  const latestInputKey = useRef(inputKey)

  latestDraft.current = draft
  latestInputKey.current = inputKey

  useEffect(() => {
    requestVersion.current += 1
    lastAutoQueryKey.current = ''
    setScreeningLoading(false)
    setScreeningMessage('')
  }, [inputKey])

  useEffect(
    () => () => {
      requestVersion.current += 1
      stagingVersion.current += 1
    },
    []
  )

  useDidShow(() => {
    const result = consumeExpressWarehouseResult(latestDraft.current)

    if (!result) {
      return
    }

    latestDraft.current = result.draft
    setDraft(result.draft)
    setScreeningMessage(result.message)
  })

  const queryScreening = useCallback(
    async (
      targetDraft: ExpressDraft = draft,
      options: QueryScreeningOptions = {}
    ) => {
      if (screeningLoading) {
        return null
      }

      const requestKey = createExpressWarehouseInputKey(targetDraft)
      const version = requestVersion.current + 1

      requestVersion.current = version
      setScreeningLoading(true)
      setScreeningMessage('正在识别送货进仓规则')

      try {
        const response = await expressService.queryWarehouseScreening(
          targetDraft
        )

        if (
          requestVersion.current !== version ||
          latestInputKey.current !== requestKey
        ) {
          return null
        }

        if (!response.status || !response.result) {
          setScreeningMessage(response.message || '暂未完成送货进仓筛单')
          return null
        }

        const screening = response.result

        if (options.apply !== false) {
          setDraft(current => {
            if (createExpressWarehouseInputKey(current) !== requestKey) {
              return current
            }

            const nextDraft = applyExpressWarehouseScreening(
              current,
              screening
            )

            latestDraft.current = nextDraft
            return nextDraft
          })
        }
        setScreeningMessage(getExpressWarehouseScreeningMessage(screening))

        return screening
      } catch {
        if (requestVersion.current === version) {
          setScreeningMessage('送货进仓筛单失败，请稍后重试')
        }

        return null
      } finally {
        if (requestVersion.current === version) {
          setScreeningLoading(false)
        }
      }
    },
    [draft, screeningLoading, setDraft]
  )

  useEffect(() => {
    if (
      !draft.selectedProduct ||
      draft.warehouse.screening.inputKey === inputKey ||
      lastAutoQueryKey.current === inputKey
    ) {
      return
    }

    lastAutoQueryKey.current = inputKey
    void queryScreening()
  }, [
    draft.selectedProduct,
    draft.warehouse.screening.inputKey,
    inputKey,
    queryScreening
  ])

  const handleToggle = async () => {
    if (draft.warehouse.enabled) {
      setDraft(current => rejectExpressWarehouse(current))
      setScreeningMessage('已关闭送货进仓服务')
      return
    }

    if (draft.service.deliveryMode === 'PICKSELF') {
      setScreeningMessage('自提订单不能选择送货进仓')
      return
    }

    if (draft.deliveryPreference.type) {
      const confirmed = await showExpressWarehouseConfirmation(
        '切换送货服务',
        '送货进仓和派送偏好不能同时选择，继续后将清除当前派送偏好。',
        '继续开启',
        '取消'
      )

      if (!confirmed) {
        return
      }
    }

    setDraft(current => updateExpressWarehouse(current, { enabled: true }))
    setScreeningMessage('已开启送货进仓，请完善进仓预约信息')
  }

  const handleOpenRules = () => {
    navigateToAppRoute(
      createAppWebUrl({
        source: 'EXPRESS_WAREHOUSE_RULES',
        auth: false
      })
    )
  }

  const handleOpenAppointment = async () => {
    if (
      !ensureAuthenticated({
        message: '请先登录后设置送货进仓'
      })
    ) {
      return
    }

    if (latestDraft.current.service.deliveryMode === 'PICKSELF') {
      setScreeningMessage('自提订单不能设置送货进仓')
      return
    }

    if (latestDraft.current.deliveryPreference.type) {
      const confirmed = await showExpressWarehouseConfirmation(
        '切换送货服务',
        '送货进仓和派送偏好不能同时选择，继续后将清除当前派送偏好。',
        '继续设置',
        '取消'
      )

      if (!confirmed) {
        return
      }
    }

    const currentDraft = latestDraft.current

    if (currentDraft.service.deliveryMode === 'PICKSELF') {
      setScreeningMessage('自提订单不能设置送货进仓')
      return
    }

    const nextDraft = updateExpressWarehouse(currentDraft, { enabled: true })
    const stageDraft = {
      ...nextDraft,
      selectedProduct: currentDraft.selectedProduct
    }
    const requestKey = createExpressWarehouseStageKey(nextDraft)
    const version = stagingVersion.current + 1

    stagingVersion.current = version
    latestDraft.current = nextDraft
    setDraft(nextDraft)
    setStagingLoading(true)
    setScreeningMessage('正在准备送货进仓预约')

    try {
      const response = await expressService.stageWarehouse(stageDraft)

      if (
        stagingVersion.current !== version ||
        createExpressWarehouseStageKey(latestDraft.current) !== requestKey
      ) {
        setScreeningMessage('寄件信息已变化，未打开旧的进仓预约')
        return
      }

      if (!response.status || !response.result?.uri) {
        setScreeningMessage(response.message || '送货进仓预约暂不可用')
        return
      }

      if (!expectExpressWarehouseResult(nextDraft, response.result.stagingId)) {
        setScreeningMessage('送货进仓预约上下文创建失败，请重试')
        return
      }

      navigateToAppRoute(
        createAppWebUrl({
          source: 'EXPRESS_WAREHOUSE',
          uri: response.result.uri
        }),
        {
          login: true,
          message: '请先登录后设置送货进仓'
        }
      )
    } finally {
      setStagingLoading(false)
    }
  }

  const prepareForSubmit = useCallback(
    async (): Promise<ExpressWarehouseSubmitPreparation | null> => {
      const screening = await queryScreening(latestDraft.current, {
        apply: false
      })

      if (!screening) {
        return null
      }

      let currentDraft = latestDraft.current

      if (
        createExpressWarehouseInputKey(currentDraft) !== screening.inputKey
      ) {
        setScreeningMessage('寄件信息已变化，请重新确认送货进仓')
        return null
      }

      let preparedDraft = applyExpressWarehouseScreening(
        currentDraft,
        screening
      )

      if (
        currentDraft.selectedProduct &&
        !preparedDraft.selectedProduct
      ) {
        latestDraft.current = preparedDraft
        setDraft(preparedDraft)
        setScreeningMessage('送货进仓规则已更新，请重新获取产品价格')
        return { draft: preparedDraft, proceed: false }
      }

      const decision = await resolveExpressWarehouseScreeningDecision(
        preparedDraft,
        screening
      )

      if (decision !== 'PROCEED') {
        currentDraft = latestDraft.current

        if (
          createExpressWarehouseInputKey(currentDraft) !== screening.inputKey
        ) {
          setScreeningMessage('寄件信息已变化，请重新确认送货进仓')
          return null
        }

        preparedDraft = applyExpressWarehouseScreening(
          currentDraft,
          screening
        )
      }

      if (decision === 'CANCEL') {
        latestDraft.current = preparedDraft
        setDraft(preparedDraft)
        setScreeningMessage('请确认进仓提示后再提交')
        return { draft: preparedDraft, proceed: false }
      }

      if (decision === 'ACKNOWLEDGE') {
        preparedDraft = acknowledgeExpressWarehouseScreening(preparedDraft)
      } else if (decision === 'ENABLE') {
        preparedDraft = updateExpressWarehouse(preparedDraft, {
          enabled: true
        })
        latestDraft.current = preparedDraft
        setDraft(preparedDraft)
        setScreeningMessage('已开启送货进仓，请完善预约信息并重新获取价格')
        return { draft: preparedDraft, proceed: false }
      } else if (decision === 'REJECT') {
        preparedDraft = rejectExpressWarehouse(preparedDraft)
      }

      latestDraft.current = preparedDraft
      setDraft(preparedDraft)
      return { draft: preparedDraft, proceed: true }
    },
    [queryScreening, setDraft]
  )

  return {
    inputKey,
    loading: screeningLoading,
    message: screeningMessage,
    onOpenAppointment: handleOpenAppointment,
    onOpenRules: handleOpenRules,
    onQuery: () => void queryScreening(),
    onToggle: handleToggle,
    prepareForSubmit,
    stagingLoading
  }
}

export type ExpressWarehouseController = ReturnType<typeof useExpressWarehouse>
