import { Image, Text, View } from '@tarojs/components'

import { getExpressContactFullAddress, maskExpressContactMobile } from '@/services/express'
import type { ExpressContact, ExpressContactTarget, ExpressDraft } from '@/services/express'
import { AppPressable } from '@/shared/components'

import './index.scss'

const CONTACT_IMAGES = {
  sender: 'https://ca.deppon.com.cn/ows/assets/common/contact.png',
  consignee: 'https://ca.deppon.com.cn/ows/assets/common/receive.png',
  addressBook: 'https://ca.deppon.com.cn/ows/assets/contact/15.png',
  reverse: 'https://ca.deppon.com.cn/ows/assets/common/reverse.png'
}

interface ExpressContactCardProps {
  contact: ExpressContact | null
  mark: '寄' | '收'
  markType: 'sender' | 'consignee'
  /** 空态灰底：寄件人未填，或收件人未填且寄件人已填，双卡齐全时为白底。 */
  background: boolean
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

function ExpressContactCard({ background, contact, emptyText, mark, markType, target, onCreateContact, onSelectContact }: ExpressContactCardProps) {
  const contentLabel = contact ? `编辑${mark === '寄' ? '寄件人' : '收件人'}` : emptyText

  return (
    <View className={`express-contact-card${background ? ' express-contact-card--bg' : ''}${contact ? ' express-contact-card--filled' : ''}`}>
      <AppPressable
        accessibilityLabel={contentLabel}
        className={`express-contact-card__main${contact ? ' express-contact-card__main--filled' : ''}`}
        flex
        layout='row-start'
        onPress={() => onCreateContact(target)}
      >
        <Image
          className={`express-contact-card__mark${contact ? ' express-contact-card__mark--filled' : ''}`}
          mode='aspectFit'
          src={CONTACT_IMAGES[markType]}
        />
        <View className='express-contact-card__content'>
          {contact ? (
            <>
              <View className='express-contact-card__identity'>
                <Text className='express-contact-card__name' numberOfLines={1}>
                  {contact.name}
                </Text>
                <Text className='express-contact-card__mobile'>{maskExpressContactMobile(contact.mobile)}</Text>
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
        layout='row-start'
        onPress={() => onSelectContact(target)}
      >
        <View className='express-contact-card__divider' />
        <View className='express-contact-card__address-book-body'>
          <Image className='express-contact-card__address-book-icon' mode='aspectFit' src={CONTACT_IMAGES.addressBook} />
          <Text className='express-contact-card__address-book-text'>地址簿</Text>
        </View>
      </AppPressable>
    </View>
  )
}

export function ExpressContactPanel({ draft, onCreateContact, onSelectContact, onSwapContacts }: ExpressContactPanelProps) {
  // 收寄件地址齐全后才提供地址互换入口。
  const canSwap = Boolean(draft.sender && draft.consignee)

  return (
    <View className='express-contact-panel'>
      <ExpressContactCard
        background={!draft.sender}
        contact={draft.sender}
        emptyText='请选择寄件地址'
        mark='寄'
        markType='sender'
        target='sender'
        onCreateContact={onCreateContact}
        onSelectContact={onSelectContact}
      />
      {canSwap ? (
        <AppPressable accessibilityLabel='互换寄收件人' className='express-contact-panel__reverse' layout='center' onPress={onSwapContacts}>
          <Image className='express-contact-panel__reverse-icon' mode='aspectFit' src={CONTACT_IMAGES.reverse} />
        </AppPressable>
      ) : null}
      <ExpressContactCard
        background={!draft.consignee && Boolean(draft.sender)}
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
