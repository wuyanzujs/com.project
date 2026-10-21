import { Input, Text, View } from '@tarojs/components'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import type { ExpressDraft } from '@/services/express'
import { updateExpressValueAdded } from '@/services/express/value-added/valueAdded.rules'
import { queryExpressPowerMachineCategories } from '@/services/express/value-added/valueAdded.service'
import { AppPressable } from '@/shared/components'
import { APP_NATIVE_TOKENS } from '@/styles/nativeTokens'

import './cards.scss'

interface ExtraServiceProps {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
}

function ServiceChoice({ label, onPress, selected }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <AppPressable
      accessibilityLabel={`${selected ? '取消' : '选择'}${label}`}
      className={selected ? 'express-services-choice express-services-choice--selected' : 'express-services-choice'}
      selected={selected}
      onPress={onPress}
    >
      <Text className={selected ? 'express-services-choice__text express-services-choice__text--selected' : 'express-services-choice__text'}>{label}</Text>
    </AppPressable>
  )
}

export function PhotoServiceEditor({ draft, setDraft }: ExtraServiceProps) {
  const photo = draft.valueAdded.photo
  return (
    <View className='express-services-editor'>
      <Text className='express-services-editor__label'>选择拍照环节，可同时选择</Text>
      <View className='express-services-editor__choices'>
        <ServiceChoice
          label='揽收拍照'
          selected={photo.pickup}
          onPress={() =>
            setDraft(current => updateExpressValueAdded(current, { photo: { ...current.valueAdded.photo, pickup: !current.valueAdded.photo.pickup } }))
          }
        />
        <ServiceChoice
          label='拍照签收'
          selected={photo.sign}
          onPress={() =>
            setDraft(current => updateExpressValueAdded(current, { photo: { ...current.valueAdded.photo, sign: !current.valueAdded.photo.sign } }))
          }
        />
      </View>
    </View>
  )
}

export function usePowerMachineCategories() {
  const [categories, setCategories] = useState<string[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [revision, setRevision] = useState(0)
  const version = useRef(0)

  useEffect(() => {
    let active = true
    setStatus('loading')
    const requestVersion = ++version.current
    queryExpressPowerMachineCategories()
      .then(response => {
        if (!active || version.current !== requestVersion) return
        setCategories(response.result)
        setStatus(response.result.length ? 'done' : 'error')
      })
      .catch(() => {
        if (active && version.current === requestVersion) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [revision])

  return { categories, status, retry: () => setRevision(current => current + 1) }
}

export function PowerMachineEditor({ draft, setDraft, controller }: ExtraServiceProps & { controller: ReturnType<typeof usePowerMachineCategories> }) {
  const { categories, status } = controller
  const power = draft.valueAdded.powerMachine
  const [countText, setCountText] = useState(String(power.count))

  useEffect(() => {
    if (!power.enabled || Number(countText) !== power.count) setCountText(String(power.count))
  }, [countText, power.count, power.enabled])

  const patch = (value: Partial<ExpressDraft['valueAdded']['powerMachine']>) => {
    setDraft(current => updateExpressValueAdded(current, { powerMachine: { ...current.valueAdded.powerMachine, ...value } }))
  }

  return (
    <View className='express-services-editor'>
      <ServiceChoice label='不需要通电验机' selected={!power.enabled} onPress={() => patch({ enabled: false })} />
      <Text className='express-services-editor__label'>验机品类</Text>
      {status === 'done' ? (
        <View className='express-services-editor__choices'>
          {categories.map(category => (
            <ServiceChoice
              key={category}
              label={category}
              selected={power.enabled && power.category === category}
              onPress={() => patch({ enabled: true, category, collect: power.collect || !power.delivery })}
            />
          ))}
        </View>
      ) : (
        <View className='express-services-editor__message'>
          <Text className='express-services-editor__hint'>{status === 'loading' ? '正在获取可验机品类' : '暂未获取到可验机品类，无法开启验机服务'}</Text>
          {status === 'error' ? (
            <AppPressable accessibilityLabel='重试获取验机品类' onPress={controller.retry}>
              <Text className='express-services-editor__action'>重试</Text>
            </AppPressable>
          ) : null}
        </View>
      )}
      {power.enabled && status === 'done' && !categories.includes(power.category) ? (
        <Text className='express-services-editor__hint'>原品类当前不可用，请重新选择或取消验机</Text>
      ) : null}
      {power.enabled ? (
        <>
          <Text className='express-services-editor__label'>验机环节，至少选择一项</Text>
          <View className='express-services-editor__choices'>
            <ServiceChoice label='揽收验机' selected={power.collect} onPress={() => patch({ collect: !power.collect })} />
            <ServiceChoice label='派送验机' selected={power.delivery} onPress={() => patch({ delivery: !power.delivery })} />
          </View>
          <Text className='express-services-editor__label'>验机件数（1–99）</Text>
          <Input
            className='express-services-editor__input'
            maxlength={2}
            style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
            type='number'
            value={countText}
            onInput={event => {
              const value = event.detail.value.replace(/\D/g, '')
              setCountText(value)
              patch({ count: value ? Number(value) : 0 })
            }}
            onBlur={() => {
              const count = Math.max(1, Math.min(99, Math.trunc(Number(countText) || 1)))
              setCountText(String(count))
              patch({ count })
            }}
          />
        </>
      ) : null}
    </View>
  )
}
