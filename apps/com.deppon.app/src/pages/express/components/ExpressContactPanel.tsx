import { Text, View } from '@tarojs/components'

import { getExpressContactFullAddress } from '../../../services/express'

import type {
  ExpressContact,
  ExpressContactTarget,
  ExpressDraft
} from '../../../services/express'

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
  return (
    <View className='express-contact-card'>
      <View
        className={`express-contact-card__mark express-contact-card__mark--${markType}`}
      >
        <Text className='express-contact-card__mark-text'>{mark}</Text>
      </View>
      <View className='express-contact-card__content'>
        {contact ? (
          <>
            <Text className='express-contact-card__name'>
              {contact.name} {contact.mobile}
            </Text>
            <Text className='express-contact-card__address'>
              {getExpressContactFullAddress(contact)}
            </Text>
          </>
        ) : (
          <>
            <Text className='express-contact-card__name'>{placeholder}</Text>
            <Text className='express-contact-card__address'>
              请选择{placeholder.replace('人', '地址')}
            </Text>
          </>
        )}
      </View>
      <View className='express-contact-card__actions'>
        <Text className='express-link' onClick={() => onSelectContact(target)}>
          地址簿
        </Text>
        <Text
          className='express-link express-link--quiet'
          onClick={() => onCreateContact(target)}
        >
          新增
        </Text>
      </View>
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

      <View className='express-swap' onClick={onSwapContacts}>
        <Text className='express-swap__text'>互换</Text>
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
