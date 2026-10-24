import { Image, Input, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { useEffect, useMemo, useRef, useState } from 'react'

import loginBackground from '@/assets/login/login-bg.png'
import loginLabel from '@/assets/login/login-label.png'
import alipayLogo from '@/assets/login/logo-alipay.png'
import wechatLogo from '@/assets/login/logo-wechat.png'
import { authService, isValidMobile, isValidSmsCode } from '@/services/auth'
import { shouldOfferCaptcha } from '@/services/captcha'
import { AppPressable, AppRadio } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { AppFormScrollView, AppKeyboardAvoidingView } from '@/shared/native'
import { navigateToAppRoute, navigateToAppRouteAsync } from '@/shared/navigation/appNavigation'
import { hasValidSession } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { normalizeAppRouteUrlParam } from '@/shared/navigation/routeUrl'
import { shareWithApp } from '@/shared/platform'
import { createAppWebUrl } from '@/shared/webview/appWeb'
import type { AppWebSource } from '@/shared/webview/appWeb'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ClickWordCaptcha } from './components/ClickWordCaptcha'
import { LoginAgreementSheet } from './components/LoginAgreementSheet'

import './index.scss'
import './content.scss'

const SMS_COUNTDOWN_SECONDS = 60

const LoginPage = () => {
  const router = useRouter()
  const redirectUrl = useMemo(() => normalizeAppRouteUrlParam(router.params.redirectUrl), [router.params.redirectUrl])
  const [mobile, setMobile] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [agreementSheetVisible, setAgreementSheetVisible] = useState(false)
  const pendingAgreementActionRef = useRef<'send' | 'login' | null>(null)
  const [captchaVisible, setCaptchaVisible] = useState(false)
  const [captchaVerification, setCaptchaVerification] = useState('')
  const captchaRetryRef = useRef(false)
  const [sessionReady, setSessionReady] = useState(() => hasValidSession() && Boolean(authService.getCachedUser()))
  const mountedRef = useRef(true)
  const targetUrl = redirectUrl || APP_ROUTES.mine
  const canSend = !sessionReady && isValidMobile(mobile) && !sending && countdown <= 0
  const canSubmit = !sessionReady && isValidMobile(mobile) && isValidSmsCode(smsCode) && agreementAccepted && !submitting
  const codeButtonLabel = sending ? '发送中' : countdown > 0 ? `${countdown}秒后重试` : '获取验证码'

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (countdown <= 0) {
      return undefined
    }

    const timer = setInterval(() => {
      setCountdown(current => (current > 1 ? current - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const requestSendSms = async (verification?: string) => {
    setSending(true)

    try {
      const response = await authService.sendLoginSms(mobile, verification)

      if (!mountedRef.current) {
        return
      }

      Taro.showToast({
        title: response.status ? '验证码已发送' : response.message || '验证码发送失败',
        icon: 'none'
      })

      if (response.status) {
        setCountdown(SMS_COUNTDOWN_SECONDS)
        return
      }

      // 频控失败转点选验证码,通过后携带凭证自动重试(精确触发 code 待接口确认)
      if (shouldOfferCaptcha(response.message)) {
        captchaRetryRef.current = true
        setCaptchaVisible(true)
      }
    } catch {
      if (mountedRef.current) {
        Taro.showToast({
          title: '验证码发送失败，请检查网络后重试',
          icon: 'none'
        })
      }
    } finally {
      if (mountedRef.current) {
        setSending(false)
      }
    }
  }

  const handleSendSms = async () => {
    if (!canSend) {
      Taro.showToast({
        title: countdown > 0 ? '请稍后再试' : '请先填写正确的手机号',
        icon: 'none'
      })
      return
    }

    if (!agreementAccepted) {
      // 未勾选协议先弹确认层，同意后继续发送验证码
      pendingAgreementActionRef.current = 'send'
      setAgreementSheetVisible(true)
      return
    }

    await requestSendSms(captchaVerification || undefined)
  }

  const handleCaptchaVerified = (verification: string) => {
    setCaptchaVerification(verification)
    setCaptchaVisible(false)

    if (captchaRetryRef.current) {
      captchaRetryRef.current = false
      requestSendSms(verification)
    }
  }

  const returnAfterLogin = async () => {
    const navigated = await navigateToAppRouteAsync(targetUrl, {
      failureMessage: '登录已完成，但返回页面失败，请点击重试',
      replace: true
    })

    if (navigated) {
      Taro.showToast({
        title: '登录成功',
        icon: 'none'
      })
    }

    return navigated
  }

  const submitLogin = async () => {
    setSubmitting(true)

    try {
      const result = await authService.loginWithSms(mobile, smsCode, targetUrl, captchaVerification || undefined)

      if (!mountedRef.current) {
        return
      }

      if (!result.status) {
        Taro.showToast({
          title: result.message,
          icon: 'none'
        })

        // 登录失败若为频控信号,弹验证码;凭证留待下次登录提交携带
        if (shouldOfferCaptcha(result.message)) {
          setCaptchaVisible(true)
        }

        return
      }

      setSessionReady(true)
      await returnAfterLogin()
    } catch {
      if (mountedRef.current) {
        Taro.showToast({
          title: '登录失败，请检查网络后重试',
          icon: 'none'
        })
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false)
      }
    }
  }

  const handleSubmit = async () => {
    if (submitting) {
      return
    }

    if (sessionReady) {
      setSubmitting(true)

      try {
        await returnAfterLogin()
      } finally {
        if (mountedRef.current) {
          setSubmitting(false)
        }
      }

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
      // 未勾选协议先弹确认层，同意后继续登录
      pendingAgreementActionRef.current = 'login'
      setAgreementSheetVisible(true)
      return
    }

    await submitLogin()
  }

  const handleAgreementAgree = () => {
    const action = pendingAgreementActionRef.current
    pendingAgreementActionRef.current = null
    setAgreementSheetVisible(false)
    setAgreementAccepted(true)

    // 同意视为已勾选，继续弹层前被拦下的动作
    if (action === 'send') {
      requestSendSms(captchaVerification || undefined)
    } else if (action === 'login') {
      submitLogin()
    }
  }

  const handleAgreementDecline = () => {
    pendingAgreementActionRef.current = null
    setAgreementSheetVisible(false)
  }

  const handlePolicyPress = (source: AppWebSource) => {
    navigateToAppRoute(createAppWebUrl({ source }))
  }

  const handleSkip = () => {
    navigateToAppRoute(APP_ROUTES.mine, {
      replace: true
    })
  }

  const handleBack = () => {
    Taro.navigateBack({ delta: 1 })
  }

  const handleShare = () => {
    shareWithApp({
      source: 'LOGIN',
      title: '德邦快递',
      description: '德邦快递登录'
    }).catch(() => undefined)
  }

  return (
    <AppKeyboardAvoidingView>
      <AppFormScrollView className='login-page' scrollY>
        <View className='login-hero'>
          <Image className='login-hero__background' mode='scaleToFill' src={loginBackground} />
          <View className='login-nav'>
            <AppPressable accessibilityLabel='返回上一页' className='login-nav__back' onPress={handleBack}>
              <AppIcon color={APP_STYLE_COLORS.text.heading} name='chevronLeft' size={64} />
            </AppPressable>
            <AppPressable accessibilityLabel='分享登录页面' className='login-nav__share' onPress={handleShare}>
              <AppIcon color={APP_STYLE_COLORS.text.heading} name='redo' size={48} />
              <Text className='login-nav__share-text'>分享</Text>
            </AppPressable>
          </View>
          <Image className='login-hero__label' mode='scaleToFill' src={loginLabel} />
          <Text className='login-hero__summary'>登录后即可寄件、查件、领取优惠</Text>
        </View>

        <View className='login-card'>
          <View className='login-field'>
            <Text className='login-field__prefix'>+86</Text>
            <Input
              className='login-input'
              maxlength={11}
              placeholderClass='login-input__placeholder'
              placeholder='请输入手机号'
              type='number'
              value={mobile}
              onInput={event => setMobile(event.detail.value.replace(/\D/g, '').slice(0, 11))}
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
              onInput={event => setSmsCode(event.detail.value.replace(/\D/g, '').slice(0, 6))}
            />
            <AppPressable className='login-code-button' onPress={handleSendSms}>
              <Text className='login-code-button__text'>{codeButtonLabel}</Text>
            </AppPressable>
          </View>

          <View className='login-agreement'>
            <AppRadio accessibilityLabel='勾选同意服务协议及隐私政策' checked={agreementAccepted} onChange={() => setAgreementAccepted(current => !current)} />
            <View className='login-agreement__content'>
              <Text className='login-agreement__text'>已阅读并同意</Text>
              <AppPressable contentElement='text' className='login-agreement__link' onPress={() => handlePolicyPress('AUTH_LOGIN_SERVICE_PROTOCOL')}>
                《服务协议》
              </AppPressable>
              <Text className='login-agreement__text'>与</Text>
              <AppPressable contentElement='text' className='login-agreement__link' onPress={() => handlePolicyPress('AUTH_LOGIN_PRIVACY_PROTOCOL')}>
                《隐私政策》
              </AppPressable>
            </View>
          </View>

          <AppPressable block className={canSubmit || sessionReady ? 'login-submit' : 'login-submit login-submit--inactive'} onPress={handleSubmit}>
            <Text className={canSubmit || sessionReady ? 'login-submit__text' : 'login-submit__text login-submit__text--inactive'}>
              {submitting ? (sessionReady ? '返回中' : '登录中') : sessionReady ? '返回原页面' : '立即登录'}
            </Text>
          </AppPressable>

          {!sessionReady && (
            <View className='login-other'>
              <View className='login-other__heading'>
                <View className='login-other__rule' />
                <Text className='login-other__title'>其他登录方式</Text>
                <View className='login-other__rule' />
              </View>
              <View className='login-other__options'>
                <AppPressable accessibilityLabel='微信登录' className='login-other__option' onPress={() => undefined}>
                  <Image className='login-other__icon' mode='aspectFit' src={wechatLogo} />
                </AppPressable>
                <AppPressable accessibilityLabel='支付宝登录' className='login-other__option' onPress={() => undefined}>
                  <Image className='login-other__icon' mode='aspectFit' src={alipayLogo} />
                </AppPressable>
              </View>
            </View>
          )}

          <AppPressable className='login-secondary' onPress={handleSkip}>
            <Text className='login-secondary__text'>暂不登录</Text>
          </AppPressable>
        </View>
      </AppFormScrollView>
      <ClickWordCaptcha visible={captchaVisible} onClose={() => setCaptchaVisible(false)} onVerified={handleCaptchaVerified} />
      <LoginAgreementSheet visible={agreementSheetVisible} onAgree={handleAgreementAgree} onDecline={handleAgreementDecline} />
    </AppKeyboardAvoidingView>
  )
}

export default LoginPage
