import type { DesignObject } from '../lib/designSchema'
import type { TemplateCategory } from '../lib/designSchema'
import { FONT_DISPLAY, FONT_SANS, FONT_SERIF } from '../lib/fonts'
import type { PresetId } from '../lib/presets'

const sans = FONT_SANS
const serif = FONT_SERIF
const display = FONT_DISPLAY

export type TemplateSpec = {
  name: string
  category: TemplateCategory
  summary: string
  presetId: PresetId
  background: string
  build: (w: number, h: number) => DesignObject[]
}

function rect(
  id: string,
  cx: number,
  cy: number,
  width: number,
  height: number,
  fill: string,
  rx = 0,
  opacity = 1,
): DesignObject {
  return {
    id,
    type: 'rect',
    left: cx,
    top: cy,
    width,
    height,
    fill,
    rx,
    ry: rx,
    opacity,
  }
}

function circle(
  id: string,
  cx: number,
  cy: number,
  radius: number,
  fill: string,
  opacity = 1,
): DesignObject {
  return { id, type: 'circle', left: cx, top: cy, radius, fill, opacity }
}

function text(
  id: string,
  x: number,
  y: number,
  value: string,
  fontSize: number,
  fill: string,
  opts: {
    weight?: number
    align?: 'left' | 'center' | 'right'
    fontFamily?: string
    opacity?: number
  } = {},
): DesignObject {
  return {
    id,
    type: 'text',
    left: x,
    top: y,
    text: value,
    fontSize,
    fill,
    fontWeight: opts.weight ?? 600,
    textAlign: opts.align ?? 'left',
    fontFamily: opts.fontFamily ?? sans,
    opacity: opts.opacity ?? 1,
  }
}

