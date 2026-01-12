import { inject } from 'vue'
import type { Ref } from 'vue'

export type Theme = 'dark' | 'light' | 'system'

export const useTheme = () => {
  const theme = inject<Ref<Theme>>('theme')
  const setTheme = inject<(theme: Theme) => void>('setTheme')
  
  if (!theme || !setTheme) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  
  return { theme, setTheme }
}