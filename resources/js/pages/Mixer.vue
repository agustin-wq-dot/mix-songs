<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sun, Moon, Volume2, Play, Pause, StopCircle, Music, Youtube, Info, Clock, Volume1, Sparkles } from 'lucide-vue-next'

interface TrackTime {
  minutes: number
  seconds: number
}

interface Track {
  id: number
  name: string
  youtubeUrl: string
  videoId: string
  startTime: TrackTime
  stopTime: TrackTime | null
  playing: boolean
  player: YT.Player | null
  volume: number
  error: string
}

// Dark theme logic (simple version since theme-provider isn't working)
const isDarkMode = ref(false)

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
  
  // Reinitialize YouTube players with new theme
  tracks.value.forEach((track, index) => {
    if (track.player && track.videoId) {
      setTimeout(() => {
        initializeYouTubePlayer(index, track.videoId)
      }, 100)
    }
  })
}

// Initialize theme
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  }
})

const tracks = ref<Track[]>([
  {
    id: 1,
    name: 'Track 1',
    youtubeUrl: '',
    videoId: '',
    startTime: { minutes: 0, seconds: 0 },
    stopTime: { minutes: 0, seconds: 30 },
    playing: false,
    player: null,
    volume: 80,
    error: ''
  },
  {
    id: 2,
    name: 'Track 2',
    youtubeUrl: '',
    videoId: '',
    startTime: { minutes: 0, seconds: 0 },
    stopTime: null,
    playing: false,
    player: null,
    volume: 80,
    error: ''
  }
])

const masterVolume = ref(100)
const youtubeApiLoaded = ref(false)
const isMixing = ref(false)
const mixInterval = ref<NodeJS.Timeout | null>(null)

// Extract video ID from various YouTube URL formats
const extractVideoId = (url: string): string => {
  if (!url.trim()) return ''
  
  let videoId = ''
  
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      videoId = match[1]
      break
    }
  }
  
  return videoId
}

const handleUrlChange = (index: number, url: string) => {
  const track = tracks.value[index]
  track.error = ''
  
  if (!url.trim()) {
    track.videoId = ''
    if (track.player) {
      track.player.destroy()
      track.player = null
    }
    return
  }
  
  const videoId = extractVideoId(url)
  
  if (!videoId) {
    track.error = 'Invalid YouTube URL. Please use a valid YouTube link.'
    track.videoId = ''
    if (track.player) {
      track.player.destroy()
      track.player = null
    }
    return
  }
  
  track.videoId = videoId
  
  if (youtubeApiLoaded.value && window.YT) {
    initializeYouTubePlayer(index, videoId)
  }
}

const initializeYouTubePlayer = (index: number, videoId: string) => {
  const track = tracks.value[index]
  const playerId = `youtube-player-${index}`
  
  // Destroy existing player
  if (track.player) {
    track.player.destroy()
    track.player = null
  }
  
  // Create container if it doesn't exist
  let container = document.getElementById(playerId)
  if (!container) {
    container = document.createElement('div')
    container.id = playerId
    container.className = 'youtube-player-container'
    
    const card = document.querySelectorAll('.player-container')[index]
    if (card) {
      card.appendChild(container)
    }
  }
  
  try {
    track.player = new window.YT.Player(playerId, {
      videoId: videoId,
      playerVars: {
        controls: 1,
        disablekb: 0,
        enablejsapi: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        start: timeToSeconds(track.startTime),
        origin: window.location.origin,
        color: isDarkMode.value ? 'white' : 'red',
        theme: isDarkMode.value ? 'dark' : 'light'
      },
      events: {
        onReady: (event) => {
          console.log(`Player ${index} ready`)
          event.target.setVolume(track.volume)
          event.target.stopVideo()
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING) {
            track.playing = true
          } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            track.playing = false
          }
        },
        onError: (event) => {
          track.error = `YouTube error: ${event.data}`
          console.error('YouTube player error:', event.data)
        }
      }
    })
    
    track.error = ''
  } catch (error) {
    track.error = 'Failed to initialize YouTube player'
    console.error('Failed to initialize YouTube player:', error)
  }
}

