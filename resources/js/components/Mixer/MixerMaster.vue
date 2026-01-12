<script setup lang="ts">
import { ref, watch } from 'vue'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'

const masterVolume = ref(0.9)

// In a real implementation, you'd connect this to all channels
watch(masterVolume, (newVal) => {
  console.log('Master volume changed to:', newVal)
  // Update all channel volumes relative to master
})
</script>

<template>
  <Card class="p-4">
    <h3 class="font-semibold mb-2">Master Volume</h3>
    <Slider
      :model-value="[masterVolume]"
      @update:model-value="v => masterVolume = v[0]"
      :max="1"
      :step="0.01"
    />
    <div class="text-sm text-gray-600 mt-2">
      Volume: {{ Math.round(masterVolume * 100) }}%
    </div>
  </Card>
</template>