import { Input, Text, View } from '@tarojs/components'

import {
  AppDialog,
  AppPressable
} from '../../../../shared/components'
import { APP_NATIVE_TOKENS } from '../../../../styles/nativeTokens'

import type { InvoiceOrderAuthChallenge } from '../../../../services/invoice'

import './OrderAuthDialog.scss'

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
  <AppDialog
    backdropClassName='invoice-auth'
    contentSpacing={false}
    description={auth.summary}
    descriptionClassName='invoice-auth__summary'
    panelClassName='invoice-auth__panel'
    title='该运单开票需要验证'
    titleClassName='invoice-auth__title'
    visible
    onClose={onClose}
  >
    {!!message && <Text className='invoice-auth__message'>{message}</Text>}

    <View className='invoice-auth__field'>
      <Input
        className='invoice-auth__input'
        maxlength={auth.maxLength}
        placeholder={auth.placeholder}
        style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
        type={auth.inputType}
        value={value}
        onBlur={event => onChange(event.detail.value.replace(/\s/g, ''))}
        onInput={event => onChange(event.detail.value)}
      />
      {auth.authType === '04' && (
        <AppPressable
          accessibilityLabel={
            countdown > 0
              ? `${countdown}秒后可重新发送`
              : sending
                ? '正在发送验证码'
                : '发送验证码'
          }
          className={
            countdown > 0
              ? 'invoice-auth__send invoice-auth__send--disabled'
              : 'invoice-auth__send'
          }
          onPress={onSendCode}
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
        </AppPressable>
      )}
    </View>

    <View className='invoice-auth__actions'>
      <AppPressable
        accessibilityLabel='取消运单验证'
        className='invoice-auth__button invoice-auth__button--ghost'
        onPress={onClose}
      >
        <Text className='invoice-auth__button-text invoice-auth__button-text--ghost'>
          取消
        </Text>
      </AppPressable>
      <AppPressable
        accessibilityLabel={submitting ? '正在验证运单' : '验证运单'}
        className={
          submitting
            ? 'invoice-auth__button invoice-auth__button--disabled'
            : 'invoice-auth__button'
        }
        onPress={onConfirm}
      >
        <Text className='invoice-auth__button-text'>
          {submitting ? '验证中...' : '验证'}
        </Text>
      </AppPressable>
    </View>
  </AppDialog>
)
