import { Input, Text, View } from '@tarojs/components'

import { useState } from 'react'
import type { ReactNode } from 'react'

import type { InputProps } from '@tarojs/components'

import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import './index.scss'

export interface AppFormFieldProps {
  accessibilityLabel?: string
  className?: string
  confirmType?: InputProps['confirmType']
  controlClassName?: string
  disabled?: boolean
  error?: string
  helper?: string
  inputClassName?: string
  label: string
  labelClassName?: string
  maxLength?: number
  name?: string
  placeholder?: string
  required?: boolean
  trailing?: ReactNode
  type?: InputProps['type']
  value: string
  onBlur?: (value: string) => void
  onChange: (value: string) => void
}

export function AppFormField({
  accessibilityLabel,
  className,
  confirmType,
  controlClassName,
  disabled = false,
  error,
  helper,
  inputClassName,
  label,
  labelClassName,
  maxLength,
  name,
  onChange,
  placeholder,
  required = false,
  trailing,
  type = 'text',
  value,
  onBlur
}: AppFormFieldProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View
      className={[
        'app-form-field',
        disabled && 'app-form-field--disabled',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View className='app-form-field__label-row'>
        <Text
          className={['app-form-field__label', labelClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {label}
        </Text>
        {required ? <Text className='app-form-field__required'>*</Text> : null}
      </View>
      <View
        className={[
          'app-form-field__control',
          focused && 'app-form-field__control--focused',
          error && 'app-form-field__control--error',
          disabled && 'app-form-field__control--disabled',
          controlClassName
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Input
          ariaLabel={accessibilityLabel ?? label}
          className={['app-form-field__input', inputClassName]
            .filter(Boolean)
            .join(' ')}
          confirmType={confirmType}
          disabled={disabled}
          maxlength={maxLength}
          name={name}
          placeholder={placeholder}
          placeholderTextColor={APP_STYLE_COLORS.text.placeholder}
          style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
          type={type}
          value={value}
          onBlur={event => {
            setFocused(false)
            onBlur?.(event.detail.value)
          }}
          onFocus={() => setFocused(true)}
          onInput={event => onChange(event.detail.value)}
        />
        {trailing ? <View className='app-form-field__trailing'>{trailing}</View> : null}
      </View>
      {error ? <Text className='app-form-field__error'>{error}</Text> : null}
      {!error && helper ? (
        <Text className='app-form-field__helper'>{helper}</Text>
      ) : null}
    </View>
  )
}
