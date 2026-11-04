// Geographic math only: no subject, imagery, scene choreography or renderer.
export const EARTH_RADIUS_KM = 6371.0088
const DEG = Math.PI / 180
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0)
const add = (a, b) => a.map((v, i) => v + b[i])
const sub = (a, b) => a.map((v, i) => v - b[i])
const mul = (a, k) => a.map(v => v * k)
const length = a => Math.hypot(...a)
const unit = a => mul(a, 1 / length(a))
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))

function finite(...values) {
  if (!values.every(Number.isFinite)) throw new TypeError('Expected finite numbers')
}
function position(lat, lon) {
  finite(lat, lon)
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new RangeError('Invalid latitude/longitude')
}
function radiusValue(radius) {
  finite(radius)
  if (radius <= 0) throw new RangeError('Radius must be positive')
}
export function earthPoint(lat, lon, radius = EARTH_RADIUS_KM) {
  position(lat, lon); radiusValue(radius)
  return [radius*Math.cos(lat*DEG)*Math.cos(lon*DEG), radius*Math.sin(lat*DEG),
    radius*Math.cos(lat*DEG)*Math.sin(lon*DEG)]
}

export function makeCamera({lat, lon, distance, tilt = 0, heading = 0,
  width = 1920, height = 1080, fov = 30, offsetX = 0, offsetY = 0,
  radius = EARTH_RADIUS_KM}) {
  position(lat, lon); radiusValue(radius)
  finite(distance, tilt, heading, width, height, fov, offsetX, offsetY)
  if (distance <= 0 || width <= 0 || height <= 0 || fov <= 0 || fov >= 180 || Math.abs(tilt) >= 90) {
    throw new RangeError('Invalid camera distance, size, field of view or tilt')
  }
  const target = earthPoint(lat, lon, radius), vertical = unit(target)
  const east = [-Math.sin(lon*DEG), 0, Math.cos(lon*DEG)]
  const north = unit(cross(east, vertical)), h = heading*DEG
  const right = add(mul(east, Math.cos(h)), mul(north, Math.sin(h)))
  const alongGround = add(mul(north, Math.cos(h)), mul(east, -Math.sin(h)))
  const pos = add(target, mul(add(mul(vertical, Math.cos(tilt*DEG)),
    mul(alongGround, -Math.sin(tilt*DEG))), distance))
  const forward = unit(sub(target, pos)), up = unit(cross(forward, right))
  return {pos, forward, right, up, radius, width, height, offsetX, offsetY,
    focal: height/2/Math.tan(fov*DEG/2), altitude: length(pos)-radius,
    sphereConstant: dot(pos, pos)-radius*radius}
}

export function project(camera, lat, lon) {
  const p = earthPoint(lat, lon, camera.radius), q = sub(p, camera.pos)
  const depth = dot(q, camera.forward)
  if (depth <= 0 || dot(p, sub(camera.pos, p)) < 0) return null
  return {x: camera.width/2+camera.offsetX+dot(q, camera.right)/depth*camera.focal,
    y: camera.height/2+camera.offsetY-dot(q, camera.up)/depth*camera.focal, depth}
}

export function groundPoint(camera, x, y) {
  finite(x, y)
  const ray = unit(add(camera.forward, add(
    mul(camera.right, (x-camera.width/2-camera.offsetX)/camera.focal),
    mul(camera.up, -(y-camera.height/2-camera.offsetY)/camera.focal))))
  const b = dot(camera.pos, ray), disc = b*b-camera.sphereConstant
  if (disc < 0 || b >= 0) return null
  // Stable near intersection for an outside camera. Computation stays in double precision.
  const t = camera.sphereConstant/(-b+Math.sqrt(disc))
  const p = add(camera.pos, mul(ray, t))
  return {lat: Math.asin(clamp(p[1]/camera.radius, -1, 1))/DEG,
    lon: Math.atan2(p[2], p[0])/DEG}
}

export function surfaceDistance(a, b, radius = EARTH_RADIUS_KM) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 2 || b.length !== 2) {
    throw new TypeError('Positions must be [lat, lon]')
  }
  position(...a); position(...b); radiusValue(radius)
  const h = Math.sin((b[0]-a[0])*DEG/2)**2
    + Math.cos(a[0]*DEG)*Math.cos(b[0]*DEG)*Math.sin((b[1]-a[1])*DEG/2)**2
  return 2*radius*Math.asin(Math.sqrt(clamp(h, 0, 1)))
}

export function groundDistance(camera, a, b) {
  const first = groundPoint(camera, ...a), last = groundPoint(camera, ...b)
  return first && last ? surfaceDistance([first.lat, first.lon], [last.lat, last.lon], camera.radius) : null
}

export function logDistance(from, to, progress) {
  finite(from, to, progress)
  if (from <= 0 || to <= 0) throw new RangeError('Log-distance endpoints must be positive')
  const t = clamp(progress, 0, 1)
  return Math.exp(Math.log(from)*(1-t)+Math.log(to)*t)
}

// The same progress drives both the geographic endpoint and unrounded reading.
// Antipodal endpoints need an explicit authored route; infinitely many shortest arcs exist.
export function rangeState(from, to, progress, radius = EARTH_RADIUS_KM) {
  const total = surfaceDistance(from, to, radius)
  finite(progress)
  const t = clamp(progress, 0, 1), a = unit(earthPoint(...from, radius))
  const b = unit(earthPoint(...to, radius)), cosine = clamp(dot(a, b), -1, 1)
  if (cosine < -1+1e-12) throw new RangeError('Antipodal endpoints require an explicit route')
  const angle = Math.acos(cosine)
  const point = angle < 1e-8 ? a : unit(add(mul(a, Math.sin((1-t)*angle)/Math.sin(angle)),
    mul(b, Math.sin(t*angle)/Math.sin(angle))))
  return {progress: t, totalKm: total, distanceKm: total*t,
    tip: {lat: Math.asin(clamp(point[1], -1, 1))/DEG, lon: Math.atan2(point[2], point[0])/DEG}}
}