const timeToSeconds = (time: TrackTime | null): number => {
  if (!time) return 0
  return (time.minutes * 60) + time.seconds
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const playMix = () => {
  if (isMixing.value) {
    stopMix()
    return
  }
  
  const track1 = tracks.value[0]
  const track2 = tracks.value[1]
  
  if (!track1.videoId) {
    alert('Please provide a YouTube URL for Track 1')
    return
  }
  
  if (!track2.videoId) {
    alert('Please provide a YouTube URL for Track 2')
    return
  }
  
  if (!track1.player || !track2.player) {
    alert('Players not initialized. Please check your URLs.')
    return
  }
  
  // Stop any playing tracks first
  stopAll()
  
  isMixing.value = true
  
  // Calculate times
  const track1Start = timeToSeconds(track1.startTime)
  const track1Stop = timeToSeconds(track1.stopTime)
  const track2Start = timeToSeconds(track2.startTime)
  
  // Validate times
  if (track1Start >= track1Stop) {
    alert('Track 1 stop time must be greater than start time')
    isMixing.value = false
    return
  }
  
  // Play Track 1
  setTimeout(() => {
    track1.player!.seekTo(track1Start, true)
    track1.player!.playVideo()
    
    // Calculate when to start Track 2
    const track1Duration = track1Stop - track1Start
    
    // Start monitoring for mix timing
    mixInterval.value = setInterval(() => {
      if (track1.player && track1.player.getCurrentTime) {
        const currentTime = track1.player.getCurrentTime()
        const elapsed = currentTime - track1Start
        
        if (elapsed >= track1Duration && !track2.playing) {
          // Start Track 2
          track2.player!.seekTo(track2Start, true)
          track2.player!.playVideo()
          
          // Optionally fade out Track 1
          track1.player!.pauseVideo()
          
          // Clear interval since mixing is complete
          if (mixInterval.value) {
            clearInterval(mixInterval.value)
            mixInterval.value = null
          }
        }
      }
    }, 100) // Check every 100ms
  }, 500)
}

const stopMix = () => {
  isMixing.value = false
  if (mixInterval.value) {
    clearInterval(mixInterval.value)
    mixInterval.value = null
  }
  stopAll()
}

const stopAll = () => {
  tracks.value.forEach(track => {
    if (track.player) {
      track.player.pauseVideo()
      track.player.seekTo(0, true)
      track.playing = false
    }
  })
}

const updateTrackVolume = (index: number, value: number[]) => {
  const track = tracks.value[index]
  track.volume = value[0]
  
  if (track.player) {
    track.player.setVolume(track.volume)
  }
}

const updateMasterVolume = (value: number[]) => {
  masterVolume.value = value[0]
  
  tracks.value.forEach(track => {
    if (track.player) {
      const adjustedVolume = (track.volume * masterVolume.value) / 100
      track.player.setVolume(adjustedVolume)
    }
  })
}

const handleTimeChange = (index: number, field: 'startTime' | 'stopTime', type: 'minutes' | 'seconds', value: string) => {
  const track = tracks.value[index]
  const numValue = parseInt(value) || 0
  
  if (type === 'minutes') {
    track[field]![type] = Math.max(0, numValue)
  } else {
    track[field]![type] = Math.max(0, Math.min(59, numValue))
  }
}

// Load YouTube API
onMounted(() => {
  if (!window.YT) {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }
    
    window.onYouTubeIframeAPIReady = () => {
      youtubeApiLoaded.value = true
      console.log('YouTube API loaded')
      
      // Initialize players for tracks with video IDs
      tracks.value.forEach((track, index) => {
        if (track.videoId) {
          initializeYouTubePlayer(index, track.videoId)
        }
      })
    }
  } else {
    youtubeApiLoaded.value = true
  }
})

// Watch for video ID changes
watch(() => tracks.value.map(t => t.videoId), () => {
  if (youtubeApiLoaded.value) {
    tracks.value.forEach((track, index) => {
      if (track.videoId && !track.player) {
        initializeYouTubePlayer(index, track.videoId)
      }
    })
  }
})

