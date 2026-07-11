import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { authService } from '../../../services/auth'
import { privacyService } from '../../../services/privacy'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type { PrivacyStatusView } from '../../../services/privacy'
import type { AppWebSource } from '../../../shared/webview/appWeb'

import './index.scss'

interface PrivacyLink {
  title: string
  summary: string
  source: AppWebSource
}

const PRIVACY_LINKS: PrivacyLink[] = [
  {
    title: '隐私政策',
    summary: '查看德邦快递隐私政策全文',
    source: 'PRIVACY_SETTINGS_POLICY'
  },
  {
    title: '个人信息清单',
    summary: '查看个人信息收集和使用范围',
    source: 'PRIVACY_SETTINGS_PERSONAL_INFO'
  },
  {
    title: '电子运单服务协议',
    summary: '查看寄件下单相关服务协议',
    source: 'PRIVACY_SETTINGS_SERVICE_PROTOCOL'
  },
  {
    title: '合作方清单',
    summary: '查看第三方合作方处理说明',
    source: 'PRIVACY_SETTINGS_PARTNER_LIST'
  },
  {
    title: '权限调用清单',
    summary: '查看 App 权限调用用途',
    source: 'PRIVACY_SETTINGS_PERMISSION_LIST'
  },
  {
    title: '已签署免赔协议',
    summary: '查看历史签署的免赔相关协议',
    source: 'PRIVACY_SETTINGS_CLAIM_LIST'
  }
]

const PrivacySettingsPage = () => {
  const [privacyStatus, setPrivacyStatus] =
    useState<PrivacyStatusView | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const ensurePrivacyAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.privacySettings,
        replace: true
      }),
    []
  )

  const loadPrivacyStatus = useCallback(async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await privacyService.queryPrivacyStatus()

      if (!response.status || !response.result) {
        setPrivacyStatus(null)
        setErrorMessage(response.message || '暂未获取到隐私设置')
        return
      }

      setPrivacyStatus(response.result)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useDidShow(() => {
    if (ensurePrivacyAccess()) {
      loadPrivacyStatus()
    }
  })

  const handleOpenLink = (source: AppWebSource) => {
    navigateToAppRoute(createAppWebUrl({ source }))
  }

  const handleSaveAgreement = async () => {
    if (!ensurePrivacyAccess() || saving) {
      return
    }

    setSaving(true)

    try {
      const response = await privacyService.savePrivacyAgreement()

      if (!response.status) {
        Taro.showToast({
          title: response.message || '同意条款失败',
          icon: 'none'
        })
        return
      }

      Taro.showToast({
        title: '已同意最新条款',
        icon: 'none'
      })
      loadPrivacyStatus()
    } finally {
      setSaving(false)
    }
  }

  const handleCancelAgreement = async () => {
    if (!ensurePrivacyAccess() || saving) {
      return
    }

    const confirm = await Taro.showModal({
      title: '撤销同意条款',
      content: '撤销后将退出当前登录状态，重新使用账号能力时需要再次登录。',
      cancelText: '取消',
      confirmText: '确定撤销'
    })

    if (!confirm.confirm) {
      return
    }

    setSaving(true)

    try {
      const response = await privacyService.cancelPrivacyAgreement()

      if (!response.status) {
        Taro.showToast({
          title: response.message || '撤销失败',
          icon: 'none'
        })
        return
      }

      await authService.logout()
      Taro.showToast({
        title: '已撤销并退出登录',
        icon: 'none'
      })
      navigateToAppRoute(APP_ROUTES.mine, {
        replace: true
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView className='privacy-settings-page' scrollY>
      <View className='privacy-status'>
        <View>
          <Text className='privacy-status__title'>
            {privacyStatus?.statusText || (loading ? '同步中' : '待同步')}
          </Text>
          <Text className='privacy-status__summary'>
            {privacyStatus?.summary ||
              errorMessage ||
              '进入页面后会自动同步当前账号的隐私政策版本。'}
          </Text>
        </View>
        <Text
          className={
            privacyStatus?.agreedLatest
              ? 'privacy-status__tag privacy-status__tag--ok'
              : 'privacy-status__tag'
          }
        >
          {privacyStatus?.agreedLatest ? '已确认' : '需确认'}
        </Text>
      </View>

      <View className='privacy-version-card'>
        <View className='privacy-version-card__item'>
          <Text className='privacy-version-card__label'>最新版本</Text>
          <Text className='privacy-version-card__value'>
            {privacyStatus?.latestVersion || '--'}
          </Text>
        </View>
        <View className='privacy-version-card__item'>
          <Text className='privacy-version-card__label'>已同意版本</Text>
          <Text className='privacy-version-card__value'>
            {privacyStatus?.agreedVersion || '--'}
          </Text>
        </View>
      </View>

      <View className='privacy-links'>
        <Text className='privacy-links__title'>协议与清单</Text>
        {PRIVACY_LINKS.map((item) => (
          <View
            className='privacy-link'
            key={item.source}
            onClick={() => handleOpenLink(item.source)}
          >
            <View>
              <Text className='privacy-link__title'>{item.title}</Text>
              <Text className='privacy-link__summary'>{item.summary}</Text>
            </View>
            <Text className='privacy-link__arrow'>›</Text>
          </View>
        ))}
      </View>

      <View className='privacy-actions'>
        <View className='privacy-actions__secondary' onClick={loadPrivacyStatus}>
          <Text className='privacy-actions__secondary-text'>
            {loading ? '同步中' : '同步状态'}
          </Text>
        </View>
        <View className='privacy-actions__primary' onClick={handleSaveAgreement}>
          <Text className='privacy-actions__primary-text'>
            {saving ? '处理中' : '同意最新条款'}
          </Text>
        </View>
      </View>

      <View className='privacy-danger' onClick={handleCancelAgreement}>
        <Text className='privacy-danger__text'>
          {saving ? '处理中' : '撤销同意条款'}
        </Text>
      </View>
    </ScrollView>
  )
}

export default PrivacySettingsPage
