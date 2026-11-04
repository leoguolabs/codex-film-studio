"""A recognizer decision cannot silently transfer to another script or take."""
import hashlib
import unittest

from transcribe import recognizer_for, words


class RecognizerDecisionTests(unittest.TestCase):
    def setUp(self):
        self.row = {"id": "06", "text": "Use the idea.", "audio_sha256": "take-two"}
        self.decisions = {"06": {
            "source_sha256": hashlib.sha256(self.row["text"].encode()).hexdigest(),
            "audio_sha256": "take-two",
            "model": "reviewed-recognizer",
        }}

    def test_only_the_reviewed_source_and_audio_get_the_selected_recognizer(self):
        self.assertEqual(recognizer_for(self.row, "default", self.decisions),
                         "reviewed-recognizer")
        self.assertEqual(recognizer_for(self.row, "default", {}), "default")

    def test_rewritten_text_rejects_the_old_decision(self):
        with self.assertRaisesRegex(ValueError, "older narration"):
            recognizer_for({**self.row, "text": "Use a new method."},
                           "default", self.decisions)

    def test_a_new_take_requires_its_own_decision(self):
        with self.assertRaisesRegex(ValueError, "another WAV"):
            recognizer_for({**self.row, "audio_sha256": "take-three"},
                           "default", self.decisions)

    def test_apostrophe_spelling_does_not_imply_an_audio_difference(self):
        self.assertEqual(words("the control group's"), words("the control groups"))
        self.assertEqual(words("the control group’s"), words("the control groups"))

    def test_apostrophe_normalization_keeps_missing_sounds_visible(self):
        self.assertNotEqual(words("the control group's"), words("the control group"))
        self.assertNotEqual(words("it doesn't help"), words("it does help"))

    def test_observed_numeric_transcripts_match_spelled_source_values(self):
        self.assertEqual(words("50 plus 48 percent gives 74, not 98"),
                         words("fifty plus forty eight percent gives seventy four, not ninety eight"))
        self.assertEqual(words("6,000 students"), words("six thousand students"))

    def test_wrong_and_unknown_numbers_remain_detectable(self):
        self.assertNotEqual(words("74"), words("98"))
        self.assertNotEqual(words("48 percent"), words("148 percent"))
        self.assertEqual(words("12345"), ["12345"])
        self.assertNotEqual(words("1.5"), words("1 5"))

    def test_compound_spellings_preserve_the_same_sounds(self):
        self.assertEqual(words("preregistered preprint reread"),
                         words("pre-registered pre print re-read"))
        self.assertNotEqual(words("reread"), words("read"))
        self.assertNotEqual(words("practiced worked"), words("practice work"))

    def test_algebraic_number_spelling_keeps_values_and_variables(self):
        self.assertEqual(words("2x plus 6"), words("two x plus six"))
        self.assertNotEqual(words("2x plus 6"), words("two x plus three"))
        self.assertNotEqual(words("2x"), words("2y"))
        self.assertEqual(words("1.5x"), ["1.5", "x"])


if __name__ == "__main__":
    unittest.main()
