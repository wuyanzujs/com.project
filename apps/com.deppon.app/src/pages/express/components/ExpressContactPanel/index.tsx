import { Text, View } from '@tarojs/components'

import { getExpressContactFullAddress } from '@/services/express'
import type {
  ExpressContact,
  ExpressContactTarget,
  ExpressDraft
} from '@/services/express'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

interface ExpressContactCardProps {
  contact: ExpressContact | null
  mark: '寄' | '收'
  markType: 'sender' | 'consignee'
  emptyText: string
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
  emptyText,
  mark,
  markType,
  target,
  onCreateContact,
  onSelectContact
}: ExpressContactCardProps) {
  const contentLabel = contact
    ? `编辑${mark === '寄' ? '寄件人' : '收件人'}`
    : emptyText

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
          {contact ? (
            <>
              <View className='express-contact-card__identity'>
                <Text className='express-contact-card__name' numberOfLines={1}>
                  {contact.name}
                </Text>
                <Text className='express-contact-card__mobile'>
                  {contact.mobile}
                </Text>
              </View>
              <Text className='express-contact-card__address' numberOfLines={2}>
                {getExpressContactFullAddress(contact)}
              </Text>
            </>
          ) : (
            <Text className='express-contact-card__empty'>{emptyText}</Text>
          )}
        </View>
      </AppPressable>
      <AppPressable
        accessibilityLabel={`从地址簿选择${mark === '寄' ? '寄件人' : '收件人'}`}
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
  // 生产 App 只有寄收件都填好时才提供互换，空表单不展示这个入口。
  const canSwap = Boolean(draft.sender && draft.consignee)

  return (
    <View className='express-contact-panel'>
      <ExpressContactCard
        contact={draft.sender}
        emptyText='请选择寄件地址'
        mark='寄'
        markType='sender'
        target='sender'
        onCreateContact={onCreateContact}
        onSelectContact={onSelectContact}
      />
      {canSwap ? (
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
      ) : null}
      <ExpressContactCard
        contact={draft.consignee}
        emptyText='寄到哪里去'
        mark='收'
        markType='consignee'
        target='consignee'
        onCreateContact={onCreateContact}
        onSelectContact={onSelectContact}
      />
    </View>
  )
}
