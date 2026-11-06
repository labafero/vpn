import { expect, test } from 'vitest'
import { captionEventToSegments } from '../app/utils/twitch-captions'

test('converts Twitch caption events to clip-relative bounded segments', () => {
  expect(captionEventToSegments('  fala reconhecida  ', 95.25, 90)).toEqual([
    { startMs: 5250, endMs: 6250, text: 'fala reconhecida' }
  ])
})

test('ignores empty, malformed, and pre-clip caption events', () => {
  expect(captionEventToSegments('', 95, 90)).toEqual([])
  expect(captionEventToSegments({ text: 'not a documented payload' }, 95, 90)).toEqual([])
  expect(captionEventToSegments('before clip', 89, 90)).toEqual([])
})
