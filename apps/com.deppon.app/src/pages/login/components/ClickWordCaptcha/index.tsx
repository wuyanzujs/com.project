import { Image, Text, View } from '@tarojs/components'

import { useCallback, useEffect, useRef, useState } from 'react'

import { captchaService, normalizeCaptchaPoints } from '@/services/captcha'
import type { CaptchaPoint, ClickWordCaptchaSession } from '@/services/captcha'
import { AppDialog } from '@/shared/components'
import { AppNativePressable, designPxToDp } from '@/shared/native'

import './index.scss'

const DOT_CENTER_OFFSET = 21
const SUCCESS_DELAY_MS = 600
const FAIL_RELOAD_DELAY_MS = 1000

interface ClickWordCaptchaProps {
  visible: boolean
  onClose: () => void
  /** 校验通过后回传 captchaVerification,由业务请求携带给网关核验 */
  onVerified: (verification: string) => void
}

type CaptchaPhase = 'loading' | 'ready' | 'checking' | 'success' | 'fail' | 'error'

/**
 * @description 点选文字验证码弹层：获取挑战、点选校验并返回 captchaVerification。
 */
export function ClickWordCaptcha({ visible, onClose, onVerified }: ClickWordCaptchaProps) {
  const [phase, setPhase] = useState<CaptchaPhase>('loading')
  const [session, setSession] = useState<ClickWordCaptchaSession | null>(null)
  const [points, setPoints] = useState<CaptchaPoint[]>([])
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [message, setMessage] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const loadSession = useCallback(async () => {
    clearTimer()
    setPhase('loading')
    setPoints([])
    setMessage('')
    setSession(null)

    const nextSession = await captchaService.loadClickWordCaptcha()

    if (nextSession) {
      setSession(nextSession)
      setPhase('ready')
    } else {
      setMessage('加载失败，请刷新')
      setPhase('error')
    }
  }, [clearTimer])

  useEffect(() => {
    if (visible) {
      loadSession()
    } else {
      clearTimer()
    }

    return clearTimer
  }, [clearTimer, loadSession, visible])

  const handleCheck = useCallback(
    async (tapped: CaptchaPoint[], currentSession: ClickWordCaptchaSession) => {
      setPhase('checking')

      const serverPoints = normalizeCaptchaPoints(tapped, displaySize, { width: currentSession.imageWidth, height: currentSession.imageHeight })
      const result = await captchaService.verifyClickWordCaptcha({ points: serverPoints, session: currentSession })

      if (result.status) {
        setPhase('success')
        setMessage('验证成功')
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          onVerified(result.verification)
        }, SUCCESS_DELAY_MS)
        return
      }

      setPhase('fail')
      setMessage('验证失败')
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        loadSession()
      }, FAIL_RELOAD_DELAY_MS)
    },
    [displaySize, loadSession, onVerified]
  )

  const handleTap = useCallback(
    (event: { nativeEvent?: { locationX?: number; locationY?: number } }) => {
      if (!session || phase !== 'ready' || displaySize.width <= 0 || displaySize.height <= 0) {
        return
      }

      const { locationX, locationY } = event.nativeEvent ?? {}

      if (typeof locationX !== 'number' || typeof locationY !== 'number') {
        return
      }

      const tapped = [...points, { x: locationX, y: locationY }]
      setPoints(tapped)

      if (tapped.length >= session.wordList.length) {
        handleCheck(tapped, session)
      }
    },
    [displaySize, handleCheck, phase, points, session]
  )

  const phaseClassName = phase === 'success' ? ' click-captcha__hint--success' : phase === 'fail' ? ' click-captcha__hint--fail' : ''

  const hintText =
    message || (phase === 'loading' ? '加载中……' : phase === 'checking' ? '校验中……' : session ? `请依次点击【${session.wordList.join('，')}】` : '')

  return (
    <AppDialog visible={visible} title='请完成安全验证' placement='center' closeOnBackdropPress onClose={onClose}>
      <View className='click-captcha'>
        <View className='click-captcha__stage'>
          {session ? (
            <View className='click-captcha__image-wrap'>
              <Image className='click-captcha__image' mode='scaleToFill' src={`data:image/png;base64,${session.imageBase64}`} />
              {points.map((point, index) => (
                <View
                  key={`${point.x}-${point.y}-${index}`}
                  className='click-captcha__dot'
                  style={{
                    left: point.x,
                    top: point.y,
                    marginLeft: designPxToDp(-DOT_CENTER_OFFSET),
                    marginTop: designPxToDp(-DOT_CENTER_OFFSET)
                  }}
                >
                  <Text className='click-captcha__dot-text'>{index + 1}</Text>
                </View>
              ))}
              <AppNativePressable
                accessibilityLabel='点选验证码区域'
                overlay
                onLayout={event => {
                  const { width, height } = event.nativeEvent.layout
                  setDisplaySize({ width, height })
                }}
                onPressIn={handleTap}
              />
            </View>
          ) : (
            <View className='click-captcha__image-wrap click-captcha__image-wrap--empty' />
          )}
          <AppNativePressable accessibilityLabel='刷新验证码' onPress={() => loadSession()}>
            <View className='click-captcha__refresh'>
              <Text className='click-captcha__refresh-text'>刷新</Text>
            </View>
          </AppNativePressable>
        </View>
        <View className={`click-captcha__hint${phaseClassName}`}>
          <Text className='click-captcha__hint-text'>{hintText}</Text>
        </View>
      </View>
    </AppDialog>
  )
}
