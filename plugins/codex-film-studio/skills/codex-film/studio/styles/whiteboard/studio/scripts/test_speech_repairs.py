"""Keep retries bound to source and preserve the provider attempt limit."""
import json
from pathlib import Path
import tempfile
import unittest

from speech import check_attempt_budget, digest, speech_seed, preflight_text


class SpeechRepairTests(unittest.TestCase):
    def test_preflight_checks_every_selected_line_before_generation(self):
        lines = [{"id": "01", "text": "A" * 250},
                 {"id": "02", "text": "B" * 251},
                 {"id": "03", "text": "C" * 300}]
        preflight_text(lines, {"01"}, 250)
        with self.assertRaisesRegex(ValueError, "02: 251, 03: 300"):
            preflight_text(lines, {"01", "02", "03"}, 250)

    def test_changed_source_rejects_an_old_repair(self):
        line = {"id": "02", "text": "Where would you start?"}
        repairs = {"02": {"source_sha256": digest(line["text"].encode()), "seed": 1221}}
        self.assertEqual(speech_seed(line, 1, repairs), 1221)
        self.assertEqual(speech_seed(line, 1, {}), 221)
        with self.assertRaisesRegex(ValueError, "older narration"):
            speech_seed({**line, "text": "Explain your next step."}, 1, repairs)

    def test_resumption_does_not_consume_an_attempt_but_a_fourth_is_rejected(self):
        line = {"id": "02", "text": "Where would you start?"}
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            for identity in ["first", "second", "third"]:
                (folder/f"02-{identity}.request.json").write_text(json.dumps({
                    "identity": identity, "source_sha256": digest(line["text"].encode())}))
            check_attempt_budget(folder, line, "second")
            with self.assertRaisesRegex(ValueError, "Three-attempt bound"):
                check_attempt_budget(folder, line, "fourth")
            check_attempt_budget(folder, {**line, "text": "A revised sentence."}, "new-source")


if __name__ == "__main__":
    unittest.main()
