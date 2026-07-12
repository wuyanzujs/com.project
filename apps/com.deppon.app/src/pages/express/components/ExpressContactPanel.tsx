import { Text, View } from '@tarojs/components'

import { getExpressContactFullAddress } from '../../../services/express'
import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import type {
  ExpressContact,
  ExpressContactTarget,
  ExpressDraft
} from '../../../services/express'

import './ExpressContactPanel.scss'

interface ExpressContactCardProps {
  contact: ExpressContact | null
  mark: '寄' | '收'
  markType: 'sender' | 'consignee'
  placeholder: string
  target: ExpressContactTarget
  onCreateContact: (target: ExpressContactTarget) => void
  onSelectContact: (target: ExpressContactTarget) => void
}

interface ExpressContactPanelProps {
  draft: Pick<ExpressDraft, 'sender' | 'consignee'>
  onCreateContact: (target: ExpressContactTarget) => void
  onSelectContact: (target: ExpressContactTarget) => void
  onSwapContacts: () => void
}

function ExpressContactCard({
  contact,
  mark,
  markType,
  placeholder,
  target,
  onCreateContact,
  onSelectContact
}: ExpressContactCardProps) {
  const contentLabel = contact ? `编辑${placeholder}` : `新增${placeholder}`
  const addressText = contact
    ? getExpressContactFullAddress(contact)
    : `请选择${placeholder.replace('人', '地址')}`

  return (
    <View className={`express-contact-card express-contact-card--${markType}`}>
      <AppPressable
        accessibilityLabel={contentLabel}
        className='express-contact-card__main'
        flex
        layout='row-start'
        onPress={() => onCreateContact(target)}
      >
        <View
          className={`express-contact-card__mark express-contact-card__mark--${markType}`}
        >
          <Text
            className={`express-contact-card__mark-text express-contact-card__mark-text--${markType}`}
          >
            {mark}
          </Text>
        </View>
        <View className='express-contact-card__content'>
          <View className='express-contact-card__identity'>
            <Text className='express-contact-card__name'>
              {contact?.name || placeholder}
            </Text>
            {contact ? (
              <Text className='express-contact-card__mobile'>
                {contact.mobile}
              </Text>
            ) : null}
          </View>
          <Text className='express-contact-card__address'>{addressText}</Text>
        </View>
      </AppPressable>
      <AppPressable
        accessibilityLabel={`从地址簿选择${placeholder}`}
        className='express-contact-card__address-book'
        onPress={() => onSelectContact(target)}
      >
        <AppIcon
          color={APP_STYLE_COLORS.text.secondary}
          name='bookUser'
          size={APP_NATIVE_TOKENS.icon.default}
        />
        <Text className='express-contact-card__address-book-text'>地址簿</Text>
      </AppPressable>
    </View>
  )
}

export function ExpressContactPanel({
  draft,
  onCreateContact,
  onSelectContact,
  onSwapContacts
}: ExpressContactPanelProps) {
  return (
    <View className='express-contact-panel'>
      <ExpressContactCard
        contact={draft.sender}
        mark='寄'
        markType='sender'
        placeholder='寄件人'
        target='sender'
        onCreateContact={onCreateContact}
        onSelectContact={onSelectContact}
      />
      <View className='express-contact-panel__swap-row'>
        <AppPressable
          accessibilityLabel='互换寄收件人'
          className='express-swap'
          layout='row-center'
          onPress={onSwapContacts}
        >
          <AppIcon
            color={APP_STYLE_COLORS.text.supporting}
            name='chevronDown'
            size={APP_NATIVE_TOKENS.icon.small}
          />
          <Text className='express-swap__text'>互换</Text>
        </AppPressable>
      </View>
      <ExpressContactCard
        contact={draft.consignee}
        mark='收'
        markType='consignee'
        placeholder='收件人'
        target='consignee'
        onCreateContact={onCreateContact}
        onSelectContact={onSelectContact}
      />
    </View>
  )
}
