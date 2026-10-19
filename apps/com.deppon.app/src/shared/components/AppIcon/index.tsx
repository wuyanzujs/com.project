import { type ComponentType } from 'react'

import {
  ArrowDownUp,
  BadgeCheck,
  BookUser,
  Boxes,
  Building2,
  Calculator,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  ContactRound,
  Copy,
  CreditCard,
  FileCheck2,
  Headphones,
  Home,
  Info,
  KeyRound,
  ListFilter,
  MapPin,
  MapPinned,
  Mailbox,
  Minus,
  Package,
  PackagePlus,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  Redo2,
  RefreshCw,
  Save,
  ScanLine,
  Search,
  Send,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  SquarePen,
  Star,
  TicketPercent,
  Trash2,
  Truck,
  UserRound,
  UserRoundSearch,
  WalletCards,
  X,
  type LucideProps
} from 'lucide-react-native'

import { designPxToDp } from '@/shared/native'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ForwardIcon, NutIcon } from './custom'

const APP_ICONS = {
  swap: ArrowDownUp,
  badgeCheck: BadgeCheck,
  bookUser: BookUser,
  boxes: Boxes,
  building: Building2,
  calculator: Calculator,
  // 弹窗右上角关闭叉与选中态对勾。
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
  home: Home,
  info: Info,
  key: KeyRound,
  filter: ListFilter,
  mapPin: MapPin,
  mapPinned: MapPinned,
  mailbox: Mailbox,
  minus: Minus,
  package: Package,
  packagePlus: PackagePlus,
  phone: Phone,
  plus: Plus,
  printer: Printer,
  receipt: ReceiptText,
  // 登录页和寄件页顶栏使用 redo，「我的」页使用 forward。
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
} satisfies Record<string, ComponentType<LucideProps>>

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
