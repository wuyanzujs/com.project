/**
 * Visual tokens used by native props and icon APIs. Keep every value aligned
 * with a Sass token in _tokens.scss; the style governance check verifies this.
 */
export const APP_STYLE_COLORS = {
  text: {
    heading: '#16181a',
    body: '#344054',
    supporting: '#667085',
    placeholder: '#98a2b3',
    inverse: '#ffffff'
  },
  brand: {
    default: '#1a5eff',
    pressed: '#0f4fe6',
    soft: '#e8efff',
    faint: '#eef6ff'
  },
  surface: {
    page: '#f5f7fb',
    pageAlt: '#f4f6f8',
    subtle: '#f8fafc',
    card: '#ffffff',
    muted: '#eef2f6'
  },
  border: {
    strong: '#d0d5dd',
    default: '#e4e7ec',
    subtle: '#eef2f6'
  },
  status: {
    dangerText: '#b42318',
    dangerBackground: '#fff1f0',
    warningText: '#c2410c',
    warningBackground: '#fff7ed',
    warningBorder: '#fed7aa',
    successText: '#047857',
    successBackground: '#ecfdf3',
    successSoft: '#dcfce7'
  }
} as const

export type AppStyleColors = typeof APP_STYLE_COLORS
