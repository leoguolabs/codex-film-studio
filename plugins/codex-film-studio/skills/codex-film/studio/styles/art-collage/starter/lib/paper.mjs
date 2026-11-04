import { createCanvas, loadImage } from '@napi-rs/canvas'
import path from 'node:path'

export const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value))
export const easeOut = value => 1 - (1 - clamp(value)) ** 3

export function seededRandom(seed = 1) {
  let state = seed | 0
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let value = Math.imul(state ^ state >>> 15, 1 | state)
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

function dimensions(width, height) {
  if (![width, height].every(value => Number.isInteger(value) && value > 0)) {
    throw new RangeError('Width and height must be positive integers')
  }
}

// A texture's native dimensions never define a frame's coverage.
export async function loadPaper(file, width, height) {
  dimensions(width, height)
  const source = await loadImage(file)
  const surface = createCanvas(width, height)
  surface.getContext('2d').drawImage(source, 0, 0, width, height)
  return surface
}

export function tornPath(context, width, height, { seed = 1, roughness = 5 } = {}) {
  const random = seededRandom(seed)
  const points = [[0, 0], [width, 0], [width, height], [0, height]]
  context.beginPath()
  for (let side = 0; side < points.length; side++) {
    const start = points[side], end = points[(side + 1) % points.length]
    const dx = end[0] - start[0], dy = end[1] - start[1]
    const length = Math.hypot(dx, dy), count = Math.max(2, Math.ceil(length / 8))
    let drift = 0
    for (let step = 0; step < count; step++) {
      drift = .82 * drift + (random() - .5) * roughness
      const fraction = step / count
      const x = start[0] + dx * fraction - dy / length * drift
      const y = start[1] + dy * fraction + dx / length * drift
      if (!side && !step) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
  }
  context.closePath()
}

export function drawPaper(context, texture, x, y, width, height, options = {}) {
  dimensions(width, height)
  const { fill = '#efece2', rotation = 0, seed = 1, roughness = 5,
    textureOpacity = .5, shadow = 8 } = options
  context.save()
  context.translate(x, y)
  context.rotate(rotation)
  tornPath(context, width, height, { seed, roughness })
  context.fillStyle = fill
  context.shadowColor = '#28251f35'
  context.shadowBlur = shadow
  context.shadowOffsetX = 3
  context.shadowOffsetY = 5
  context.fill()
  context.shadowColor = 'transparent'
  context.clip()
  context.globalCompositeOperation = 'multiply'
  context.globalAlpha *= clamp(textureOpacity)
  context.drawImage(texture, 0, 0, width, height)
  context.restore()
}

export async function loadCharacter(record, projectDirectory) {
  if (!record?.id || !['real', 'anonymous'].includes(record.kind)) {
    throw new Error('Character requires an id and kind: real or anonymous')
  }
  if (record.kind === 'real' && record.source !== 'user-supplied') {
    throw new Error(`Request a user-supplied portrait for ${record.name || record.id}`)
  }
  if (typeof record.portrait !== 'string' || !record.portrait.trim()) {
    throw new Error(`Missing portrait input for ${record.name || record.id}`)
  }
  const file = path.resolve(projectDirectory, record.portrait)
  const image = await loadImage(file)
  const crop = record.crop ?? [0, 0, image.width, image.height]
  if (!Array.isArray(crop) || crop.length !== 4 || !crop.every(Number.isFinite)
      || crop[0] < 0 || crop[1] < 0 || crop[2] <= 0 || crop[3] <= 0
      || crop[0] + crop[2] > image.width || crop[1] + crop[3] > image.height) {
    throw new RangeError(`Portrait crop is outside the image for ${record.id}`)
  }
  return { id: record.id, image, crop, file }
}

export function drawCutout(context, character, x, y, height, rotation = 0) {
  if (!Number.isFinite(height) || height <= 0) throw new RangeError('Invalid cutout height')
  const { image, crop } = character
  context.save()
  context.translate(x, y)
  context.rotate(rotation)
  context.shadowColor = '#28251f30'
  context.shadowBlur = 8
  context.shadowOffsetX = 3
  context.shadowOffsetY = 5
  context.drawImage(image, ...crop, 0, 0, height * crop[2] / crop[3], height)
  context.restore()
}
