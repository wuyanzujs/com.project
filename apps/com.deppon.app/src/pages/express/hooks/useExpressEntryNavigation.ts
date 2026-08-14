import Taro from '@tarojs/taro'

import { useCallback } from 'react'

import type { ExpressDraft } from '@/services/express'
import { templateService } from '@/services/template'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import {
  ensureAuthenticated,
  hasValidSession
} from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'

interface UseExpressEntryNavigationParams {
  draft: ExpressDraft
}

interface UseExpressEntryNavigationResult {
  handleOpenTemplates: () => void
  handleOpenRealName: () => void
  handleOpenBatch: () => void
  handleOpenHelp: () => void
  handleOpenStations: () => void
  handleSaveTemplate: () => void
}

export function useExpressEntryNavigation({
  draft
}: UseExpressEntryNavigationParams): UseExpressEntryNavigationResult {
  const handleOpenTemplates = useCallback(() => {
    navigateToAppRoute(APP_ROUTES.expressTemplateList, {
      login: true
    })
  }, [])

  const handleOpenRealName = useCallback(() => {
    navigateToAppRoute(APP_ROUTES.realNameCenter, { login: true })
  }, [])

  const handleOpenBatch = useCallback(() => {
    navigateToAppRoute(APP_ROUTES.batchExpress, { login: true })
  }, [])

  const handleOpenHelp = useCallback(() => {
    navigateToAppRoute(APP_ROUTES.supportCenter)
  }, [])

  const handleOpenStations = useCallback(() => {
    navigateToAppRoute(APP_ROUTES.stationQuery)
  }, [])

  const handleSaveTemplate = useCallback(() => {
    if (!hasValidSession()) {
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.express,
        message: '请先登录后保存寄件模板'
      })
      return
    }

    const message = templateService.stageDraft(draft)

    if (message) {
      Taro.showToast({
        title: message,
        icon: 'none'
      })
      return
    }

    navigateToAppRoute(APP_ROUTES.expressTemplateCreate, {
      login: true
    })
  }, [draft])

  return {
    handleOpenTemplates,
    handleOpenRealName,
    handleOpenBatch,
    handleOpenHelp,
    handleOpenStations,
    handleSaveTemplate
  }
}
