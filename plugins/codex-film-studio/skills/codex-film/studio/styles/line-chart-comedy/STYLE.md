# Animated Line Chart Comedy

A restrained chart interface becomes a small animated stage. The chart remains mathematically honest while its labels, camera and editorial overlays perform the story.

## Visual grammar

Use one persistent white or near-white rounded card on a cool, very pale grey field. Give the card a light edge and a small soft shadow. Keep a compact title at the upper left, quiet segmented controls at the upper right, a thin horizontal grid, muted monospaced axis labels and a live legend below the plot. Avoid dashboard chrome that does not help the viewer.

Draw thin colored polylines and small observation dots. A compact character token follows each important endpoint; secondary series can use plain dots. Tokens may have eyes, a brief blink, a small recoil or a material-specific bounce. Rebuild tokens for the new subject; do not carry identities or logos from another production. Keep their motion subordinate to the true data point.

Large condensed headlines sit above the card. Use white fill, a strong dark outline and an occasional warm yellow emphasis. An editorial card enters inside the plot with a short elastic settling movement. It can contain an event, a quotation, or a source excerpt, but it must be fully readable within the current camera frame.

Comic starbursts, streaks and particles punctuate a few important moments. They are visual annotations, never replacement data. Schedule the burst before the event-card reading window so it cannot obscure the claim. Avoid making every event equally loud.

## Motion and camera

Default to smooth motion at the delivery frame rate. Render directly from integer frame indices; random details need fixed seeds. The opening card settles into view, lines progressively reveal, and the current-time cursor advances with the observations. Alternate patient wide views with motivated close-ups, brief impact shake and a clear return to the whole chart. A late close-up can give a character a small closing action. End with a held result or a pale wash over the persistent chart.

Camera zooms belong to the chart world. Headline text belongs to the screen. Data points, event anchors, tokens and trails must use the same world-to-screen transform. Compute event-card safe bounds after the camera transform rather than assuming the wide-frame position is still visible.

For a reference-led production, measure the source's card bounds, grid bounds, title baseline, stroke widths, colors and camera scale. Save the measurements in the external production. Match motion envelopes as well as the still-frame appearance. Do not guess color handling from an untagged video: compare native decoded pixels and explicitly control the output RGB-to-YUV matrix.

## Data integrity

Keep units, currency/base period where applicable, territorial coverage, source versions, interpolation policy and estimates/forecasts explicit. Do not splice incompatible levels without a documented linking method. Animation between observations is not an additional observation. Do not invent values to create a sharper joke or a dramatic crossing.

Use a common scale across comparable series. If the scale changes, animate it continuously and keep its labels legible. A moving axis changes the visual slope; it must not be mistaken for a change in the data. A log scale must be explicitly marked.

Separate the data anchor from its label token. When tokens collide, displace only labels and draw clear leaders to visible true endpoints. Check each frame around rank crossings; a label sorter can change order abruptly even when the data is continuous. Do not shift every label when only the lower cluster collides. When a cluster cannot fit, change the annotation strategy or framing rather than moving data marks.

Use a distinct, readable convention for projected or interpolated segments. Label an event as context unless there is evidence for a causal claim. Total size, rate of growth and per-person measures are different stories.

## Sound

An original light rhythmic score can combine short mallet notes, a syncopated bass, restrained percussion and a soft harmonic bed. Annual or categorical arrivals can make quiet ticks. Cards have a soft swish; impacts have a short transient and elastic answer; camera moves have a restrained sweep. Silence immediately before a major change can make its sound more effective than additional loudness.

Read all events from the picture's frame schedule. Convert a frame to a sample once. Leave space for natural speech and duck the score around actual speech intervals. A streaming WAV response may contain placeholder RIFF/data lengths: validate the payload and repair only the container lengths when needed, preserving the samples. Confirm the transcription after replacing any voice line. Never call ASR or signal measurements a listening review.

## Review and delivery

Decode every source and delivery frame into an index/timestamp ledger. Check frame count, cadence, color conversion, non-finite state, accidental blanks and data invariants. Create consecutive-frame sheets with no skipped indices, then actually inspect the relevant sheets. A generated sheet alone is not a completed visual review.

For different subjects, compare the style: card geometry, hierarchy, line treatment, endpoint behavior, headline outline, event-card entrance, camera envelope, impact treatment and closing motion. A pixel-error or image-similarity score will mostly measure the different content; do not turn it into a claim of complete style identity.

Inspect native-resolution dense frames and transition intervals in addition to thumbnail coverage. Record which frames were visually inspected, which were only decoded, which playback intervals were checked, and whether audio was perceptually heard. Repair concrete findings, then recheck the encoded replacement. Keep final media, source data, voice recordings, provider details and acceptance records outside this library.

This package is a blank authoring starter and generic review toolkit. It contains no finished film, subject data, narration or composition.
