import { Input, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { useEffect, useMemo, useState } from 'react'

import { authService, isValidMobile, isValidSmsCode } from '../../services/auth'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppWebUrl } from '../../shared/webview/appWeb'

import './index.scss'

const SMS_COUNTDOWN_SECONDS = 60

function normalizeRedirectUrl(value?: string) {
  if (!value) {
    return ''
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const LoginPage = () => {
  const router = useRouter()
  const redirectUrl = useMemo(
    () => normalizeRedirectUrl(router.params.redirectUrl),
    [router.params.redirectUrl]
  )
  const [mobile, setMobile] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const canSend = isValidMobile(mobile) && !sending && countdown <= 0
  const codeButtonLabel = sending
    ? '发送中'
    : countdown > 0
      ? `${countdown}秒后重试`
      : '获取验证码'

  useEffect(() => {
    if (countdown <= 0) {
      return undefined
    }

    const timer = setInterval(() => {
      setCountdown((current) => (current > 1 ? current - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const handleSendSms = async () => {
    if (!canSend) {
      Taro.showToast({
        title: countdown > 0 ? '请稍后再试' : '请先填写正确的手机号',
        icon: 'none'
      })
      return
    }

    setSending(true)

    try {
      const response = await authService.sendLoginSms(mobile)

      Taro.showToast({
        title: response.status
          ? '验证码已发送'
          : response.message || '验证码发送失败',
        icon: 'none'
      })

      if (response.status) {
        setCountdown(SMS_COUNTDOWN_SECONDS)
      }
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = async () => {
    if (submitting) {
      return
    }

    if (!isValidMobile(mobile)) {
      Taro.showToast({
        title: '请先填写正确的手机号',
        icon: 'none'
      })
      return
    }

    if (!isValidSmsCode(smsCode)) {
      Taro.showToast({
        title: '请填写 6 位数字验证码',
        icon: 'none'
      })
      return
    }

    if (!agreementAccepted) {
      Taro.showToast({
        title: '请先阅读并同意协议',
        icon: 'none'
      })
      return
    }

    setSubmitting(true)

    try {
      const result = await authService.loginWithSms(mobile, smsCode)

      if (!result.status) {
        Taro.showToast({
          title: result.message,
          icon: 'none'
        })
        return
      }

      Taro.showToast({
        title: '登录成功',
        icon: 'none'
      })

      navigateToAppRoute(redirectUrl || APP_ROUTES.mine, {
        replace: true
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePolicyPress = (source: string) => {
    Taro.navigateTo({
      url: createAppWebUrl({ source })
    })
  }

  const handleSkip = () => {
    navigateToAppRoute(APP_ROUTES.mine, {
      replace: true
    })
  }

  return (
    <View className='login-page'>
      <View className='login-header'>
        <Text className='login-header__label'>Auth</Text>
        <Text className='login-header__title'>手机号登录</Text>
        <Text className='login-header__summary'>
          App 端首期使用短信验证码登录，微信/支付宝授权、实名核验和会员注册后续通过原生能力接入。
        </Text>
      </View>

      <View className='login-form'>
        <View className='login-field'>
          <Text className='login-field__label'>手机号</Text>
          <Input
            className='login-input'
            maxlength={11}
            placeholder='请输入手机号'
            type='number'
            value={mobile}
            onInput={(event) =>
              setMobile(event.detail.value.replace(/\D/g, '').slice(0, 11))
            }
          />
        </View>

        <View className='login-field'>
          <Text className='login-field__label'>验证码</Text>
          <View className='login-code-row'>
            <Input
              className='login-input login-input--code'
              maxlength={6}
              placeholder='请输入验证码'
              type='number'
              value={smsCode}
              onInput={(event) =>
                setSmsCode(event.detail.value.replace(/\D/g, '').slice(0, 6))
              }
            />
            <View
              className={
                canSend
                  ? 'login-code-button login-code-button--active'
                  : 'login-code-button'
              }
              onClick={handleSendSms}
            >
              <Text
                className={
                  canSend
                    ? 'login-code-button__text login-code-button__text--active'
                    : 'login-code-button__text'
                }
              >
                {codeButtonLabel}
              </Text>
            </View>
          </View>
        </View>

        <View className='login-agreement'>
          <View
            className={
              agreementAccepted
                ? 'login-agreement__checkbox login-agreement__checkbox--checked'
                : 'login-agreement__checkbox'
            }
            onClick={() => setAgreementAccepted((current) => !current)}
          >
            <Text className='login-agreement__check'>
              {agreementAccepted ? '✓' : ''}
            </Text>
          </View>
          <View className='login-agreement__content'>
            <Text className='login-agreement__text'>我已阅读并同意</Text>
            <Text
              className='login-agreement__link'
              onClick={() => handlePolicyPress('AUTH_LOGIN_SERVICE_PROTOCOL')}
            >
              《服务协议》
            </Text>
            <Text className='login-agreement__text'>和</Text>
            <Text
              className='login-agreement__link'
              onClick={() => handlePolicyPress('AUTH_LOGIN_PRIVACY_PROTOCOL')}
            >
              《隐私政策》
            </Text>
          </View>
        </View>

        <View className='login-submit' onClick={handleSubmit}>
          <Text className='login-submit__text'>
            {submitting ? '登录中' : '登录'}
          </Text>
        </View>

        <View className='login-secondary' onClick={handleSkip}>
          <Text className='login-secondary__text'>暂不登录</Text>
        </View>
      </View>
    </View>
  )
}

export default LoginPage
