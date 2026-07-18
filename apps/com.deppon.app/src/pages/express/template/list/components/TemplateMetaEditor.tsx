import { Input, Text, View } from '@tarojs/components'

import { useEffect, useState } from 'react'

import { AppDialog, AppPressable } from '../../../../../shared/components'

import type {
  ExpressTemplateDraftMeta,
  ExpressTemplateView
} from '../../../../../services/template'

import './TemplateMetaEditor.scss'

interface TemplateMetaEditorProps {
  saving: boolean
  template: ExpressTemplateView | null
  onClose: () => void
  onSave: (meta: ExpressTemplateDraftMeta) => void
}

export function TemplateMetaEditor({
  onClose,
  onSave,
  saving,
  template
}: TemplateMetaEditorProps) {
  const [name, setName] = useState('')
  const [defaultFlag, setDefaultFlag] = useState<1 | 2>(2)

  useEffect(() => {
    if (!template) {
      return
    }

    setName(template.name.slice(0, 5))
    setDefaultFlag(template.isDefault ? 1 : 2)
  }, [template])

  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }

  const footer = (
    <View className='template-meta-editor__actions'>
      <AppPressable flex
        accessibilityLabel='取消修改模板信息'
        className='template-meta-editor__button template-meta-editor__button--quiet'
        disabled={saving}
        onPress={handleClose}
      >
        <Text className='template-meta-editor__button-text template-meta-editor__button-text--quiet'>
          取消
        </Text>
      </AppPressable>
      <AppPressable flex
        accessibilityLabel='保存模板信息'
        className='template-meta-editor__button'
        disabled={saving}
        onPress={() => onSave({ name, defaultFlag })}
      >
        <Text className='template-meta-editor__button-text'>
          {saving ? '保存中' : '保存'}
        </Text>
      </AppPressable>
    </View>
  )

  return (
    <AppDialog
      closeOnBackdropPress={!saving}
      footer={footer}
      placement='bottom'
      title='编辑模板信息'
      visible={Boolean(template)}
      onClose={handleClose}
    >
      <Text className='template-meta-editor__label'>模板名称</Text>
      <Input
        className='template-meta-editor__input'
        maxlength={5}
        placeholder='最多5个字'
        value={name}
        onInput={event => setName(event.detail.value.slice(0, 5))}
      />
      <Text className='template-meta-editor__count'>{name.length}/5</Text>

      <Text className='template-meta-editor__label template-meta-editor__label--mode'>
        默认状态
      </Text>
      <View className='template-meta-editor__segment'>
        {([2, 1] as const).map(value => {
          const selected = defaultFlag === value

          return (
            <AppPressable flex
              accessibilityLabel={value === 1 ? '设为默认模板' : '设为普通模板'}
              className={
                selected
                  ? 'template-meta-editor__segment-item template-meta-editor__segment-item--active'
                  : 'template-meta-editor__segment-item'
              }
              key={value}
              selected={selected}
              onPress={() => setDefaultFlag(value)}
            >
              <Text
                className={
                  selected
                    ? 'template-meta-editor__segment-text template-meta-editor__segment-text--active'
                    : 'template-meta-editor__segment-text'
                }
              >
                {value === 1 ? '默认模板' : '普通模板'}
              </Text>
            </AppPressable>
          )
        })}
      </View>
    </AppDialog>
  )
}
