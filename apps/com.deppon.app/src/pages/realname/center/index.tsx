import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { realNameService } from '../../../services/realname'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type { RealNameAuthView } from '../../../services/realname'

import './index.scss'

const REAL_NAME_NOTICES = [
  '实名认证后，本人寄件时仅需出示有效身份证件供查验。',
  '身份信息将用于邮件快件实名收寄服务，请确保姓名和身份证号真实一致。',
  '删除实名信息后，寄件时可能需要重新出示证件并采集身份信息。'
]

const RealNameCenterPage = () => {
  const [realNameInfo, setRealNameInfo] =
    useState<RealNameAuthView | null>(null)
  const [name, setName] = useState('')
  const [idCardNo, setIdCardNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [nativeAuthing, setNativeAuthing] = useState(false)
  const [message, setMessage] = useState('')

  const ensureRealNameAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.realNameCenter,
        replace: true
      }),
    []
  )

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const loadRealName = useCallback(async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await realNameService.query()

      if (!response.status || !response.result) {
        setRealNameInfo(null)
        setMessage(response.message || '暂未获取到实名状态')
        return
      }

      setRealNameInfo(response.result)

      if (response.result.authenticated) {
        setName(response.result.name)
        setIdCardNo('')
      }
    } finally {
      setLoading(false)
    }
  }, [loading])

  useDidShow(() => {
    if (ensureRealNameAccess()) {
      loadRealName()
    }
  })

  const handleSubmit = async () => {
    if (submitting) {
      return
    }

    const validation = realNameService.validate(name, idCardNo)

    if (!validation.valid) {
      showToast(validation.message)
      return
    }

    setSubmitting(true)

    try {
      const response = await realNameService.submitManual(
        validation.name,
        validation.idCardNo
      )

      if (!response.status) {
        showToast(response.message || '认证失败，请稍后再试')
        return
      }

      showToast('实名认证已完成')
      setIdCardNo('')
      loadRealName()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = () => {
    if (!realNameInfo?.authenticated || deleting) {
      return
    }

    Taro.showModal({
      title: '删除实名信息',
      content: '删除后，寄件时需重新出示身份证件供快递员核验。',
      confirmText: '确认删除',
      confirmColor: '#b42318',
      success: async (res) => {
        if (!res.confirm) {
          return
        }

        setDeleting(true)

        try {
          const response = await realNameService.deleteRealName(realNameInfo)

          if (!response.status) {
            showToast(response.message || '删除失败，请稍后再试')
            return
          }

          showToast('实名信息已删除')
          setRealNameInfo({
            authenticated: false,
            name: '',
            idCardNo: '',
            maskedIdCardNo: '',
            statusText: '待实名认证',
            summary: '根据实名收寄要求，寄件前需完成身份信息登记或核验。'
          })
          setName('')
          setIdCardNo('')
        } finally {
          setDeleting(false)
        }
      }
    })
  }

  const handleNativeAuth = async () => {
    if (nativeAuthing) {
      return
    }

    setNativeAuthing(true)

    try {
      const response = await realNameService.startNetworkIdentityAuth()

      if (!response.status) {
        showToast(response.message || '实名授权未完成')
        return
      }

      showToast('实名授权已完成')
      loadRealName()
    } catch (error) {
      showToast(getNativeCapabilityErrorMessage(error))
    } finally {
      setNativeAuthing(false)
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

  const authenticated = !!realNameInfo?.authenticated

  return (
    <ScrollView className='real-name-page' scrollY>
      <View
        className={
          authenticated
            ? 'real-name-status real-name-status--ok'
            : 'real-name-status'
        }
      >
        <View className='real-name-status__head'>
          <View>
            <Text className='real-name-status__label'>当前状态</Text>
            <Text className='real-name-status__title'>
              {realNameInfo?.statusText || (loading ? '同步中' : '待同步')}
            </Text>
          </View>
          <Text
            className={
              authenticated
                ? 'real-name-status__badge real-name-status__badge--ok'
                : 'real-name-status__badge'
            }
          >
            {authenticated ? '已认证' : '待认证'}
          </Text>
        </View>
        <Text className='real-name-status__summary'>
          {realNameInfo?.summary ||
            message ||
            '进入页面后会自动同步当前账号实名状态。'}
        </Text>
      </View>

      {authenticated && (
        <View className='real-name-card'>
          <Text className='real-name-card__name'>{realNameInfo?.name}</Text>
          <Text className='real-name-card__id'>
            {realNameInfo?.maskedIdCardNo || '--'}
          </Text>
          <Text className='real-name-card__hint'>
            德邦快递将按隐私政策保护你的实名信息。
          </Text>
          <View className='real-name-card__actions'>
            <View className='real-name-card__ghost-button' onClick={loadRealName}>
              <Text className='real-name-card__ghost-button-text'>
                {loading ? '刷新中' : '刷新'}
              </Text>
            </View>
            <View className='real-name-card__danger-button' onClick={handleDelete}>
              <Text className='real-name-card__danger-button-text'>
                {deleting ? '删除中' : '删除实名'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {!authenticated && (
        <View className='real-name-form'>
          <Text className='real-name-form__title'>身份证实名登记</Text>
          <Text className='real-name-form__summary'>
            请填写二代身份证姓名和号码，提交后由后端完成实名校验。
          </Text>
          <View className='real-name-field'>
            <Text className='real-name-field__label'>真实姓名</Text>
            <Input
              className='real-name-input'
              placeholder='请输入真实姓名'
              maxlength={20}
              value={name}
              onInput={(event) => setName(event.detail.value)}
            />
          </View>
          <View className='real-name-field'>
            <Text className='real-name-field__label'>身份证号</Text>
            <Input
              className='real-name-input'
              placeholder='请输入二代身份证号'
              maxlength={18}
              value={idCardNo}
              onInput={(event) =>
                setIdCardNo(event.detail.value.replace(/\s+/g, '').toUpperCase())
              }
            />
          </View>
          <Text className='real-name-form__protocol'>
            提交即表示你已阅读并同意
            <Text className='real-name-form__link' onClick={handleOpenPrivacy}>
              隐私政策
            </Text>
          </Text>
          <View className='real-name-submit' onClick={handleSubmit}>
            <Text className='real-name-submit__text'>
              {submitting ? '提交中' : '立即认证'}
            </Text>
          </View>

          <View className='real-name-native'>
            <View>
              <Text className='real-name-native__title'>国家网络身份认证</Text>
              <Text className='real-name-native__summary'>
                使用国家网络身份认证服务完成身份核验。
              </Text>
            </View>
            <View className='real-name-native__button' onClick={handleNativeAuth}>
              <Text className='real-name-native__button-text'>
                {nativeAuthing ? '授权中' : '去授权'}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View className='real-name-rules'>
        <Text className='real-name-rules__title'>说明</Text>
        {REAL_NAME_NOTICES.map((item, index) => (
          <Text className='real-name-rules__text' key={item}>
            {index + 1}. {item}
          </Text>
        ))}
      </View>
    </ScrollView>
  )
}

export default RealNameCenterPage
