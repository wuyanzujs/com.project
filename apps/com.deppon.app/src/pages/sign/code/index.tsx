import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { signService } from '../../../services/sign'
import QRCodeMatrix from '../../../shared/components/QRCodeMatrix'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { copyTextToClipboard } from '../../../shared/platform/clipboard'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type { SignCodeView } from '../../../services/sign'

import './index.scss'

const SignCodePage = () => {
  const [signInfo, setSignInfo] = useState<SignCodeView | null>(null)
  const [realName, setRealName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const ensureSignAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.signCode,
        replace: true
      }),
    []
  )

  const loadSignCode = useCallback(async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await signService.querySignCode()

      if (!response.status || !response.result) {
        setSignInfo(null)
        setErrorMessage(response.message || '暂未获取到签收码')
        return
      }

      setSignInfo(response.result)
      setRealName(response.result.realName)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useDidShow(() => {
    if (ensureSignAccess()) {
      loadSignCode()
    }
  })

  const handleSaveRealName = async () => {
    if (!ensureSignAccess() || saving) {
      return
    }

    const validation = signService.validateRealName(realName)

    if (!validation.status) {
      Taro.showToast({
        title: validation.message,
        icon: 'none'
      })
      return
    }

    setSaving(true)

    try {
      const response = await signService.saveRealName(validation.value)

      if (!response.status) {
        Taro.showToast({
          title: response.message || '保存实名信息失败',
          icon: 'none'
        })
        return
      }

      Taro.showToast({
        title: '实名信息已保存',
        icon: 'none'
      })
      loadSignCode()
    } finally {
      setSaving(false)
    }
  }

  const handleCopySignCode = async () => {
    if (!signInfo?.signCode) {
      Taro.showToast({
        title: '暂无可复制签收码',
        icon: 'none'
      })
      return
    }

    try {
      await copyTextToClipboard(signInfo.signCode)
    } catch {
      Taro.showToast({
        title: '复制失败，请稍后再试',
        icon: 'none'
      })
    }
  }

  const handleOpenPrivacy = () => {
    navigateToAppRoute(
      createAppWebUrl({
        source: 'PRIVACY_SETTINGS_POLICY',
        auth: false
      })
    )
  }

  const hasSignCode = Boolean(signInfo?.signCode)
  const needsRealName = signInfo && !signInfo.hasRealName

  return (
    <ScrollView className='sign-code-page' scrollY>
      <View className='sign-code-card'>
        <View className='sign-code-card__top'>
          <View>
            <Text className='sign-code-card__label'>当前状态</Text>
            <Text className='sign-code-card__title'>
              {signInfo?.statusText || (loading ? '同步中' : '待同步')}
            </Text>
          </View>
          <Text
            className={
              hasSignCode
                ? 'sign-code-card__badge sign-code-card__badge--ok'
                : 'sign-code-card__badge'
            }
          >
            {hasSignCode ? '可出示' : '待生成'}
          </Text>
        </View>
        <Text className='sign-code-card__summary'>
          {signInfo?.summary ||
            errorMessage ||
            '进入页面后会自动同步当前账号的实名签收状态。'}
        </Text>
      </View>

      {needsRealName && (
        <View className='sign-realname'>
          <Text className='sign-realname__title'>实名签收登记</Text>
          <Text className='sign-realname__summary'>
            根据实名签收要求，请填写真实姓名后生成签收码。
          </Text>
          <Input
            className='sign-realname__input'
            placeholder='请输入签收人真实姓名'
            value={realName}
            onInput={(event) => setRealName(event.detail.value)}
          />
          <Text className='sign-realname__protocol'>
            保存即表示你已阅读并同意
            <Text
              className='sign-realname__protocol-link'
              onClick={handleOpenPrivacy}
            >
              隐私政策
            </Text>
          </Text>
          <View className='sign-realname__button' onClick={handleSaveRealName}>
            <Text className='sign-realname__button-text'>
              {saving ? '保存中' : '保存并生成'}
            </Text>
          </View>
        </View>
      )}

      {hasSignCode && (
        <View className='sign-code-panel'>
          <Text className='sign-code-panel__title'>给快递员扫描签收码</Text>
          <View className='sign-code-qrcode'>
            <QRCodeMatrix value={signInfo?.qrPayload || ''} size={320} />
          </View>
          <View className='sign-code-value'>
            <Text className='sign-code-value__text' selectable>
              {signInfo?.signCode}
            </Text>
          </View>
          <Text className='sign-code-panel__hint'>
            {signInfo?.expiresText || '签收码短时有效，请按需刷新'}
          </Text>
          <Text className='sign-code-panel__name'>
            签收人：{signInfo?.realName || '--'}
          </Text>
          <View className='sign-code-actions'>
            <View
              className='sign-code-action sign-code-action--ghost'
              onClick={loadSignCode}
            >
              <Text className='sign-code-action__text sign-code-action__text--ghost'>
                {loading ? '刷新中' : '刷新'}
              </Text>
            </View>
            <View className='sign-code-action' onClick={handleCopySignCode}>
              <Text className='sign-code-action__text'>复制签收码</Text>
            </View>
          </View>
        </View>
      )}

      {!signInfo && !loading && (
        <View className='sign-empty'>
          <Text className='sign-empty__title'>
            {errorMessage || '暂未获取到签收码'}
          </Text>
          <Text className='sign-empty__summary'>
            可稍后刷新，或进入客服中心咨询签收授权问题。
          </Text>
          <View
            className='sign-empty__button'
            onClick={() => navigateToAppRoute(APP_ROUTES.supportCenter)}
          >
            <Text className='sign-empty__button-text'>联系客服</Text>
          </View>
        </View>
      )}

      <View className='sign-rules'>
        <Text className='sign-rules__title'>温馨提示</Text>
        <Text className='sign-rules__text'>
          1、出示签收码代表你本人或收货人授权确认货物送达，请在核验前仔细确认货物状态。
        </Text>
        <Text className='sign-rules__text'>
          2、如发现货物异常，请拒绝签收并立即向派送人员反馈。
        </Text>
        <Text className='sign-rules__text'>
          3、二维码短时有效，如页面停留时间较长，请点击刷新后再出示。
        </Text>
      </View>
    </ScrollView>
  )
}

export default SignCodePage
