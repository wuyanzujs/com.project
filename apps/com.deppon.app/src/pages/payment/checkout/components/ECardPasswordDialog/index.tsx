import { Input, Text, View } from '@tarojs/components'

import { useState } from 'react'

import { AppButton, AppDialog } from '@/shared/components'

import './index.scss'

interface ECardPasswordDialogProps {
  error: string
  submitting: boolean
  visible: boolean
  onClose: () => void
  onConfirm: (password: string) => void
}

/**
 * @description E 卡支付密码弹窗，输入 6 位数字密码。
 */
export function ECardPasswordDialog({ error, submitting, visible, onClose, onConfirm }: ECardPasswordDialogProps) {
  const [password, setPassword] = useState('')

  const handleConfirm = () => {
    if (!submitting) {
      onConfirm(password)
    }
  }

  return (
    <AppDialog visible={visible} title='E卡支付密码' placement='center' closeOnBackdropPress onClose={onClose}>
      <View className='ecard-password'>
        <Text className='ecard-password__hint'>请输入 6 位 E 卡支付密码</Text>
        <Input
          className='ecard-password__input'
          maxlength={6}
          password
          placeholderClass='ecard-password__placeholder'
          placeholder='请输入支付密码'
          type='number'
          value={password}
          onInput={event => setPassword(event.detail.value.replace(/\D/g, '').slice(0, 6))}
        />
        {error ? <Text className='ecard-password__error'>{error}</Text> : null}
        <AppButton block disabled={password.length !== 6} label={submitting ? '处理中' : '确认支付'} loading={submitting} onPress={handleConfirm} />
      </View>
    </AppDialog>
  )
}
