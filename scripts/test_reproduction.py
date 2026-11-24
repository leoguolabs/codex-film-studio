"""Regression checks for the source-bundle trust boundary and executable kits."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from reproduction import seal, restore, inspect_bundle, relative, archive, acquire, sha
import io
import tarfile
import subprocess
import shutil
import struct
import sys
from new_film import ROOT, create

spec = importlib.util.spec_from_file_location('runtime_build', ROOT/'runtime/build.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class ReproductionTests(unittest.TestCase):
    def test_executable_permissions_survive_archive_and_restore(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); source=root/'source'; source.mkdir()
            script=source/'build.sh'; script.write_text('#!/bin/sh\nprintf \"portable\\n\"\n'); script.chmod(0o775)
            bundle=seal(source,root/'bundle',{'style':'test','files':['build.sh']})
            self.assertTrue(inspect_bundle(bundle)['files'][0]['executable'])
            packed=archive(bundle,root/'source.tar.gz')
            with tarfile.open(root/'source.tar.gz') as tar:
                self.assertEqual(tar.getmember('project/build.sh').mode,0o755)
            acquired=acquire(root/'source.tar.gz',root/'unpacked',packed['sha256'])
            restored=restore(acquired,root/'restored')
            self.assertEqual((restored/'build.sh').stat().st_mode & 0o7777,0o755)
            self.assertEqual(subprocess.check_output([str(restored/'build.sh')]),b'portable\n')
            unsafe=root/'header-modes.tar.gz'
            with tarfile.open(root/'source.tar.gz') as src,tarfile.open(unsafe,'w:gz') as dst:
                for member in src:
                    member.mode=0o7777
                    dst.addfile(member,src.extractfile(member))
            safe=acquire(unsafe,root/'header-modes',sha(unsafe))
            self.assertEqual((safe/'project/build.sh').stat().st_mode & 0o7777,0o755)
            # Legacy v1 manifests remain accepted, with a safe non-executable default.
            manifest=inspect_bundle(bundle); del manifest['files'][0]['executable']
            (bundle/'reproduction-manifest.json').write_text(json.dumps(manifest))
            legacy=restore(bundle,root/'legacy')
            self.assertEqual((legacy/'build.sh').stat().st_mode & 0o7777,0o644)
            manifest['files'][0]['executable']='yes'
            (bundle/'reproduction-manifest.json').write_text(json.dumps(manifest))
            with self.assertRaises(ValueError):inspect_bundle(bundle)

    @unittest.skipUnless(shutil.which('ffmpeg'), 'requires FFmpeg')
    def test_delayed_audio_survives_a_buffered_input(self):
        # Reversing twice preserves the samples but holds the first frame until EOF.
        # This forces the delay filter to emit its leading silence before the cue is ready.
        clip = build.audio_clip_filters(start_sample=12000, gain=1)
        pcm = subprocess.check_output([
            'ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'aevalsrc=0.25:s=48000:d=0.125',
            '-af', f'areverse,areverse,{clip},apad,atrim=duration=0.5',
            '-ac', '1', '-f', 's16le', 'pipe:1',
        ])
        samples = [value for (value,) in struct.iter_unpack('<h', pcm)]
        self.assertEqual(len(samples), 24000)
        self.assertFalse(any(samples[:12000]))
        self.assertTrue(all(samples[12000:18000]))
        self.assertFalse(any(samples[18000:]))

    def test_python_and_javascript_output_dimensions_agree(self):
        vectors=[[1920,1080,w] for w in [2,320,480,640,720,1080,1920]]+[[1080,1920,720],[640,360,720]]
        js="import {outputDimensions} from './runtime/dimensions.mjs'; console.log(JSON.stringify("+json.dumps(vectors)+".map(v=>outputDimensions(...v))));"
        actual=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT))
        self.assertEqual(actual,[list(build.output_dimensions(*v)) for v in vectors])
        self.assertEqual(build.output_dimensions(1920,1080,720),(720,406))
        for width in [0,-2,721,True,1.5]:
            with self.assertRaises(ValueError):build.output_dimensions(1920,1080,width)

    def test_archive_roundtrip_checksum_and_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); source=root/'source'; source.mkdir()
            (source/'scene.mjs').write_text('export const frame = 12;')
            bundle=seal(source,root/'bundle',{'style':'test','files':['scene.mjs']})
            a=archive(bundle,root/'source.tar.gz')
            b=archive(bundle,root/'same.tar.gz')
            self.assertEqual(a['sha256'],b['sha256'])
            acquired=acquire(root/'source.tar.gz',root/'unpacked',a['sha256'])
            self.assertEqual(inspect_bundle(acquired),inspect_bundle(bundle))
            with self.assertRaises(ValueError):acquire(root/'source.tar.gz',root/'bad-hash','0'*64)
            with self.assertRaises(FileExistsError):archive(bundle,root/'source.tar.gz')
            for i,name in enumerate(['project/../../escape','project/../escape','project/.env']):
                attack=root/f'attack-{i}.tar.gz'
                with tarfile.open(attack,'w:gz') as tar:
                    info=tarfile.TarInfo(name); info.size=1;tar.addfile(info,io.BytesIO(b'x'))
                with self.assertRaises(ValueError):acquire(attack,root/f'bad-{i}',sha(attack))
            self.assertFalse((root/'escape').exists())

    def test_tampering_and_unlisted_files_cannot_restore(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); source=root/'source'; source.mkdir()
            (source/'scene.mjs').write_text('export const frame = 12;')
            bundle=seal(source,root/'bundle',{'style':'test','files':['scene.mjs']})
            restored=restore(bundle,root/'restored','test')
            self.assertEqual((restored/'scene.mjs').read_text(),(source/'scene.mjs').read_text())
            with self.assertRaises(FileExistsError):restore(bundle,restored)
            with self.assertRaises(ValueError):restore(bundle,root/'wrong-style','other')
            (bundle/'project/extra.txt').write_text('not in manifest')
            with self.assertRaises(ValueError):restore(bundle,root/'extra')
            (bundle/'project/extra.txt').unlink()
            (bundle/'project/scene.mjs').write_text('changed')
            with self.assertRaises(ValueError):restore(bundle,root/'changed')
            self.assertFalse((root/'changed').exists())

    def test_paths_and_symlinks_cannot_escape(self):
        for name in ['../outside','/absolute','a/../../escape','.env','node_modules/package.json','a\\b']:
            with self.subTest(name=name),self.assertRaises(ValueError):relative(name)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);source=root/'source';source.mkdir();(root/'outside').write_text('private')
            (source/'linked').symlink_to(root/'outside')
            with self.assertRaises(ValueError):seal(source,root/'bundle',{'style':'test','files':['linked']})
            self.assertFalse((root/'bundle').exists())

    def test_kits_have_closed_dependencies_and_empty_stories(self):
        catalog=json.loads((ROOT/'styles.json').read_text())
        with tempfile.TemporaryDirectory() as tmp:
            for entry in catalog['styles']:
                if entry['template_kind']!='blank' or not entry['capabilities']['scene_renderer']:continue
                with self.subTest(style=entry['id']):
                    p=create('kit',entry['id'],output=Path(tmp)/entry['id'])
                    if entry.get('render_script', '').endswith('.py'):
                        self.assertTrue((p / entry['render_script']).is_file())
                        self.assertTrue((p / entry['renderer_entry']).is_file())
                        self.assertIn('numpy==', (p / 'requirements.txt').read_text())
                        subprocess.run([sys.executable, '-c', 'import film; assert film.DURATION == 0 and callable(film.frame)'],
                                       cwd=p, check=True)
                        continue
                    package=json.loads((p/'package.json').read_text())
                    lock=json.loads((p/'package-lock.json').read_text())
                    self.assertEqual(package['dependencies'],lock['packages']['']['dependencies'])
                    if entry['id'] == 'impasto':
                        self.assertTrue((p/'tools/runtime/build.py').is_file())
                        self.assertIn('export const duration = 0;', (p/'src/film.js').read_text())
                        for dependency in ['engine/impasto.js', 'engine/plate.js', 'engine/LICENSE-MIT.txt',
                                           'src/stage.js', 'src/kinematics.js', 'scripts/check_contacts.mjs']:
                            self.assertTrue((p/dependency).is_file(), dependency)
                        self.assertEqual(package['scripts']['proof'], 'node scripts/render.mjs proof')
                        continue
                    if entry['id'] == 'colored-pencil':
                        self.assertTrue((p / entry['renderer_entry']).is_file())
                        self.assertTrue((p / 'fonts/glyphs.json').is_file())
                        self.assertTrue((p / 'scripts/compare_pencil.py').is_file())
                        subprocess.run(['node', '--input-type=module', '-e',
                                        "import {duration,setup} from './src/film.js'; if (duration !== 0 || typeof setup !== 'function') process.exit(1)"],
                                       cwd=p, check=True)
                    elif entry.get('uses_shared_runtime', True):
                        self.assertTrue((p/'tools/runtime/build.py').is_file())
                        self.assertTrue((p/'lib/scene.mjs').is_file())
                        self.assertFalse(json.loads((p/'content/production.json').read_text())['shots'])
                    else:
                        self.assertTrue((p/'engine/render.js').is_file())
                        self.assertEqual(package['scripts']['build'], 'node scripts/render.mjs')
                        self.assertEqual(json.loads((p/'content/cues.json').read_text()), [])
                        subprocess.run(['node', '--input-type=module', '-e',
                                        "import {film} from './film.js'; if (film.sheets.length) process.exit(1)"],
                                       cwd=p, check=True)
                    fonts=json.loads((p/'fonts/manifest.json').read_text())
                    self.assertTrue(fonts)
                    for font in fonts:
                        self.assertEqual(build.sha(p/font['file']),font['sha256'])
                        self.assertTrue((p/font['license']).is_file())
                    if entry['id']=='microgame':self.assertTrue((p/'engine/games.mjs').is_file())

    def test_timeline_gaps_and_overlapping_captions_are_rejected(self):
        plan=dict(width=640,height=360,fps=24,duration_frames=48,
                  shots=[dict(id='one',start=0,end=48)],captions=[])
        build.validate(plan)
        plan['shots'][0]['start']=1
        with self.assertRaises(ValueError):build.validate(plan)
        plan['shots'][0]['start']=0
        plan['captions']=[dict(text='a',start=0,end=24),dict(text='b',start=23,end=48)]
        with self.assertRaises(ValueError):build.validate(plan)
        self.assertEqual(build.timestamp(25,24),'00:00:01.042')


if __name__=='__main__':unittest.main()
