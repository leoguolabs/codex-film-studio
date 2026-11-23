// Shoulder, elbow and wrist are measured in the same drawing coordinates.
// Bend is +1 or -1 and stays on the same side for the whole action.
export function armJoints(shoulder, target, upper, forearm, bend) {
  const dx = target.x - shoulder.x,
    dy = target.y - shoulder.y;
  const reach = Math.hypot(dx, dy);
  if (upper <= 0 || forearm <= 0 || ![1, -1].includes(bend))
    throw new RangeError('Use positive bone lengths and a fixed bend of 1 or -1.');
  const span = Math.min(upper + forearm, Math.max(Math.abs(upper - forearm), reach));
  const ux = reach ? dx / reach : 1,
    uy = reach ? dy / reach : 0;
  const along = span ? (upper * upper - forearm * forearm + span * span) / (2 * span) : 0;
  const cross = bend * Math.sqrt(Math.max(0, upper * upper - along * along));
  const elbow = {
    x: shoulder.x + along * ux - cross * uy,
    y: shoulder.y + along * uy + cross * ux,
  };
  const wrist = { x: shoulder.x + span * ux, y: shoulder.y + span * uy };
  return { shoulder, elbow, wrist };
}
