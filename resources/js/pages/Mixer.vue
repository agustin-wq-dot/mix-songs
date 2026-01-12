<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sun, Moon, Volume2, Play, Pause, StopCircle, Music, Youtube } from 'lucide-vue-next'

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
  <div class="min-h-screen bg-background transition-colors duration-300">
    <div class="p-6 space-y-6 max-w-7xl mx-auto">
      <!-- Header -->
      <Card class="border-0 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent class="p-6">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <Music class="h-6 w-6 text-primary" />
                <h1 class="text-3xl font-bold tracking-tight text-foreground">YouTube Audio Mixer</h1>
              </div>
              <p class="text-muted-foreground">Mix two YouTube tracks seamlessly</p>
            </div>
            <div class="flex items-center gap-2">
              <Button
                @click="toggleDarkMode"
                variant="ghost"
                size="icon"
                class="rounded-full"
              >
                <Sun v-if="!isDarkMode" class="h-5 w-5" />
                <Moon v-else class="h-5 w-5" />
                <span class="sr-only">Toggle theme</span>
              </Button>
              <div class="flex gap-2">
                <Button 
                  @click="playMix" 
                  size="lg"
                  :disabled="!tracks[0].videoId || !tracks[1].videoId"
                  :class="isMixing ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'"
                >
                  <Play v-if="!isMixing" class="mr-2 h-4 w-4" />
                  <Pause v-else class="mr-2 h-4 w-4" />
                  {{ isMixing ? 'Stop Mix' : 'Play Mix' }}
                </Button>
                <Button @click="stopAll" variant="outline" size="lg">
                  <StopCircle class="mr-2 h-4 w-4" />
                  Stop All
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Track Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          v-for="(track, index) in tracks"
          :key="track.id"
          class="overflow-hidden"
        >
          <CardHeader class="bg-gradient-to-r from-secondary/5 to-muted/5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <Youtube class="h-5 w-5 text-destructive" />
                <CardTitle class="text-foreground">{{ track.name }}</CardTitle>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full" :class="[
                  track.playing 
                    ? 'bg-green-500 animate-pulse' 
                    : 'bg-muted-foreground'
                ]"></div>
                <span class="text-sm font-medium" :class="[
                  track.playing 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-muted-foreground'
                ]">
                  {{ track.playing ? 'Playing' : 'Stopped' }}
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent class="p-6 space-y-6">
            <!-- URL Input -->
            <div class="space-y-2">
              <Label for="youtube-url">YouTube URL</Label>
              <div class="flex items-center gap-2">
                <Input
                  id="youtube-url"
                  v-model="track.youtubeUrl"
                  placeholder="https://www.youtube.com/watch?v=..."
                  @blur="handleUrlChange(index, track.youtubeUrl)"
                  :class="track.error ? 'border-destructive' : ''"
                />
              </div>
              <p v-if="track.error" class="text-sm text-destructive">{{ track.error }}</p>
              <p v-if="track.videoId && !track.error" class="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Video loaded successfully
              </p>
              <p class="text-xs text-muted-foreground">
                Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
              </p>
            </div>

            <!-- Time Controls -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Start Time -->
              <div class="space-y-2">
                <Label>Start Time</Label>
                <div class="flex gap-2">
                  <div class="space-y-1 flex-1">
                    <Label class="text-xs text-muted-foreground">Minutes</Label>
                    <Input
                      type="number"
                      :value="track.startTime.minutes"
                      @change="e => handleTimeChange(index, 'startTime', 'minutes', e.target.value)"
                      min="0"
                      class="text-center"
                    />
                  </div>
                  <div class="space-y-1 flex-1">
                    <Label class="text-xs text-muted-foreground">Seconds</Label>
                    <Input
                      type="number"
                      :value="track.startTime.seconds"
                      @change="e => handleTimeChange(index, 'startTime', 'seconds', e.target.value)"
                      min="0"
                      max="59"
                      class="text-center"
                    />
                  </div>
                </div>
                <p class="text-xs text-muted-foreground">
                  Starts at: {{ formatTime(timeToSeconds(track.startTime)) }}
                </p>
              </div>

              <!-- Stop Time for Track 1 -->
              <div v-if="track.id === 1" class="space-y-2">
                <Label>Stop Time (when Track 2 starts)</Label>
                <div class="flex gap-2">
                  <div class="space-y-1 flex-1">
                    <Label class="text-xs text-muted-foreground">Minutes</Label>
                    <Input
                      type="number"
                      :value="track.stopTime?.minutes || 0"
                      @change="e => handleTimeChange(index, 'stopTime', 'minutes', e.target.value)"
                      min="0"
                      class="text-center"
                    />
                  </div>
                  <div class="space-y-1 flex-1">
                    <Label class="text-xs text-muted-foreground">Seconds</Label>
                    <Input
                      type="number"
                      :value="track.stopTime?.seconds || 0"
                      @change="e => handleTimeChange(index, 'stopTime', 'seconds', e.target.value)"
                      min="0"
                      max="59"
                      class="text-center"
                    />
                  </div>
                </div>
                <p class="text-xs text-muted-foreground">
                  Stops at: {{ formatTime(timeToSeconds(track.stopTime)) }}
                </p>
              </div>
            </div>

            <!-- Volume Control -->
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <Label>Track Volume</Label>
                <span class="text-sm font-medium text-foreground">{{ track.volume }}%</span>
              </div>
              <Slider
                :model-value="[track.volume]"
                @update:model-value="(v) => updateTrackVolume(index, v)"
                :max="100"
                :step="1"
              />
              <div class="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <!-- YouTube Player -->
            <div class="space-y-2">
              <Label>Preview</Label>
              <div class="player-container aspect-video bg-muted rounded-lg overflow-hidden">
                <div v-if="!track.videoId" class="w-full h-full flex items-center justify-center">
                  <div class="text-center p-6">
                    <div class="text-muted-foreground mb-3">
                      <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <p class="text-muted-foreground">Enter a YouTube URL to load the player</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Master Controls -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Volume2 class="h-5 w-5" />
            Master Controls
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Master Volume -->
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <Label class="text-base">Master Volume</Label>
              <span class="text-lg font-medium text-foreground">{{ masterVolume }}%</span>
            </div>
            <Slider
              :model-value="[masterVolume]"
              @update:model-value="updateMasterVolume"
              :max="100"
              :step="1"
            />
            <div class="flex justify-between text-sm text-muted-foreground">
              <span>Silent</span>
              <span>Normal</span>
              <span>Max</span>
            </div>
          </div>

          <!-- Mix Status -->
          <div class="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full" :class="[
                isMixing 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-muted-foreground'
              ]"></div>
              <span class="text-sm text-foreground">
                {{ isMixing ? 'Mixing in progress...' : 'Ready to mix' }}
              </span>
            </div>
            <div class="text-sm text-muted-foreground">
              {{ tracks.filter(t => t.playing).length }}/2 tracks playing
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Instructions -->
      <Alert class="bg-primary/5 border-primary/20">
        <AlertDescription class="text-foreground">
          <div class="space-y-3">
            <h4 class="font-semibold text-lg flex items-center gap-2">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              How to use
            </h4>
            <ol class="space-y-2 pl-1">
              <li class="flex items-start gap-2">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">1</span>
                <span>Enter YouTube URLs for both tracks</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">2</span>
                <span>Set start time for Track 1 and stop time (when Track 2 should start)</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">3</span>
                <span>Set start time for Track 2</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">4</span>
                <span>Adjust individual track volumes as needed</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">5</span>
                <span>Click "Play Mix" to start the mix</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">6</span>
                <span>Use Master Volume to control overall volume</span>
              </li>
            </ol>
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
}

/* Smooth transitions for theme */
* {
  transition-property: background-color, border-color, color;
  transition-duration: 200ms;
  transition-timing-function: ease-in-out;
}
</style>