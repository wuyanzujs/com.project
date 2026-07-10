import type { ComponentType } from 'react'

import {
  BadgeCheck,
  BookUser,
  Boxes,
  Building2,
  Calculator,
  ChevronDown,
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
  Package,
  PackagePlus,
  Phone,
  Printer,
  ReceiptText,
  Save,
  ScanLine,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  TicketPercent,
  Truck,
  UserRound,
  UserRoundSearch,
  WalletCards
} from 'lucide-react-native'

import type { LucideProps } from 'lucide-react-native'

const APP_ICONS = {
  badgeCheck: BadgeCheck,
  bookUser: BookUser,
  boxes: Boxes,
  building: Building2,
  calculator: Calculator,
  chevronDown: ChevronDown,
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
  package: Package,
  packagePlus: PackagePlus,
  phone: Phone,
  printer: Printer,
  receipt: ReceiptText,
  save: Save,
  scan: ScanLine,
  search: Search,
  send: Send,
  settings: Settings,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
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
  color = '#344054',
  size = 24,
  strokeWidth = 2
}: AppIconProps) {
  const Icon = APP_ICONS[name]

  return <Icon color={color} size={size} strokeWidth={strokeWidth} />
}
