# Shared production workflow

1. Fill the new project's brief: subject, audience, language, duration, delivery
   dimensions and the question the viewer should be able to answer.
2. Read `STYLE.md` and use [reference adaptation](reference-adaptation.md) when
   a reference is supplied. Record source claims, reference intervals, asset permissions
   and any required identities in the external production. A specific real
   person uses a portrait supplied for that project.
3. Write a new story and shots. Give each shot a visible action or relationship,
   a camera destination and a readable hold. Choose drawings, recorded media,
   generated imagery or diagrams for that purpose. Use [media selection](media-selection.md)
   to inspect actual source intervals and reframe them around the subject.
4. Generate narration through a configured service, or import recordings.
   Preserve original WAVs and source hashes; measure them before locking timing.
   Keep credentials and provider job records in the external project.
5. Use one integer-frame clock with half-open shot ranges `[start, end)` for
   picture, speech, captions and event sounds. Derive state deterministically
   from the requested frame. Rebuild dependent timing when the audio changes.
6. Author the subject's scene layers and sound mix with the supplied renderer when available; otherwise implement the renderer in the production.
   Keep narration, score, ambience and effects separately editable. Lock actual
   dependencies in the production, and coordinate FFmpeg with other local jobs.
7. Render representative native-size stills and motion previews, inspect them,
   repair concrete defects, then encode the complete film.
8. Follow `REVIEW.md` and deliver the actual MP4 with editable sources and the
   scope of verification. Keep new media, sources and review records in the
   external project. Publication requires the user's request.

For a compilation or changed brief, follow [revision and delivery](revision-delivery.md).
Rebuild the edit around the new viewing experience, renew affected evidence and
promote only subject-independent lessons to this library.

A starter creates files and tools; authoring the scenes, narration and any missing rendering
is part of the film project. A prior sample's acceptance does not accept a new film.
