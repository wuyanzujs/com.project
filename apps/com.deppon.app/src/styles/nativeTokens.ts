/**
 * Native props cannot consume Sass. Every color below has an identical Sass
 * declaration in _tokens.scss and is checked by style governance.
 */
export const APP_STYLE_COLORS = {
  transparent: 'transparent',
  text: {
    heading: '#16181a',
    strong: '#101828',
    body: '#344054',
    secondary: '#475467',
    supporting: '#667085',
    placeholder: '#98a2b3',
    subdued: '#9b9b9b',
    faint: '#a3a3a3',
    inverse: '#ffffff',
    ink: '#111111',
    neutral: '#5b5b5b'
  },
  brand: {
    default: '#1a5eff',
    pressed: '#0f4fe6',
    borderSoft: '#b2c7ff',
    borderSubtle: '#c7d7fe',
    soft: '#e8efff',
    muted: '#eef4ff',
    faint: '#eef6ff'
  },
  info: {
    background: '#f0f9ff',
    border: '#bae6fd',
    borderSoft: '#bfdbfe',
    backgroundStrong: '#dceeff'
  },
  surface: {
    page: '#f5f7fb',
    pageAlt: '#f4f6f8',
    pageCool: '#f4f7fb',
    subtle: '#f8fafc',
    card: '#ffffff',
    muted: '#eef2f6',
    disabled: '#f2f4f7',
    track: '#e2e2e2'
  },
  border: {
    strong: '#d0d5dd',
    default: '#e4e7ec',
    subtle: '#eef2f6'
  },
  status: {
    danger: '#f04438',
    dangerAccent: '#f0484e',
    dangerEmphasis: '#d92d20',
    dangerText: '#b42318',
    dangerForeground: '#dc2626',
    dangerTextStrong: '#b42318',
    dangerBackground: '#fff1f0',
    dangerBackgroundSubtle: '#fef2f2',
    dangerBackgroundSoft: '#fee4e2',
    dangerBorder: '#fecdca',
    dangerBorderSoft: '#fecaca',
    dangerBorderStrong: '#ffccc7',
    warning: '#f79009',
    warningAccent: '#f59e0b',
    warningEmphasis: '#f97316',
    warningText: '#c2410c',
    warningForeground: '#b45309',
    warningTextStrong: '#9a3412',
    warningTextDeep: '#92400e',
    warningTextDark: '#854d0e',
    warningBackground: '#fff7ed',
    warningBackgroundSubtle: '#fff3dc',
    warningBackgroundSoft: '#fef3c7',
    warningBorder: '#fed7aa',
    success: '#12b76a',
    successEmphasis: '#16a34a',
    successText: '#047857',
    successForeground: '#15803d',
    successTextStrong: '#166534',
    successTextDeep: '#047857',
    successBackground: '#ecfdf3',
    successBackgroundSubtle: '#f0fdf4',
    successBackgroundSoft: '#dcfce7',
    successBorder: '#bbf7d0'
  },
  member: {
    text: '#7c482d',
    textMuted: '#968372',
    textStrong: '#262638',
    accent: '#f8dbb2',
    background: '#fde5cd'
  },
  overlay: {
    soft: 'rgba(22, 24, 26, 0.42)',
    default: 'rgba(22, 24, 26, 0.48)',
    strong: 'rgba(16, 24, 40, 0.48)',
    heavy: 'rgba(22, 24, 26, 0.72)',
    member: 'rgba(124, 72, 45, 0.12)'
  }
} as const

export const APP_NATIVE_TOKENS = {
  touch: {
    minimum: 44
  },
  icon: {
    small: 20,
    default: 24,
    large: 30,
    hero: 48,
    stroke: 2,
    strokeSubtle: 2.2,
    strokeEmphasis: 2.5,
    strokeActive: 2.6
  },
  qr: {
    defaultSize: 300,
    presentationSize: 320,
    minimumModuleSize: 2
  },
  safeArea: {
    defaultEdges: ['top', 'bottom'] as const,
    topEdge: ['top'] as const,
    bottomEdge: ['bottom'] as const,
    noEdges: [] as const
  },
  statusBar: {
    theme: 'dark' as const,
    translucent: true
  },
  navigation: {
    barTextStyle: 'black' as const
  },
  keyboard: {
    iosBehavior: 'padding' as const,
    androidManagedByWindow: true,
    verticalOffset: 0
  },
  dialog: {
    animation: 'fade' as const,
    statusBarTranslucent: true
  },
  layer: {
    base: 0,
    raised: 10,
    header: 100,
    overlay: 900,
    dialog: 1000,
    toast: 1100
  },
  interaction: {
    disabledOpacity: 0.48,
    mutedOpacity: 0.64,
    pressedOpacity: 0.72,
    selectedOpacity: 1,
    focusOpacity: 1
  }
} as const

export type AppStyleColors = typeof APP_STYLE_COLORS
export type AppNativeTokens = typeof APP_NATIVE_TOKENS
