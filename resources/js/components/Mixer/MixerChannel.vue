<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  name: string
  youtubeUrl: string
  startTime: { minutes: number; seconds: number }
  stopTime: { minutes: number; seconds: number } | null
}>()

const emit = defineEmits<{
  playing: [playing: boolean]
}>()

const audioCtx = new AudioContext()
const gainNode = audioCtx.createGain()
const volume = ref(0.8)
const muted = ref(false)
const playing = ref(false)
const audioElement = ref<HTMLAudioElement | null>(null)
const source: MediaElementAudioSourceNode | null = null

// Convert time object to seconds
const timeToSeconds = (time: { minutes: number; seconds: number }) => {
  return time.minutes * 60 + time.seconds
}

const loadYouTubeAudio = async () => {
  if (!props.youtubeUrl) return
  
  try {
    // In a real implementation, you'd need a backend service to extract audio
    // from YouTube. Here's a placeholder implementation
    console.log(`Loading YouTube audio from: ${props.youtubeUrl}`)
    console.log(`Start time: ${timeToSeconds(props.startTime)}s`)
    if (props.stopTime) {
      console.log(`Stop time: ${timeToSeconds(props.stopTime)}s`)
    }
    
    // This is where you'd integrate with a YouTube audio extraction service
    // For now, we'll create a placeholder audio element
    if (audioElement.value) {
      audioElement.value.src = props.youtubeUrl
    }
    
  } catch (error) {
    console.error('Error loading YouTube audio:', error)
  }
}

const togglePlay = () => {
  if (playing.value) {
    // Stop playing
    if (audioElement.value) {
      audioElement.value.pause()
    }
    playing.value = false
  } else {
    // Start playing
    if (audioElement.value) {
      const startSeconds = timeToSeconds(props.startTime)
      audioElement.value.currentTime = startSeconds
      audioElement.value.play()
      playing.value = true
      
      // Set up stop time if provided
      if (props.stopTime) {
        const stopSeconds = timeToSeconds(props.stopTime)
        const duration = stopSeconds - startSeconds
        setTimeout(() => {
          if (audioElement.value) {
            audioElement.value.pause()
            playing.value = false
          }
        }, duration * 1000)
      }
    }
  }
  emit('playing', playing.value)
}

const toggleMute = () => {
  muted.value = !muted.value
  gainNode.gain.value = muted.value ? 0 : volume.value
}

// Watch for URL changes
watch(() => props.youtubeUrl, () => {
  if (props.youtubeUrl) {
    loadYouTubeAudio()
  }
})

onMounted(() => {
  // Create audio element (invisible)
  audioElement.value = new Audio()
  
  // Set up audio context connection
  if (audioElement.value) {
    const mediaSource = audioCtx.createMediaElementSource(audioElement.value)
    mediaSource.connect(gainNode).connect(audioCtx.destination)
  }
  
  gainNode.gain.value = volume.value
})

onBeforeUnmount(() => {
  if (audioElement.value) {
    audioElement.value.pause()
  }
  audioCtx.close()
})
</script>

<template>
  <Card class="p-4 space-y-4 text-center">
    <h3 class="font-semibold">{{ name }}</h3>
    
    <div class="text-sm text-gray-600">
      <div v-if="youtubeUrl">
        URL loaded
      </div>
      <div v-else>
        No URL provided
      </div>
      <div>
        Start: {{ startTime.minutes }}:{{ startTime.seconds.toString().padStart(2, '0') }}
      </div>
      <div v-if="stopTime">
        Stop: {{ stopTime.minutes }}:{{ stopTime.seconds.toString().padStart(2, '0') }}
      </div>
    </div>

    <Slider
      :model-value="[volume]"
      @update:model-value="v => {
        volume = v[0]
        if (!muted) gainNode.gain.value = volume
      }"
      class="my-4"
    />

    <div class="flex gap-2 justify-center">
      <Button @click="togglePlay">
        {{ playing ? 'Stop' : 'Play' }}
      </Button>
      
      <Button variant="outline" @click="toggleMute">
        {{ muted ? 'Unmute' : 'Mute' }}
      </Button>
    </div>
  </Card>
</template>