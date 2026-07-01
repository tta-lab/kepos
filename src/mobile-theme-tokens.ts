export type MobileThemeTokens = {
  accent: string
  accentInk: string
  accentStrong: string
  border: string
  borderStrong: string
  danger: string
  dangerBorder: string
  disabled: string
  disabledBorder: string
  field: string
  info: string
  iconMuted: string
  ink: string
  inkMuted: string
  inkSoft: string
  panel: string
  placeholder: string
  quickPanel: string
  quickPanelBorder: string
  raised: string
  scanner: string
  statusBar: 'dark-content' | 'light-content'
  statusDot: string
  statusText: string
  success: string
  surface: string
  treeComment: string
  treeCommentBorder: string
  warning: string
}

export type MobileThemeName = 'neoCozy' | 'indieConsole'

export const mobileThemes: Record<MobileThemeName, MobileThemeTokens> = {
  neoCozy: {
    accent: '#d9714b',
    accentInk: '#fffaf0',
    accentStrong: '#143d2b',
    border: '#d9dfcf',
    borderStrong: '#c9d3bf',
    danger: '#8e351f',
    dangerBorder: '#d88b72',
    disabled: '#b7bdae',
    disabledBorder: '#c6cdc1',
    field: '#fffdf7',
    info: '#3b6d8f',
    iconMuted: '#56715f',
    ink: '#162119',
    inkMuted: '#6f766b',
    inkSoft: '#4b554c',
    panel: '#f6f1e4',
    placeholder: '#8b9188',
    quickPanel: '#dfe9ce',
    quickPanelBorder: '#b9caa6',
    raised: '#fffdf7',
    scanner: '#101711',
    statusBar: 'dark-content',
    statusDot: '#2f8f61',
    statusText: '#324137',
    success: '#2f8f61',
    surface: '#fffaf0',
    treeComment: '#f4f6ed',
    treeCommentBorder: '#9bb68d',
    warning: '#b7791f'
  },
  indieConsole: {
    accent: '#ffcf3d',
    accentInk: '#171d33',
    accentStrong: '#ffcf3d',
    border: '#384264',
    borderStrong: '#4a567d',
    danger: '#ff9c88',
    dangerBorder: '#ff6f61',
    disabled: '#4a5269',
    disabledBorder: '#4a5269',
    field: '#11182b',
    info: '#7fd7ff',
    iconMuted: '#a9b1cf',
    ink: '#f8f2df',
    inkMuted: '#a9b1cf',
    inkSoft: '#c6cce3',
    panel: '#1d2542',
    placeholder: '#8d96b8',
    quickPanel: '#27345b',
    quickPanelBorder: '#4a567d',
    raised: '#222a49',
    scanner: '#080d18',
    statusBar: 'light-content',
    statusDot: '#ffcf3d',
    statusText: '#f8f2df',
    success: '#69e4a6',
    surface: '#171d33',
    treeComment: '#202a4a',
    treeCommentBorder: '#ffcf3d',
    warning: '#ff9f43'
  }
}

export function getMobileThemeForScheme(colorScheme?: string | null): MobileThemeTokens {
  return colorScheme === 'dark' ? mobileThemes.indieConsole : mobileThemes.neoCozy
}
