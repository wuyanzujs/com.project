import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useEffect, useState } from 'react'

import { accountService } from '@/services/account'
import type { AccountOverviewView } from '@/services/account'
import { AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { hasValidSession, navigateToLogin } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'

import './index.scss'
import './content.scss'

const CODE_LENGTH = 6
const RESEND_SECONDS = 60

// 两步注销流程的第二步「注销账号」：卡内展示绑定手机号、6 位验证码格子、
// 重发倒计时，卡外是红色「确认注销」。验证码格子为一次性验证码样式，输入由覆盖在格子上方的透明输入框承接。
const AccountCancelConfirmPage = () => {
  const [overview, setOverview] = useState<AccountOverviewView>(() => accountService.getOverview())
  const [code, setCode] = useState('')
  const [countDown, setCountDown] = useState(RESEND_SECONDS)
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (countDown <= 0) {
      return undefined
    }

    const timer = setTimeout(() => {
      setCountDown(current => Math.max(current - 1, 0))
    }, 1000)

    return () => clearTimeout(timer)
  }, [countDown])

  useDidShow(() => {
    if (!hasValidSession()) {
      navigateToLogin({
        redirectUrl: APP_ROUTES.accountCancelConfirm,
        replace: true,
        message: false
      })
      return
    }

    setOverview(accountService.getOverview())
  })

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const handleResend = async () => {
    if (sending || countDown > 0) {
      return
    }

    setSending(true)

    try {
      const response = await accountService.sendCancelSms()

      if (!response.status) {
        showToast(response.message || '发送验证码失败，请稍后再试')
        return
      }

      setCountDown(RESEND_SECONDS)
      showToast('验证码已发送')
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = async () => {
    if (submitting) {
      return
    }

    if (code.length !== CODE_LENGTH) {
      showToast('请输入 6 位数字验证码')
      return
    }

    setSubmitting(true)

    try {
      const response = await accountService.cancelAccount(code)

      if (!response.status) {
        showToast(response.message || '注销失败，请稍后再试')
        return
      }

      showToast('账号已注销')
      setTimeout(() => {
        navigateToAppRoute(APP_ROUTES.mine, {
          replace: true
        })
      }, 800)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView className='account-cancel-confirm-page' scrollY>
      <View className='account-cancel-confirm-card'>
        <Text className='account-cancel-confirm-card__mobile'>绑定手机号：{overview.maskedMobile || '--'}</Text>

        <AppPressable accessibilityLabel='输入验证码' className='account-cancel-confirm-code' onPress={() => setFocused(true)}>
          {Array.from({ length: CODE_LENGTH }).map((_, index) => (
            <View
              className={code[index] ? 'account-cancel-confirm-code__cell account-cancel-confirm-code__cell--filled' : 'account-cancel-confirm-code__cell'}
              key={index}
            >
              <Text className='account-cancel-confirm-code__digit'>{code[index] || ''}</Text>
            </View>
          ))}
          <Input
            className='account-cancel-confirm-code__input'
            focus={focused}
            maxlength={CODE_LENGTH}
            type='number'
            value={code}
            onBlur={() => setFocused(false)}
            onInput={event => setCode(event.detail.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          />
        </AppPressable>

        <AppPressable accessibilityLabel='重新获取验证码' className='account-cancel-confirm-resend' disabled={countDown > 0 || sending} onPress={handleResend}>
          <Text className='account-cancel-confirm-resend__text'>{countDown > 0 ? `${countDown}s后重试` : sending ? '发送中' : '重新获取验证码'}</Text>
        </AppPressable>
      </View>

      <AppPressable accessibilityLabel='确认注销' className='account-cancel-confirm-submit' disabled={submitting} onPress={handleSubmit}>
        <Text className='account-cancel-confirm-submit__text'>{submitting ? '注销中' : '确认注销'}</Text>
      </AppPressable>
    </ScrollView>
  )
}

export default AccountCancelConfirmPage
