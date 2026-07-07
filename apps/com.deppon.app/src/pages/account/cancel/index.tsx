import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useEffect, useState } from 'react'

import { accountService } from '../../../services/account'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import {
  createLoginRedirectUrl,
  hasValidSession
} from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'

import type { AccountOverviewView } from '../../../services/account'

import './index.scss'

const CANCEL_WARNINGS = [
  '身份、账号和登录绑定信息将被清除。',
  '账号下保存的历史联系人信息将被清除。',
  '历史在线支付、理赔申请等个人隐私信息将被清除。',
  '未使用优惠券、会员权益和相关服务可能无法继续使用。'
]

const AccountCancelPage = () => {
  const [overview, setOverview] = useState<AccountOverviewView>(() =>
    accountService.getOverview()
  )
  const [code, setCode] = useState('')
  const [countDown, setCountDown] = useState(0)
  const [accepted, setAccepted] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = accepted && code.length === 6 && !submitting

  useEffect(() => {
    if (countDown <= 0) {
      return undefined
    }

    const timer = setTimeout(() => {
      setCountDown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => clearTimeout(timer)
  }, [countDown])

  useDidShow(() => {
    if (!hasValidSession()) {
      navigateToAppRoute(createLoginRedirectUrl(APP_ROUTES.accountCancel), {
        replace: true
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

  const handleSendSms = async () => {
    if (sending) {
      return
    }

    if (countDown > 0) {
      showToast(`请${countDown}秒后再发送验证码`)
      return
    }

    setSending(true)

    try {
      const response = await accountService.sendCancelSms()

      if (!response.status) {
        showToast(response.message || '发送验证码失败，请稍后再试')
        return
      }

      setCountDown(60)
      showToast('验证码已发送')
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = async () => {
    if (!accepted) {
      showToast('请先确认注销影响')
      return
    }

    if (code.length !== 6) {
      showToast('请输入 6 位数字验证码')
      return
    }

    if (submitting) {
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
    <ScrollView className='account-cancel-page' scrollY>
      <View className='account-cancel-header'>
        <Text className='account-cancel-header__label'>Account</Text>
        <Text className='account-cancel-header__title'>注销账号</Text>
        <Text className='account-cancel-header__summary'>
          注销是不可恢复操作，请确认影响后再继续。
        </Text>
      </View>

      <View className='account-cancel-card'>
        <Text className='account-cancel-card__title'>当前账号</Text>
        <Text className='account-cancel-card__mobile'>
          {overview.maskedMobile || '--'}
        </Text>
      </View>

      <View className='account-cancel-section'>
        <Text className='account-cancel-section__title'>温馨提示</Text>
        {CANCEL_WARNINGS.map((item, index) => (
          <Text className='account-cancel-warning' key={item}>
            {index + 1}. {item}
          </Text>
        ))}
      </View>

      <View className='account-cancel-section'>
        <View className='account-cancel-section__head'>
          <Text className='account-cancel-section__title'>短信验证</Text>
          <Text className='account-cancel-section__hint'>
            {countDown > 0 ? `${countDown}秒` : '验证码'}
          </Text>
        </View>
        <View className='account-cancel-code'>
          <Input
            className='account-cancel-code__input'
            placeholder='请输入 6 位验证码'
            type='number'
            maxlength={6}
            value={code}
            onInput={(event) =>
              setCode(event.detail.value.replace(/\D/g, '').slice(0, 6))
            }
          />
          <View className='account-cancel-code__button' onClick={handleSendSms}>
            <Text className='account-cancel-code__button-text'>
              {sending
                ? '发送中'
                : countDown > 0
                  ? `${countDown}秒`
                  : '获取验证码'}
            </Text>
          </View>
        </View>
      </View>

      <View
        className='account-cancel-agreement'
        onClick={() => setAccepted((current) => !current)}
      >
        <View
          className={
            accepted
              ? 'account-cancel-checkbox account-cancel-checkbox--checked'
              : 'account-cancel-checkbox'
          }
        >
          <Text className='account-cancel-checkbox__text'>
            {accepted ? '✓' : ''}
          </Text>
        </View>
        <Text className='account-cancel-agreement__text'>
          我已知晓注销后账号和相关数据将无法恢复
        </Text>
      </View>

      <View
        className={
          canSubmit
            ? 'account-cancel-submit'
            : 'account-cancel-submit account-cancel-submit--disabled'
        }
        onClick={handleSubmit}
      >
        <Text className='account-cancel-submit__text'>
          {submitting ? '提交中' : '确认注销'}
        </Text>
      </View>
    </ScrollView>
  )
}

export default AccountCancelPage
