// Original Codex Film Studio identity: two offset film-frame windows.
// Deliberately asymmetric, without radial arms, petals, or a play triangle.
export const BACK_FRAME = 'M16 47H10Q6 47 6 43V11Q6 7 10 7H40Q44 7 44 11V16'
export const FRONT_FRAME = 'M24 20H54Q58 20 58 24V54Q58 58 54 58H24Q20 58 20 54V24Q20 20 24 20Z'

export function frameMark(c, x, y, radius, color = '#B8452B') {
  c.save()
  c.translate(x - radius, y - radius)
  c.scale(radius / 32, radius / 32)
  c.strokeStyle = color
  c.lineWidth = 5
  c.lineJoin = 'round'
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(16, 47); c.lineTo(10, 47); c.quadraticCurveTo(6, 47, 6, 43)
  c.lineTo(6, 11); c.quadraticCurveTo(6, 7, 10, 7)
  c.lineTo(40, 7); c.quadraticCurveTo(44, 7, 44, 11); c.lineTo(44, 16)
  c.stroke()
  c.beginPath()
  c.roundRect(20, 20, 38, 38, 4)
  c.stroke()
  c.restore()
}
