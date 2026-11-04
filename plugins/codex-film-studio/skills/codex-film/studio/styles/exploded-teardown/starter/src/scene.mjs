// Author new drawings here. No previous story or cast is inherited.
import {drawStyle} from '../lib/scene.mjs';
export async function drawFrame(context, state) {
  await drawStyle(context, state);
}
export {dispose,checkEnvironment,validateScene} from '../lib/scene.mjs';
