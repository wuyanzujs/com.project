import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { useEffect, useMemo, useState } from 'react'

import { authService, isValidMobile, isValidSmsCode } from '../../services/auth'
import { AppPressable } from '../../shared/components'
import { AppKeyboardAvoidingView } from '../../shared/native'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppWebUrl } from '../../shared/webview/appWeb'

import type { AppWebSource } from '../../shared/webview/appWeb'


import './index.scss'
import './content.scss'

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

  const handlePolicyPress = (source: AppWebSource) => {
    navigateToAppRoute(createAppWebUrl({ source }))
  }

  const handleSkip = () => {
    navigateToAppRoute(APP_ROUTES.mine, {
      replace: true
    })
  }

  return (
    <AppKeyboardAvoidingView>
      <ScrollView className='login-page' scrollY>
        <View className='login-intro'>
        <Text className='login-intro__title'>登录/注册</Text>
        <Text className='login-intro__summary'>
          欢迎使用德邦快递，竭诚为您服务！
        </Text>
      </View>

      <View className='login-form'>
        <View className='login-field login-field--mobile'>
          <Text className='login-field__prefix'>+86</Text>
          <Input
            className='login-input'
            maxlength={11}
            placeholderClass='login-input__placeholder'
            placeholder='请输入手机号'
            type='number'
            value={mobile}
            onInput={(event) =>
              setMobile(event.detail.value.replace(/\D/g, '').slice(0, 11))
            }
          />
        </View>

        <View className='login-field'>
          <Input
            className='login-input login-input--code'
            maxlength={6}
            placeholderClass='login-input__placeholder'
            placeholder='请输入验证码'
            type='number'
            value={smsCode}
            onInput={(event) =>
              setSmsCode(event.detail.value.replace(/\D/g, '').slice(0, 6))
            }
          />
          <AppPressable className='login-code-button' onPress={handleSendSms}>
            <Text
              className={
                canSend
                  ? 'login-code-button__text login-code-button__text--active'
                  : 'login-code-button__text'
              }
            >
              {codeButtonLabel}
            </Text>
          </AppPressable>
        </View>

        <View className='login-agreement'>
          <AppPressable
            className={
              agreementAccepted
                ? 'login-agreement__checkbox login-agreement__checkbox--checked'
                : 'login-agreement__checkbox'
            }
            onPress={() => setAgreementAccepted((current) => !current)}
          >
            <Text className='login-agreement__check'>
              {agreementAccepted ? '✓' : ''}
            </Text>
          </AppPressable>
          <View className='login-agreement__content'>
            <Text className='login-agreement__text'>我已阅读并同意</Text>
            <AppPressable contentElement='text'
              className='login-agreement__link'
              onPress={() => handlePolicyPress('AUTH_LOGIN_SERVICE_PROTOCOL')}
            >
              《服务协议》
            </AppPressable>
            <Text className='login-agreement__text'>和</Text>
            <AppPressable contentElement='text'
              className='login-agreement__link'
              onPress={() => handlePolicyPress('AUTH_LOGIN_PRIVACY_PROTOCOL')}
            >
              《隐私政策》
            </AppPressable>
          </View>
        </View>

        <AppPressable className='login-submit' onPress={handleSubmit}>
          <Text className='login-submit__text'>
            {submitting ? '登录中' : '登录'}
          </Text>
        </AppPressable>

        <AppPressable className='login-secondary' onPress={handleSkip}>
          <Text className='login-secondary__text'>暂不登录</Text>
        </AppPressable>

        <Text className='login-note'>未注册手机号将自动创建账号</Text>
        </View>
      </ScrollView>
    </AppKeyboardAvoidingView>
  )
}

export default LoginPage
