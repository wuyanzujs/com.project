import { Input, Text, View } from '@tarojs/components'

import type { InvoiceOrderAuthChallenge } from '../../../../services/invoice'

import '../index.scss'

interface OrderAuthDialogProps {
  auth: InvoiceOrderAuthChallenge
  value: string
  message: string
  countdown: number
  sending: boolean
  submitting: boolean
  onChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
  onSendCode: () => void
}

export const OrderAuthDialog = ({
  auth,
  value,
  message,
  countdown,
  sending,
  submitting,
  onChange,
  onClose,
  onConfirm,
  onSendCode
}: OrderAuthDialogProps) => (
  <View className='invoice-auth'>
    <View className='invoice-auth__panel'>
      <Text className='invoice-auth__title'>该运单开票需要验证</Text>
      <Text className='invoice-auth__summary'>{auth.summary}</Text>
      {!!message && <Text className='invoice-auth__message'>{message}</Text>}

      <View className='invoice-auth__field'>
        <Input
          className='invoice-auth__input'
          maxlength={auth.maxLength}
          placeholder={auth.placeholder}
          type={auth.inputType}
          value={value}
          onBlur={(event) => onChange(event.detail.value.replace(/\s/g, ''))}
          onInput={(event) => onChange(event.detail.value)}
        />
        {auth.authType === '04' && (
          <View
            className={
              countdown > 0
                ? 'invoice-auth__send invoice-auth__send--disabled'
                : 'invoice-auth__send'
            }
            onClick={onSendCode}
          >
            <Text
              className={
                countdown > 0
                  ? 'invoice-auth__send-text invoice-auth__send-text--disabled'
                  : 'invoice-auth__send-text'
              }
            >
              {countdown > 0
                ? `${countdown}秒`
                : sending
                  ? '发送中'
                  : '发送验证码'}
            </Text>
          </View>
        )}
      </View>

      <View className='invoice-auth__actions'>
        <View
          className='invoice-auth__button invoice-auth__button--ghost'
          onClick={onClose}
        >
          <Text className='invoice-auth__button-text invoice-auth__button-text--ghost'>
            取消
          </Text>
        </View>
        <View
          className={
            submitting
              ? 'invoice-auth__button invoice-auth__button--disabled'
              : 'invoice-auth__button'
          }
          onClick={onConfirm}
        >
          <Text className='invoice-auth__button-text'>
            {submitting ? '验证中...' : '验证'}
          </Text>
        </View>
      </View>
    </View>
  </View>
)
