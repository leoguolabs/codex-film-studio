"""Ensure each build stays in its edition and comparison is optional."""
import unittest
from unittest.mock import patch
import build
from production import production


class EditionDeliveryTests(unittest.TestCase):
    def test_long_build_routes_stages_without_a_reference(self):
        with patch('sys.argv', ['build.py', '--edition', 'long', '--speech']), \
                patch.object(build, 'run') as run, \
                patch.object(build.Path, 'is_file', return_value=False):
            build.main()
        calls = [list(c.args) for c in run.call_args_list]
        routed = [c for c in calls if c[1] != 'scripts/analyze_frames.py']
        self.assertEqual(len(routed), 8)
        for command in routed:
            self.assertEqual(command[command.index('--edition')+1], 'long')
        self.assertEqual(calls[-1][2], production('long').video)
        self.assertNotIn(production('short').video, sum(calls, []))
        self.assertFalse(any('scripts/compare_frames.py' in c for c in calls))

    def test_reference_enables_comparison_for_selected_edition(self):
        with patch('sys.argv', ['build.py', '--edition', 'short']), \
                patch.object(build, 'run') as run, \
                patch.object(build.Path, 'is_file', return_value=True):
            build.main()
        command = list(run.call_args_list[-1].args)
        self.assertEqual(command[1], 'scripts/compare_frames.py')
        self.assertEqual(command[2], production('short').video)
        self.assertEqual(command[command.index('--timeline')+1],
                         production('short').root/'media/timeline.json')


if __name__ == '__main__':
    unittest.main()
