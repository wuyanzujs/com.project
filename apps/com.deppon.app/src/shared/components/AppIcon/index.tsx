import { type ComponentType } from 'react'

import ArrowDownUp from 'lucide-react-native/dist/esm/icons/arrow-down-up.js'
import BadgeCheck from 'lucide-react-native/dist/esm/icons/badge-check.js'
import BookUser from 'lucide-react-native/dist/esm/icons/book-user.js'
import Boxes from 'lucide-react-native/dist/esm/icons/boxes.js'
import Building2 from 'lucide-react-native/dist/esm/icons/building-2.js'
import Calculator from 'lucide-react-native/dist/esm/icons/calculator.js'
import Camera from 'lucide-react-native/dist/esm/icons/camera.js'
import Check from 'lucide-react-native/dist/esm/icons/check.js'
import ChevronDown from 'lucide-react-native/dist/esm/icons/chevron-down.js'
import ChevronLeft from 'lucide-react-native/dist/esm/icons/chevron-left.js'
import ChevronRight from 'lucide-react-native/dist/esm/icons/chevron-right.js'
import ChevronUp from 'lucide-react-native/dist/esm/icons/chevron-up.js'
import Clock3 from 'lucide-react-native/dist/esm/icons/clock-3.js'
import ContactRound from 'lucide-react-native/dist/esm/icons/contact-round.js'
import Copy from 'lucide-react-native/dist/esm/icons/copy.js'
import CreditCard from 'lucide-react-native/dist/esm/icons/credit-card.js'
import FileCheck2 from 'lucide-react-native/dist/esm/icons/file-check-2.js'
import Funnel from 'lucide-react-native/dist/esm/icons/filter.js'
import Headphones from 'lucide-react-native/dist/esm/icons/headphones.js'
import House from 'lucide-react-native/dist/esm/icons/house.js'
import Info from 'lucide-react-native/dist/esm/icons/info.js'
import KeyRound from 'lucide-react-native/dist/esm/icons/key-round.js'
import ListFilter from 'lucide-react-native/dist/esm/icons/list-filter.js'
import Mailbox from 'lucide-react-native/dist/esm/icons/mailbox.js'
import MapPin from 'lucide-react-native/dist/esm/icons/map-pin.js'
import MapPinned from 'lucide-react-native/dist/esm/icons/map-pinned.js'
import Mic from 'lucide-react-native/dist/esm/icons/mic.js'
import Minus from 'lucide-react-native/dist/esm/icons/minus.js'
import PackagePlus from 'lucide-react-native/dist/esm/icons/package-plus.js'
import Package from 'lucide-react-native/dist/esm/icons/package.js'
import Phone from 'lucide-react-native/dist/esm/icons/phone.js'
import Plus from 'lucide-react-native/dist/esm/icons/plus.js'
import Printer from 'lucide-react-native/dist/esm/icons/printer.js'
import ReceiptText from 'lucide-react-native/dist/esm/icons/receipt-text.js'
import Redo2 from 'lucide-react-native/dist/esm/icons/redo-2.js'
import RefreshCw from 'lucide-react-native/dist/esm/icons/refresh-cw.js'
import Save from 'lucide-react-native/dist/esm/icons/save.js'
import ScanLine from 'lucide-react-native/dist/esm/icons/scan-line.js'
import Search from 'lucide-react-native/dist/esm/icons/search.js'
import Send from 'lucide-react-native/dist/esm/icons/send.js'
import Settings from 'lucide-react-native/dist/esm/icons/settings.js'
import Share2 from 'lucide-react-native/dist/esm/icons/share-2.js'
import ShieldAlert from 'lucide-react-native/dist/esm/icons/shield-alert.js'
import ShieldCheck from 'lucide-react-native/dist/esm/icons/shield-check.js'
import SquarePen from 'lucide-react-native/dist/esm/icons/square-pen.js'
import Star from 'lucide-react-native/dist/esm/icons/star.js'
import TicketPercent from 'lucide-react-native/dist/esm/icons/ticket-percent.js'
import Trash2 from 'lucide-react-native/dist/esm/icons/trash-2.js'
import Truck from 'lucide-react-native/dist/esm/icons/truck.js'
import UserRoundSearch from 'lucide-react-native/dist/esm/icons/user-round-search.js'
import UserRound from 'lucide-react-native/dist/esm/icons/user-round.js'
import WalletCards from 'lucide-react-native/dist/esm/icons/wallet-cards.js'
import X from 'lucide-react-native/dist/esm/icons/x.js'

import { designPxToDp } from '@/shared/native'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ForwardIcon, NutIcon } from './custom'

interface AppIconGlyphProps {
  color?: string
  size?: number
  strokeWidth?: number
}

const APP_ICONS = {
  swap: ArrowDownUp,
  badgeCheck: BadgeCheck,
  bookUser: BookUser,
  boxes: Boxes,
  building: Building2,
  calculator: Calculator,
  camera: Camera,
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  clock: Clock3,
  contact: ContactRound,
  copy: Copy,
  creditCard: CreditCard,
  edit: SquarePen,
  fileCheck: FileCheck2,
  headphones: Headphones,
  home: House,
  info: Info,
  key: KeyRound,
  filter: ListFilter,
  funnel: Funnel,
  mapPin: MapPin,
  mapPinned: MapPinned,
  mailbox: Mailbox,
  microphone: Mic,
  minus: Minus,
  package: Package,
  packagePlus: PackagePlus,
  phone: Phone,
  plus: Plus,
  printer: Printer,
  receipt: ReceiptText,
  redo: Redo2,
  forward: ForwardIcon,
  refresh: RefreshCw,
  save: Save,
  scan: ScanLine,
  search: Search,
  send: Send,
  settings: Settings,
  settingNut: NutIcon,
  share: Share2,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
  star: Star,
  ticket: TicketPercent,
  trash: Trash2,
  truck: Truck,
  user: UserRound,
  userSearch: UserRoundSearch,
  wallet: WalletCards,
  close: X
} satisfies Record<string, ComponentType<AppIconGlyphProps>>

export type AppIconName = keyof typeof APP_ICONS

interface AppIconProps {
  name: AppIconName
  color?: string
  /** 设计稿 px（750 基准），与 Sass 里的 px 同刻度，不是 RN 的 dp。 */
  size?: number
  strokeWidth?: number
}

export function AppIcon({
  name,
  color = APP_STYLE_COLORS.text.body,
  size = APP_NATIVE_TOKENS.icon.default,
  strokeWidth = APP_NATIVE_TOKENS.icon.stroke
}: AppIconProps) {
  const Icon = APP_ICONS[name]

  return <Icon color={color} size={designPxToDp(size)} strokeWidth={strokeWidth} />
}

export { APP_IMAGE_ICONS } from './images'
