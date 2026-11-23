# Code-drawn performers and music for a moving print

## Build the action in drawing coordinates

Create every visual from code. Draw the locations, figures, props and textile patterns with editable Canvas paths and procedural print textures. Define the jaw, cheeks, eyes, mouth, ears, hair and hair ornaments in a single local head drawing. Place that drawing at the neck with translation, a fixed scale and rotation. In a mirrored view mirror the complete head. A deliberate nod can rotate the entire head about the neck. Keep arm, hand and fabric motion outside this transform. A shared displacement field across the face and sleeve distorts facial proportions.

Mark the shoulder, elbow, wrist, fingertips and material contact in the same coordinate space. Solve the two bone lengths using the reusable function below. Its returned wrist is the reachable target. Place the palm and the working tool from that same wrist. Keep the grip, thread end or handle at the drawn fingertip. Choose the elbow bend side once for each arm. Check actual reach at the extremes of the action.

```js
import { armJoints } from './engine/articulation.js';
const shoulder = { x: 130, y: 55 };
const target = { x: 80, y: 120 };
const { elbow, wrist } = armJoints(shoulder, target, 52, 56, -1);
```

Create the sleeve from the upper arm and forearm silhouettes. Round the shoulder, join the areas at a bent elbow, and close the cuff across the forearm. Derive fabric folds from its joints. Paint the far upper arm behind the torso and the working hand in front of its material. Rotate a lifted tool about the hand. Let the cloth move only in the region that is being pulled. For travel, leave the support foot planted in the world until the other leg has taken the weight. Export significant character action at the shot’s intended playback cadence.

## Check face isolation in motion

1. Render the head alone from its source function and keep an opaque mask covering the hairline, jaw and features. Render the complete action over one or more full cycles. Compare the same masked pixels at every frame with the head master in a shared coordinate system. A still head with a moving arm should retain identical opaque pixels throughout. For intentional nods, undo the rigid placement before comparing. Record intentional occlusions separately.
2. Check the final encoded MP4. Undo the shot's camera scale, pan and any rigid head motion before inspecting the face crops. Check at rest, during the largest pull, on contact and on the return. Allow for compression and subpixel sampling in a moving camera. Inspect the wrist, sleeve opening, prop and cloth in these same frames and at normal speed.
3. Keep the paths, programmatic patterns, joint lengths, motion timing and review evidence in the production. A blank style kit only needs the drawing method and general-purpose helpers. To repeat a code-drawn shot, use the saved source, locked renderer and frozen soundtrack.

## Commission an instrumental and build the sound around it

Give the music service the intended duration, emotional turn, featured instruments, cue times, available space for narration and desired ending. Select instrumental when the voice track carries the story. Give each film its own composition. If using Gemini, select its music tool and choose the available full or standard duration and Instrumental option. Confirm the result by exporting and probing the playable media. A text arrangement or a generation request alone cannot supply a soundtrack.

Keep the original performance, its prompt and its credited generating service in the production. Save the clean score separately from the mix. Prepare real or suitably performed foley for the material seen on screen. Put footsteps on impacts, textile sounds on tension and releases, and foreground hits at the actual point of contact. Shape space with stereo position, recorded room tone and natural tails. Under narration, make room in the score with a gentle midrange cut and smooth level changes. Check words, the quietest pause and the loudest action in the encoded film.

On the film's showcase, name the score and its actual generating service or composer, provide an independent music audition, and distinguish the generated performance from the sound effects and voice. Link to the credited recording sources. Include the frozen inputs and the commands needed to rebuild the delivered film offline. Another generation from the same prompt can make a different performance; the retained approved asset supports replay.
