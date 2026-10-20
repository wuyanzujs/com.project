import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import { accountService } from '@/services/account'
import type { AccountOverviewView } from '@/services/account'
import { AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { hasValidSession, navigateToLogin } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'

import './index.scss'
import './content.scss'

// 两步注销流程的第一步「账号注销」：绑定手机号 + 温馨提示 4 条 + 获取验证码。
// 点击获取验证码后发送短信验证码并进入第二步「注销账号」（pages/account/cancel/confirm）。
const CANCEL_WARNINGS = ['身份、账号信息将被删除', '账号下保存的历史联系人信息将被清除', '历史在线支付、理赔申请等个人隐私信息将被清除', '优惠券信息将被清除']

const AccountCancelPage = () => {
  const [overview, setOverview] = useState<AccountOverviewView>(() => accountService.getOverview())
  const [sending, setSending] = useState(false)

  useDidShow(() => {
    if (!hasValidSession()) {
      navigateToLogin({
        redirectUrl: APP_ROUTES.accountCancel,
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

  const handleSendSms = async () => {
    if (sending) {
      return
    }

    setSending(true)

    try {
      const response = await accountService.sendCancelSms()

      if (!response.status) {
        showToast(response.message || '发送验证码失败，请稍后再试')
        return
      }

      showToast('验证码已发送')
      navigateToAppRoute(APP_ROUTES.accountCancelConfirm, {
        login: true
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <ScrollView className='account-cancel-page' scrollY>
      <View className='account-cancel-card'>
        <Text className='account-cancel-card__mobile'>绑定手机号：{overview.maskedMobile || '--'}</Text>
        <Text className='account-cancel-card__hint'>温馨提示</Text>
        {CANCEL_WARNINGS.map((item, index) => (
          <Text className='account-cancel-card__warning' key={item}>
            {`${index + 1}.${item}`}
          </Text>
        ))}
      </View>

      <AppPressable accessibilityLabel='获取验证码' className='account-cancel-action' disabled={sending} onPress={handleSendSms}>
        <Text className='account-cancel-action__text'>{sending ? '发送中' : '获取验证码'}</Text>
      </AppPressable>
    </ScrollView>
  )
}

export default AccountCancelPage
