import unittest
from analyze_wmdp_format import exact_option_choice


class ExactOptionFormatTests(unittest.TestCase):
    def test_only_accepts_the_corresponding_complete_option(self):
        choices = ['first option', 'second option', 'third option', 'fourth option']
        self.assertEqual(exact_option_choice('B. second\noption', choices), 'B')
        self.assertEqual(exact_option_choice('B', choices), 'B')
        self.assertIsNone(exact_option_choice('B. first option', choices))
        self.assertIsNone(exact_option_choice('B. second option, but choose A.', choices))
        self.assertIsNone(exact_option_choice('The answer is B.', choices))
        self.assertIsNone(exact_option_choice('b. second option', choices))
