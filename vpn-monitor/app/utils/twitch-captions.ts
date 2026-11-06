export type TwitchCaptionSegment = { startMs: number; endMs: number; text: string }

export function captionEventToSegments(payload: unknown, currentTime: number, vodOffset: number) {
  if (typeof payload !== 'string' || !Number.isFinite(currentTime) || !Number.isFinite(vodOffset))
    return []
  const text = payload.trim()
  const startMs = Math.max(0, Math.round((currentTime - vodOffset) * 1000))
  if (!text || currentTime < vodOffset) return []
  return [{ startMs, endMs: startMs + 1000, text }]
}

type TwitchPlayer = {
  addEventListener(event: string, callback: (payload?: unknown) => void): void
  enableCaptions(): void
  play(): void
  getCurrentTime(): number
  pause(): void
  setMuted(muted: boolean): void
}

type TwitchApi = {
  Player: (new (element: string, options: Record<string, unknown>) => TwitchPlayer) & {
    READY: string
    CAPTIONS: string
    ENDED: string
    PLAYBACK_BLOCKED: string
  }
}

declare global {
  interface Window {
    Twitch?: TwitchApi
  }
}

function loadTwitchApi(): Promise<TwitchApi> {
  if (window.Twitch) return Promise.resolve(window.Twitch)
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-twitch-player-api]')
    const script = existing || document.createElement('script')
    const timeout = window.setTimeout(() => reject(new Error('Twitch player API timeout')), 10_000)
    const done = () => {
      window.clearTimeout(timeout)
      if (window.Twitch) resolve(window.Twitch)
      else reject(new Error('Twitch player API unavailable'))
    }
    script.addEventListener('load', done, { once: true })
    script.addEventListener('error', done, { once: true })
    if (!existing) {
      script.src = 'https://player.twitch.tv/js/embed/v1.js'
      script.async = true
      script.dataset.twitchPlayerApi = 'true'
      document.head.append(script)
    }
  })
}

export async function captureTwitchCaptions(options: {
  elementId: string
  videoId: string
  vodOffset: number
  durationSeconds: number
}): Promise<TwitchCaptionSegment[]> {
  const api = await loadTwitchApi()
  const segments: TwitchCaptionSegment[] = []
  return new Promise((resolve) => {
    const player = new api.Player(options.elementId, {
      width: 400,
      height: 300,
      video: `v${options.videoId.replace(/^v/, '')}`,
      time: `${Math.floor(options.vodOffset / 3600)}h${Math.floor((options.vodOffset % 3600) / 60)}m${options.vodOffset % 60}s`,
      parent: [window.location.hostname],
      autoplay: true,
      muted: true
    })
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      window.clearInterval(poll)
      window.clearTimeout(timeout)
      try {
        player.pause()
      } catch {
        // The player may have been removed after an embed failure.
      }
      resolve(segments)
    }
    const timeout = window.setTimeout(
      finish,
      Math.min(options.durationSeconds * 3000 + 15_000, 180_000)
    )
    const poll = window.setInterval(() => {
      if (player.getCurrentTime() >= options.vodOffset + options.durationSeconds + 1) finish()
    }, 500)
    player.addEventListener(api.Player.READY, () => {
      player.setMuted(true)
      player.enableCaptions()
      player.play()
    })
    player.addEventListener(api.Player.CAPTIONS, (payload) => {
      const currentTime = player.getCurrentTime()
      if (currentTime <= options.vodOffset + options.durationSeconds)
        segments.push(...captionEventToSegments(payload, currentTime, options.vodOffset))
    })
    player.addEventListener(api.Player.ENDED, finish)
    player.addEventListener(api.Player.PLAYBACK_BLOCKED, finish)
  })
}
