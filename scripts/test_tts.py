"""Offline checks for narration cache integrity and frame-accurate voice binding."""
import argparse
import asyncio
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave

from tts import edge_voice as voice


def make_wav(path, samples=24001):
    with wave.open(str(path), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(24000)
        wav.writeframes(b'\0\0' * samples)


class FakeClient:
    calls = 0

    class Communicate:
        def __init__(self, text, **settings):
            FakeClient.calls += 1

        async def stream(self):
            yield {'type': 'audio', 'data': b'fixture-mp3'}
            yield {'type': 'WordBoundary', 'text': 'Fixture', 'offset': 0, 'duration': 10_000_000}


class VoiceTests(unittest.TestCase):
    def generate(self, root, text='Fixture narration.'):
        (root / 'clips').mkdir(exist_ok=True)
        def convert(args):
            make_wav(Path(args[-1]))
        with patch.object(voice, 'ffmpeg', side_effect=convert):
            return asyncio.run(voice.generate_line(
                FakeClient, root, {'id': 'intro', 'text': text}, voice.DEFAULTS, 'fixture'))

    def test_identical_request_reuses_audio_and_changed_text_gets_new_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            FakeClient.calls = 0
            a = self.generate(root)
            b = self.generate(root)
            self.assertEqual(FakeClient.calls, 1)
            self.assertEqual(a, b)
            c = self.generate(root, 'Revised fixture narration.')
            self.assertEqual(FakeClient.calls, 2)
            self.assertNotEqual(a['artifacts']['wav']['file'], c['artifacts']['wav']['file'])
            self.assertTrue((root / a['artifacts']['wav']['file']).is_file())

    def test_corrupt_cache_and_changed_caption_text_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            a = self.generate(root)
            edited = copy.deepcopy(a)
            edited['text'] = 'Different words without regenerating audio.'
            with self.assertRaisesRegex(ValueError, 'text no longer matches'):
                voice.verify_record(root, edited)
            (root / a['artifacts']['wav']['file']).write_bytes(b'corrupt')
            with self.assertRaisesRegex(ValueError, 'Changed audio artifact'):
                self.generate(root)

    def test_binding_uses_ceiling_frame_duration_and_rejects_overlap_or_overrun(self):
        with tempfile.TemporaryDirectory() as temporary:
            project = Path(temporary)
            root = project / 'media/voice'
            root.mkdir(parents=True)
            a = self.generate(root)
            plan = {'fps': 24, 'duration_frames': 100}
            audio, captions = voice.bind_plan(plan, {'lines': [a]}, {'intro': 4}, root, project)
            self.assertEqual(audio[0]['end'], 29)  # 24001 samples exceed one second.
            self.assertEqual(audio[0]['start'], captions[0]['start'])
            self.assertEqual(audio[0]['end'], captions[0]['end'])
            self.assertEqual(audio[0]['file'], 'media/voice/' + a['artifacts']['wav']['file'])
            with self.assertRaisesRegex(ValueError, 'exceeds the film'):
                voice.bind_plan(plan, {'lines': [a]}, {'intro': 90}, root, project)
            b = copy.deepcopy(a)
            b['id'] = 'second'
            with self.assertRaisesRegex(ValueError, 'overlaps'):
                voice.bind_plan(plan, {'lines': [a, b]}, {'intro': 4, 'second': 20}, root, project)

    def test_apply_preserves_music_and_backs_up_previous_plan(self):
        with tempfile.TemporaryDirectory() as temporary:
            project = Path(temporary)
            (project / 'content').mkdir()
            root = project / 'media/voice'
            root.mkdir(parents=True)
            a = self.generate(root)
            manifest = root / 'manifest.json'
            manifest.write_text(json.dumps({'provider': voice.PROVIDER, 'lines': [a]}))
            schedule = project / 'content/starts.json'
            schedule.write_text('{"intro": 0}')
            plan_path = project / 'content/production.json'
            music = {'file': 'music.wav', 'role': 'music', 'start': 0, 'end': 100}
            plan_path.write_text(json.dumps({'fps': 24, 'duration_frames': 100,
                                            'silent': True, 'audio': [music], 'captions': []}))
            before = plan_path.read_bytes()
            args = argparse.Namespace(project=project, manifest=manifest, schedule=schedule,
                                      apply=True, replace_voice=False)
            voice.bind(args)
            plan = json.loads(plan_path.read_text())
            self.assertEqual(plan['audio'][0], music)
            self.assertFalse(plan['silent'])
            self.assertEqual(len(plan['captions']), 1)
            self.assertEqual(next((project / 'content').glob('production-before-voice-*.json')).read_bytes(), before)
            with self.assertRaisesRegex(ValueError, 'Existing voice/captions preserved'):
                voice.bind(args)

    def test_inputs_reject_duplicate_ids_and_traversal(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'narration.json'
            for rows in [[{'id': '../bad', 'text': 'Fixture'}],
                         [{'id': 'a', 'text': 'Fixture'}, {'id': 'a', 'text': 'Again'}]]:
                path.write_text(json.dumps({'lines': rows}))
                with self.assertRaisesRegex(ValueError, 'unique, safe filenames'):
                    voice.read_narration(path)


if __name__ == '__main__':
    unittest.main()