onUnmounted(() => {
  stopMix()
  tracks.value.forEach(track => {
    if (track.player) {
      track.player.destroy()
    }
  })
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 transition-colors duration-500">
    <div class="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <!-- Header -->
      <Card class="border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/5 shadow-lg backdrop-blur-sm">
        <CardContent class="p-6 md:p-8">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div class="space-y-2">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-md">
                  <Music class="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 class="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    YouTube Audio Mixer
                  </h1>
                  <p class="text-muted-foreground mt-1 flex items-center gap-1">
                    <Sparkles class="h-3 w-3" />
                    Mix two YouTube tracks seamlessly
                  </p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <Button
                @click="toggleDarkMode"
                variant="ghost"
                size="icon"
                class="rounded-full hover:bg-primary/10 transition-all duration-300"
                :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
              >
                <Sun v-if="!isDarkMode" class="h-5 w-5" />
                <Moon v-else class="h-5 w-5" />
              </Button>
              <div class="flex gap-3">
                <Button 
                  @click="playMix" 
                  size="lg"
                  :disabled="!tracks[0].videoId || !tracks[1].videoId"
                  :class="[
                    'transition-all duration-300 shadow-lg hover:shadow-xl',
                    isMixing 
                      ? 'bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70' 
                      : 'bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90'
                  ]"
                  class="group"
                >
                  <Play v-if="!isMixing" class="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  <Pause v-else class="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  {{ isMixing ? 'Stop Mix' : 'Play Mix' }}
                </Button>
                <Button @click="stopAll" variant="outline" size="lg" class="border-2 hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-300">
                  <StopCircle class="mr-2 h-5 w-5" />
                  Stop All
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Track Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <Card
          v-for="(track, index) in tracks"
          :key="track.id"
          class="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1"
          :class="[
            'bg-gradient-to-br from-card to-card/95 backdrop-blur-sm',
            track.id === 1 ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-secondary'
          ]"
        >
          <CardHeader class="bg-gradient-to-r from-secondary/10 via-transparent to-muted/5 border-b">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg" :class="track.id === 1 ? 'bg-primary/10' : 'bg-secondary/10'">
                  <Youtube class="h-5 w-5" :class="track.id === 1 ? 'text-primary' : 'text-secondary'" />
                </div>
                <div>
                  <CardTitle class="text-foreground text-xl">{{ track.name }}</CardTitle>
                  <p class="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    {{ formatTime(timeToSeconds(track.startTime)) }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="relative">
                  <div class="w-3 h-3 rounded-full animate-ping absolute" :class="[
                    track.playing 
                      ? 'bg-green-500/60' 
                      : 'bg-muted-foreground/20'
                  ]"></div>
                  <div class="w-3 h-3 rounded-full" :class="[
                    track.playing 
                      ? 'bg-green-500' 
                      : 'bg-muted-foreground'
                  ]"></div>
                </div>
                <span class="text-sm font-medium px-2 py-1 rounded-full" :class="[
                  track.playing 
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                    : 'bg-muted/50 text-muted-foreground'
                ]">
                  {{ track.playing ? 'Playing' : 'Stopped' }}
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent class="p-6 space-y-6">
            <!-- URL Input -->
            <div class="space-y-3">
              <Label for="youtube-url" class="flex items-center gap-2 text-foreground">
                <Youtube class="h-4 w-4" />
                YouTube URL
              </Label>
              <div class="relative">
                <Input
                  id="youtube-url"
                  v-model="track.youtubeUrl"
                  placeholder="https://www.youtube.com/watch?v=..."
                  @blur="handleUrlChange(index, track.youtubeUrl)"
                  :class="[
                    'pl-10 pr-4 py-6 rounded-xl border-2 transition-all duration-300',
                    track.error 
                      ? 'border-destructive focus:ring-destructive' 
                      : track.videoId 
                        ? 'border-green-500/50 focus:ring-green-500/30' 
                        : 'focus:ring-primary/30'
                  ]"
                />
                <div class="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <svg class="w-5 h-5 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <p v-if="track.error" class="text-sm text-destructive flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                {{ track.error }}
              </p>
              <p v-if="track.videoId && !track.error" class="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Video loaded successfully
              </p>
            </div>

            <!-- Time Controls -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Start Time -->
              <div class="space-y-3 p-4 bg-muted/20 rounded-xl">
                <Label class="flex items-center gap-2">
                  <Clock class="h-4 w-4" />
                  Start Time
                </Label>
                <div class="flex gap-3">
                  <div class="space-y-2 flex-1">
                    <Label class="text-xs text-muted-foreground">Minutes</Label>
                    <Input
                      type="number"
                      :value="track.startTime.minutes"
                      @change="e => handleTimeChange(index, 'startTime', 'minutes', e.target.value)"
                      min="0"
                      class="text-center py-5 rounded-lg bg-background"
                    />
                  </div>
                  <div class="space-y-2 flex-1">
                    <Label class="text-xs text-muted-foreground">Seconds</Label>
                    <Input
                      type="number"
                      :value="track.startTime.seconds"
                      @change="e => handleTimeChange(index, 'startTime', 'seconds', e.target.value)"
                      min="0"
                      max="59"
                      class="text-center py-5 rounded-lg bg-background"
                    />
                  </div>
                </div>
                <div class="px-2 py-1.5 bg-primary/5 rounded-lg">
                  <p class="text-xs font-medium">
                    Starts at: <span class="text-primary">{{ formatTime(timeToSeconds(track.startTime)) }}</span>
                  </p>
                </div>
              </div>

              <!-- Stop Time for Track 1 -->
              <div v-if="track.id === 1" class="space-y-3 p-4 bg-destructive/5 rounded-xl">
                <Label class="flex items-center gap-2">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Stop Time (when Track 2 starts)
                </Label>
                <div class="flex gap-3">
                  <div class="space-y-2 flex-1">
                    <Label class="text-xs text-muted-foreground">Minutes</Label>
                    <Input
                      type="number"
                      :value="track.stopTime?.minutes || 0"
                      @change="e => handleTimeChange(index, 'stopTime', 'minutes', e.target.value)"
                      min="0"
                      class="text-center py-5 rounded-lg bg-background"
                    />
                  </div>
                  <div class="space-y-2 flex-1">
                    <Label class="text-xs text-muted-foreground">Seconds</Label>
                    <Input
                      type="number"
                      :value="track.stopTime?.seconds || 0"
                      @change="e => handleTimeChange(index, 'stopTime', 'seconds', e.target.value)"
                      min="0"
                      max="59"
                      class="text-center py-5 rounded-lg bg-background"
                    />
                  </div>
                </div>
                <div class="px-2 py-1.5 bg-destructive/10 rounded-lg">
                  <p class="text-xs font-medium">
                    Stops at: <span class="text-destructive">{{ formatTime(timeToSeconds(track.stopTime)) }}</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Volume Control -->
            <div class="space-y-4 p-4 bg-gradient-to-r from-muted/10 to-transparent rounded-xl">
              <div class="flex justify-between items-center">
                <Label class="flex items-center gap-2">
                  <Volume1 class="h-4 w-4" />
                  Track Volume
                </Label>
                <div class="px-3 py-1.5 bg-primary/10 rounded-full">
                  <span class="text-sm font-bold text-primary">{{ track.volume }}%</span>
                </div>
              </div>
              <Slider
                :model-value="[track.volume]"
                @update:model-value="(v) => updateTrackVolume(index, v)"
                :max="100"
                :step="1"
                class="py-2"
              />
              <div class="flex justify-between text-xs text-muted-foreground px-1">
                <span>Min</span>
                <span>Mid</span>
                <span>Max</span>
              </div>
            </div>

            <!-- YouTube Player -->
            <div class="space-y-3">
              <Label class="flex items-center gap-2">
                <Play class="h-4 w-4" />
                Preview
              </Label>
              <div class="player-container aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-xl overflow-hidden shadow-inner">
                <div v-if="!track.videoId" class="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-background">
                  <div class="text-center p-8">
                    <div class="text-muted-foreground mb-4">
                      <div class="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-secondary/10">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                    </div>
                    <p class="text-muted-foreground font-medium">Enter a YouTube URL to load the player</p>
                    <p class="text-sm text-muted-foreground mt-2">Preview will appear here</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Master Controls -->
      <Card class="border-0 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm shadow-xl">
        <CardHeader class="border-b">
          <CardTitle class="flex items-center gap-3 text-2xl">
            <div class="p-2 bg-gradient-to-r from-primary to-secondary rounded-lg">
              <Volume2 class="h-6 w-6 text-primary-foreground" />
            </div>
            <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Master Controls
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent class="p-6 space-y-8">
          <!-- Master Volume -->
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <Label class="text-lg font-semibold flex items-center gap-3">
                <div class="w-2 h-8 bg-gradient-to-b from-primary to-secondary rounded-full"></div>
                Master Volume
              </Label>
              <div class="px-4 py-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full">
                <span class="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {{ masterVolume }}%
                </span>
              </div>
            </div>
            <Slider
              :model-value="[masterVolume]"
              @update:model-value="updateMasterVolume"
              :max="100"
              :step="1"
              class="py-4"
            />
            <div class="flex justify-between text-sm text-muted-foreground px-2">
              <span class="flex items-center gap-1">
                <Volume1 class="h-3 w-3" />
                Silent
              </span>
              <span class="flex items-center gap-1">
                <Volume2 class="h-3 w-3" />
                Normal
              </span>
              <span class="flex items-center gap-1">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                Max
              </span>
            </div>
          </div>

          <!-- Mix Status -->
          <div class="p-6 bg-gradient-to-r from-primary/5 via-secondary/5 to-transparent rounded-2xl border">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="relative">
                  <div class="w-4 h-4 rounded-full animate-ping absolute" :class="[
                    isMixing 
                      ? 'bg-green-500/60' 
                      : 'bg-muted-foreground/20'
                  ]"></div>
                  <div class="w-4 h-4 rounded-full" :class="[
                    isMixing 
                      ? 'bg-green-500' 
                      : 'bg-muted-foreground'
                  ]"></div>
                </div>
                <div>
                  <h3 class="font-semibold text-foreground">
                    {{ isMixing ? 'Mixing in progress...' : 'Ready to mix' }}
                  </h3>
                  <p class="text-sm text-muted-foreground">
                    {{ isMixing ? 'Track 2 will start automatically' : 'Set your times and press Play Mix' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="text-center px-4 py-2 bg-gradient-to-br from-muted to-background rounded-xl">
                  <div class="text-2xl font-bold" :class="[
                    isMixing 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-muted-foreground'
                  ]">
                    {{ tracks.filter(t => t.playing).length }}/2
                  </div>
                  <div class="text-xs text-muted-foreground">tracks playing</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Instructions -->
      <Alert class="border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/5 backdrop-blur-sm shadow-lg">
        <AlertDescription class="text-foreground">
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-gradient-to-br from-primary to-secondary rounded-xl">
                <Info class="h-5 w-5 text-primary-foreground" />
              </div>
              <h4 class="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                How to use the Mixer
              </h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="(step, index) in [
                'Enter YouTube URLs for both tracks',
                'Set start time for Track 1 and stop time (when Track 2 should start)',
                'Set start time for Track 2',
                'Adjust individual track volumes as needed',
                'Click "Play Mix" to start the mix',
                'Use Master Volume to control overall volume'
              ]" :key="index" class="flex items-start gap-3 p-4 bg-white/50 dark:bg-black/20 rounded-xl hover:bg-white/70 dark:hover:bg-black/30 transition-all duration-300">
                <span class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-md">
                  {{ index + 1 }}
                </span>
                <span class="text-sm font-medium">{{ step }}</span>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  </div>
</template>

<style scoped>
.aspect-video {
  aspect-ratio: 16 / 9;
}

.youtube-player-container {
  width: 100%;
  height: 100%;
  border-radius: 0.75rem;
  overflow: hidden;
}

/* Smooth transitions for theme and elements */
* {
  transition-property: background-color, border-color, color, transform, box-shadow;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: hsl(var(--muted));
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--primary));
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--primary) / 0.8);
}

/* Glow effects */
.glow-effect {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}

.dark .glow-effect {
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
}

/* Smooth gradient animations */
.bg-gradient-animate {
  background-size: 200% 200%;
  animation: gradientShift 8s ease infinite;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Pulse animation for status indicators */
@keyframes statusPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.05);
  }
}

.animate-status-pulse {
  animation: statusPulse 2s ease-in-out infinite;
}

/* Smooth input focus effects */
input:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}
</style>