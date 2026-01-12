<script setup lang="ts">
import { ref, provide, onMounted, watch } from 'vue'
import type { Theme } from '@/composables/useTheme'

const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'system')

const setTheme = (newTheme: Theme) => {
  theme.value = newTheme
  localStorage.setItem('theme', newTheme)
  applyTheme()
}

const applyTheme = () => {
  const root = document.documentElement
  
  if (theme.value === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.toggle('dark', systemTheme === 'dark')
  } else {
    root.classList.toggle('dark', theme.value === 'dark')
  }
}

// Provide theme to child components
provide('theme', theme)
provide('setTheme', setTheme)

// Apply theme on mount and when theme changes
watch(theme, applyTheme, { immediate: true })

// Watch for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
}
</script>

<template>
  <slot />
</template>