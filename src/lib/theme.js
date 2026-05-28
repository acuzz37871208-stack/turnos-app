function hexToRgbChannels(hex, fallback) {
  if (!hex || typeof hex !== 'string') return fallback
  const value = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return fallback

  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

export function applyBusinessTheme(theme = {}) {
  const colorFondo = theme.color_fondo || '#0a0a0f'
  const colorPrimario = theme.color_primario || '#7c6aff'

  document.body.style.backgroundColor = colorFondo
  document.documentElement.style.setProperty('--color-bg', colorFondo)
  document.documentElement.style.setProperty('--color-bg-rgb', hexToRgbChannels(colorFondo, '10 10 15'))
  document.documentElement.style.setProperty('--color-accent', colorPrimario)
  document.documentElement.style.setProperty('--color-accent-rgb', hexToRgbChannels(colorPrimario, '124 106 255'))
}

export function resetBusinessTheme() {
  document.body.style.backgroundColor = ''
  document.documentElement.style.removeProperty('--color-bg')
  document.documentElement.style.removeProperty('--color-bg-rgb')
  document.documentElement.style.removeProperty('--color-accent')
  document.documentElement.style.removeProperty('--color-accent-rgb')
}
