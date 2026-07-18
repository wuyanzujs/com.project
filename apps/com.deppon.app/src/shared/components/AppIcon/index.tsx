import { type ComponentType } from 'react'

import {
  BadgeCheck,
  BookUser,
  Boxes,
  Building2,
  Calculator,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  ContactRound,
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
  RefreshCw,
  Save,
  ScanLine,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  TicketPercent,
  Truck,
  UserRound,
  UserRoundSearch,
  WalletCards,
  type LucideProps
} from 'lucide-react-native'

import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

const APP_ICONS = {
  badgeCheck: BadgeCheck,
  bookUser: BookUser,
  boxes: Boxes,
  building: Building2,
  calculator: Calculator,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  clock: Clock3,
  contact: ContactRound,
  creditCard: CreditCard,
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
  refresh: RefreshCw,
  save: Save,
  scan: ScanLine,
  search: Search,
  send: Send,
  settings: Settings,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
  star: Star,
  ticket: TicketPercent,
  truck: Truck,
  user: UserRound,
  userSearch: UserRoundSearch,
  wallet: WalletCards
} satisfies Record<string, ComponentType<LucideProps>>

export type AppIconName = keyof typeof APP_ICONS

interface AppIconProps {
  name: AppIconName
  color?: string
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

  return <Icon color={color} size={size} strokeWidth={strokeWidth} />
}
