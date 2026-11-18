"""Regression checks for the source-bundle trust boundary and executable kits."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from reproduction import seal, restore, inspect_bundle, relative, archive, acquire, sha
import io
import tarfile
from new_film import ROOT, create

spec = importlib.util.spec_from_file_location('runtime_build', ROOT/'runtime/build.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class ReproductionTests(unittest.TestCase):
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
                if entry['template_kind']!='blank':continue
                with self.subTest(style=entry['id']):
                    p=create('kit',entry['id'],output=Path(tmp)/entry['id'])
                    package=json.loads((p/'package.json').read_text())
                    lock=json.loads((p/'package-lock.json').read_text())
                    self.assertEqual(package['dependencies'],lock['packages']['']['dependencies'])
                    self.assertTrue((p/'tools/runtime/build.py').is_file())
                    self.assertTrue((p/'lib/scene.mjs').is_file())
                    self.assertFalse(json.loads((p/'content/production.json').read_text())['shots'])
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