export const TEMPLATE_SPECS: TemplateSpec[] = [
  {
    name: 'Atelier',
    category: 'Launch',
    summary: 'Collection announcement with a brass footer',
    presetId: 'ig-post',
    background: '#14120f',
    build: (w, h) => [
      rect('rule', 86, h * 0.46, 1.5, h * 0.62, '#c6a15b'),
      rect('footer', w / 2, h - 46, w, 92, '#c6a15b'),
      text('kicker', 124, 132, 'COLLECTION  04', 20, '#c6a15b', { weight: 600 }),
      text('h1', 124, 250, 'Form,', 118, '#f6f1e8', { fontFamily: serif, weight: 400 }),
      text('h2', 124, 390, 'held still.', 118, '#f6f1e8', { fontFamily: serif, weight: 400 }),
      text('meta', 124, h - 78, 'Opens Thursday', 22, '#14120f', { weight: 600 }),
      text('meta2', w - 124, h - 78, 'By appointment', 22, '#14120f', {
        align: 'right',
        weight: 500,
      }),
    ],
  },
  {
    name: 'Margin Note',
    category: 'Quote',
    summary: 'Editorial quote for a quiet feed',
    presetId: 'ig-post',
    background: '#f3eee6',
    build: (w, h) => [
      text('mark', 72, 36, '“', 210, '#ddd4c6', { fontFamily: serif, weight: 400 }),
      text('q1', 96, 300, 'Make it once.', 78, '#1c1915', { fontFamily: serif, weight: 400 }),
      text('q2', 96, 400, 'Make it exact.', 78, '#1c1915', { fontFamily: serif, weight: 400 }),
      rect('rule', 186, 560, 180, 2, '#1c1915'),
      text('by', 96, 600, 'Studio notes  ·  Vol. II', 22, '#6f675e', { weight: 500 }),
      text('foot', 96, h - 120, 'Set in Instrument Serif', 16, '#8a8176', { weight: 500 }),
      circle('dot', w - 110, h - 120, 7, '#1c1915'),
    ],
  },
  {
    name: 'Private Sale',
    category: 'Promo',
    summary: 'Members-only offer with a paper panel',
    presetId: 'ig-post',
    background: '#10241f',
    build: (w, h) => {
      const panelW = w * 0.56
      const panelH = h - 128
      const panelCx = 64 + panelW / 2
      return [
        rect('panel', panelCx, h / 2, panelW, panelH, '#f4efe6'),
        text('kicker', 112, 168, 'PRIVATE', 18, '#10241f', { weight: 700 }),
        text('num', 108, 240, '40', 210, '#10241f', { fontFamily: display, weight: 800 }),
        text('off', 112, 500, 'percent off archive pieces', 26, '#10241f', { weight: 500 }),
        rect('rule', 196, 580, 168, 2, '#10241f'),
        text('when', 112, h - 168, 'Through Sunday', 20, '#5d6a64', { weight: 500 }),
        circle('seal', w * 0.8, 230, 74, '#e7c27a'),
        text('seal-label', w * 0.8, 214, 'SS', 28, '#10241f', { align: 'center', weight: 700 }),
        text('side', w * 0.8, h * 0.62, 'Members', 36, '#f4efe6', {
          align: 'center',
          fontFamily: serif,
          weight: 400,
        }),
        text('side2', w * 0.8, h * 0.68, 'only', 36, '#e7c27a', {
          align: 'center',
          fontFamily: serif,
          weight: 400,
        }),
      ]
    },
  },
  {
    name: 'Issue Twelve',
    category: 'Editorial',
    summary: 'Magazine cover with a black field',
    presetId: 'ig-post',
    background: '#f6f3ee',
    build: (w, h) => {
      const blockW = w * 0.62
      const blockTop = 300
      const blockH = h - blockTop
      return [
        rect('block', w - blockW / 2, blockTop + blockH / 2, blockW, blockH, '#111111'),
        text('kicker', 64, 72, 'VOLUME  12', 16, '#6f675e', { weight: 600 }),
        text('title', 60, 112, 'Twelve', 108, '#161513', { fontFamily: serif, weight: 400 }),
        text('h1', w - blockW + 56, 460, 'The quiet', 64, '#f6f3ee', {
          fontFamily: serif,
          weight: 400,
        }),
        text('h2', w - blockW + 56, 540, 'issue.', 64, '#f6f3ee', {
          fontFamily: serif,
          weight: 400,
        }),
        text('meta', w - blockW + 56, h - 120, 'Print & screen', 20, '#b7b1a8', { weight: 500 }),
      ]
    },
  },
  {
    name: 'Night Session',
    category: 'Launch',
    summary: 'Dated event card for a square post',
    presetId: 'ig-post',
    background: '#0c121c',
    build: (_w, h) => [
      rect('date', 230, 300, 300, 320, '#f2efe8'),
      text('day', 230, 175, '24', 132, '#0c121c', {
        align: 'center',
        fontFamily: display,
        weight: 800,
      }),
      text('mon', 230, 340, 'MAY', 20, '#0c121c', { align: 'center', weight: 700 }),
      text('h1', 96, 560, 'Night', 108, '#f4efe6', { fontFamily: serif, weight: 400 }),
      text('h2', 96, 680, 'session', 108, '#d7b56d', { fontFamily: serif, weight: 400 }),
      text('meta', 96, h - 120, 'Doors 19:00   ·   Studio B', 22, '#9aa3b2', { weight: 500 }),
    ],
  },
  {
    name: 'Three Days',
    category: 'Story',
    summary: 'Countdown story with a paper closer',
    presetId: 'ig-story',
    background: '#1a1024',
    build: (w, h) => {
      const panelH = 560
      const panelCy = h - 80 - panelH / 2
      return [
        text('kicker', 80, 150, 'COUNTDOWN', 20, '#e7c6ff', { weight: 700 }),
        text('num', 72, 240, '03', 280, '#f7f2ff', { fontFamily: display, weight: 800 }),
        text('sub', 84, 560, 'days until doors', 36, '#d7c8ea', { weight: 500 }),
        rect('panel', w / 2, panelCy, w - 128, panelH, '#f4efe6'),
        text('title', 112, panelCy - panelH / 2 + 80, 'Launch night', 64, '#1a1024', {
          fontFamily: serif,
          weight: 400,
        }),
        text('when', 112, panelCy - panelH / 2 + 180, 'Thursday  ·  20:00', 28, '#1a1024', {
          weight: 500,
        }),
        text('where', 112, panelCy + panelH / 2 - 120, 'Save the date', 20, '#6b5f78', {
          weight: 600,
        }),
      ]
    },
  },
  {
    name: 'Field Note',
    category: 'Story',
    summary: 'Vertical essay with a numbered margin',
    presetId: 'ig-story',
    background: '#efe7d6',
    build: (_w, h) => [
      rect('spine', 28, h / 2, 10, h, '#1f3d34'),
      text('kicker', 96, 160, 'FIELD NOTE', 18, '#1f3d34', { weight: 700 }),
      text('h1', 92, 280, 'Export the', 92, '#1a1814', { fontFamily: serif, weight: 400 }),
      text('h2', 92, 390, 'file you mean.', 92, '#1a1814', { fontFamily: serif, weight: 400 }),
      text('n1', 96, 620, '01', 28, '#1f3d34', { fontFamily: display, weight: 700 }),
      text('l1', 180, 624, 'Sketch the frame', 32, '#1a1814', { weight: 500 }),
      text('n2', 96, 740, '02', 28, '#1f3d34', { fontFamily: display, weight: 700 }),
      text('l2', 180, 744, 'Set the type', 32, '#1a1814', { weight: 500 }),
      text('n3', 96, 860, '03', 28, '#1f3d34', { fontFamily: display, weight: 700 }),
      text('l3', 180, 864, 'Ship at full size', 32, '#1a1814', { weight: 500 }),
      rect('rule', 220, h - 280, 240, 2, '#1f3d34'),
      text('foot', 96, h - 230, 'Local  ·  No account', 22, '#5e6b62', { weight: 500 }),
    ],
  },
  {
    name: 'Before / After',
    category: 'Story',
    summary: 'Split story for a transformation',
    presetId: 'ig-story',
    background: '#0e0e0e',
    build: (w, h) => [
      rect('left', w * 0.25, h * 0.58, w * 0.42, h * 0.62, '#1c1c1c'),
      rect('right', w * 0.75, h * 0.58, w * 0.42, h * 0.62, '#f4efe6'),
      text('kicker', 72, 120, 'SWIPE', 18, '#a39e96', { weight: 700 }),
      text('before', w * 0.25, h * 0.5, 'Before', 48, '#f4efe6', {
        align: 'center',
        fontFamily: serif,
        weight: 400,
      }),
      text('after', w * 0.75, h * 0.5, 'After', 48, '#14120f', {
        align: 'center',
        fontFamily: serif,
        weight: 400,
      }),
      text('cap1', w * 0.25, h * 0.62, 'Draft', 22, '#8d8880', { align: 'center', weight: 500 }),
      text('cap2', w * 0.75, h * 0.62, 'Locked', 22, '#6f675e', { align: 'center', weight: 500 }),
    ],
  },
  {
    name: 'Twelve Minutes',
    category: 'Thumbnail',
    summary: 'Tutorial thumbnail with a clear left read',
    presetId: 'yt-thumb',
    background: '#10141c',
    build: (w, h) => [
      rect('bar', 18, h / 2, 12, h, '#e24b2a'),
      text('kicker', 72, 64, 'TUTORIAL', 18, '#e24b2a', { weight: 700 }),
      text('h1', 68, 130, 'Learn the', 84, '#f7f4ef', { fontFamily: display, weight: 800 }),
      text('h2', 68, 230, 'canvas.', 84, '#f7f4ef', { fontFamily: display, weight: 800 }),
      rect('pill', 168, 430, 176, 40, '#e24b2a', 20),
      text('pill-label', 168, 416, '12 MIN', 16, '#ffffff', { align: 'center', weight: 700 }),
      circle('orb', w * 0.82, h * 0.5, h * 0.28, '#1c2433'),
      circle('orb2', w * 0.82, h * 0.5, h * 0.12, '#e24b2a', 0.9),
    ],
  },
  {
    name: 'Studio vs Feed',
    category: 'Thumbnail',
    summary: 'Split comparison built for a thumbnail',
    presetId: 'yt-thumb',
    background: '#f3eee4',
    build: (w, h) => [
      rect('left', w * 0.25, h / 2, w * 0.5, h, '#161616'),
      text('a1', w * 0.25, h * 0.32, 'Studio', 72, '#f6f1e8', {
        align: 'center',
        fontFamily: serif,
        weight: 400,
      }),
      text('a2', w * 0.25, h * 0.52, 'Quiet tools', 24, '#b7b1a8', {
        align: 'center',
        weight: 500,
      }),
      text('b1', w * 0.75, h * 0.32, 'Feed', 72, '#161616', {
        align: 'center',
        fontFamily: serif,
        weight: 400,
      }),
      text('b2', w * 0.75, h * 0.52, 'Loud type', 24, '#6f675e', {
        align: 'center',
        weight: 500,
      }),
      circle('badge', w / 2, h / 2, 42, '#e24b2a'),
      text('vs', w / 2, h / 2 - 16, 'VS', 22, '#ffffff', { align: 'center', weight: 800 }),
    ],
  },
  {
    name: 'Chapter Four',
    category: 'Thumbnail',
    summary: 'Warm chapter card with a dark rail',
    presetId: 'yt-thumb',
    background: '#f3e6d4',
    build: (_w, h) => [
      rect('rail', 150, h / 2, 300, h, '#1f3d34'),
      text('ch', 150, 250, 'CH', 18, '#d7b56d', { align: 'center', weight: 700 }),
      text('num', 150, 290, '04', 92, '#f6f1e8', {
        align: 'center',
        fontFamily: display,
        weight: 800,
      }),
      text('h1', 340, 180, 'Color,', 92, '#1a1814', { fontFamily: serif, weight: 400 }),
      text('h2', 340, 290, 'finally.', 92, '#1a1814', { fontFamily: serif, weight: 400 }),
      text('meta', 344, h - 100, 'A short lesson on contrast', 22, '#6f675e', { weight: 500 }),
    ],
  },
  {
    name: 'Now Shipping',
    category: 'Social',
    summary: 'Wide announcement with a single claim',
    presetId: 'x-post',
    background: '#10141c',
    build: (w, h) => [
      rect('rule', w / 2, 72, w - 160, 1.5, '#2a3344'),
      text('kicker', 88, 120, 'SHIPPING TODAY', 18, '#d7b56d', { weight: 700 }),
      text('h1', 80, 200, 'Reverse', 120, '#f6f1e8', { fontFamily: serif, weight: 400 }),
      text('h2', 84, 340, 'is in your browser.', 72, '#f6f1e8', { weight: 500 }),
      text('meta', 88, h - 120, 'No account   ·   Files stay here', 22, '#9aa3b2', { weight: 500 }),
      circle('mark', w - 140, h / 2, 8, '#d7b56d'),
    ],
  },
  {
    name: 'Four Point Eight',
    category: 'Social',
    summary: 'Stat card with a supporting line',
    presetId: 'x-post',
    background: '#f4efe6',
    build: (w, h) => [
      rect('panel', w * 0.72, h / 2, w * 0.46, h - 96, '#10241f'),
      text('kicker', 72, 80, 'THIS QUARTER', 16, '#6f675e', { weight: 700 }),
      text('num', 64, 140, '4.8×', 150, '#10241f', { fontFamily: display, weight: 800 }),
      text('sub', 72, 340, 'more finished posts', 32, '#1c1915', { weight: 500 }),
      text('sub2', 72, 390, 'from the same afternoon.', 32, '#1c1915', { weight: 500 }),
      text('side', w * 0.72, h / 2 - 40, 'Measured\non device.', 36, '#f4efe6', {
        align: 'center',
        fontFamily: serif,
        weight: 400,
      }),
    ],
  },
  {
    name: 'Seven Parts',
    category: 'Social',
    summary: 'Thread cover with a numbered spine',
    presetId: 'x-post',
    background: '#efe7d6',
    build: (_w, h) => [
      rect('spine', 70, h / 2, 8, h - 120, '#1a1814'),
      text('kicker', 120, 90, 'A THREAD', 16, '#6f675e', { weight: 700 }),
      text('h1', 112, 160, 'Seven parts', 96, '#1a1814', { fontFamily: serif, weight: 400 }),
      text('h2', 116, 280, 'on finishing the work.', 48, '#1a1814', { weight: 500 }),
      text('n', 120, h - 160, '01  —  07', 22, '#1f3d34', { fontFamily: display, weight: 700 }),
      text('save', 320, h - 158, 'Bookmark the first post', 22, '#6f675e', { weight: 500 }),
    ],
  },
]
