declare namespace YT {
  interface PlayerEvent {
    target: Player;
    data: any;
  }

  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    playerVars?: {
      autoplay?: 0 | 1;
      cc_load_policy?: 1;
      color?: 'red' | 'white';
      controls?: 0 | 1 | 2;
      disablekb?: 0 | 1;
      enablejsapi?: 0 | 1;
      end?: number;
      fs?: 0 | 1;
      hl?: string;
      iv_load_policy?: 1 | 3;
      list?: string;
      listType?: 'playlist' | 'search' | 'user_uploads';
      loop?: 0 | 1;
      modestbranding?: 1;
      origin?: string;
      playlist?: string;
      playsinline?: 0 | 1;
      rel?: 0 | 1;
      start?: number;
      widget_referrer?: string;
    };
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: PlayerEvent) => void;
      onPlaybackQualityChange?: (event: PlayerEvent) => void;
      onPlaybackRateChange?: (event: PlayerEvent) => void;
      onError?: (event: PlayerEvent) => void;
      onApiChange?: (event: PlayerEvent) => void;
    };
  }

  class Player {
    constructor(id: string, options: PlayerOptions);
    destroy(): void;
    getAvailablePlaybackRates(): number[];
    getAvailableQualityLevels(): string[];
    getCurrentTime(): number;
    getDuration(): number;
    getPlaybackQuality(): string;
    getPlaybackRate(): number;
    getPlayerState(): number;
    getVideoEmbedCode(): string;
    getVideoLoadedFraction(): number;
    getVideoUrl(): string;
    getVolume(): number;
    isMuted(): boolean;
    loadVideoById(videoId: string, startSeconds?: number): void;
    loadVideoById(options: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
    loadVideoByUrl(mediaContentUrl: string, startSeconds?: number): void;
    loadVideoByUrl(options: { mediaContentUrl: string; startSeconds?: number; endSeconds?: number }): void;
    mute(): void;
    nextVideo(): void;
    pauseVideo(): void;
    playVideo(): void;
    previousVideo(): void;
    removeEventListener(event: string, listener: Function): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    setLoop(loopPlaylists: boolean): void;
    setPlaybackQuality(suggestedQuality: string): void;
    setPlaybackRate(suggestedRate: number): void;
    setShuffle(shufflePlaylist: boolean): void;
    setSize(width: number, height: number): object;
    setVolume(volume: number): void;
    stopVideo(): void;
    unMute(): void;
  }

  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5
  }
}

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export {};