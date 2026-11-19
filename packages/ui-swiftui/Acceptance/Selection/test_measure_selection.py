"""Prove that mounted pixel analysis refuses a snap in either direction."""
import contextlib
import io
import unittest

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

spec = spec_from_file_location("measure_selection", Path(__file__).with_name("measure-selection.py"))
measure = module_from_spec(spec)
spec.loader.exec_module(measure)


def trace():
    # Position samples for stages 0 through 6. Forward and reverse are independently
    # mutable. The separate interrupted retarget trajectory stays intact.
    return {
        stage: [(x, x + 10) for x in positions]
        for stage, positions in {
            0: [10] * 6,
            1: [30, 50, 70, 90] + [130] * 6,
            2: [110, 90, 70, 50] + [10] * 6,
            3: [30, 50, 70, 90],
            4: [88, 83, 77, 70] + [65] * 6,
            5: [10] * 6,
            6: [10] * 6,
        }.items()
    }


class MeasureSelectionTests(unittest.TestCase):
    def test_accepts_travel_in_both_directions(self):
        with contextlib.redirect_stdout(io.StringIO()):
            for row, name in enumerate(("Tabs", "SegmentedControl")):
                measure.assert_row(trace(), row, name, "ltr")

    def test_rejects_a_snap_in_each_direction(self):
        for stage, offset, direction in ((1, 130, "forward"), (2, 10, "reverse")):
            for row, name in enumerate(("Tabs", "SegmentedControl")):
                with self.subTest(direction=direction, component=name):
                    frames = trace()
                    frames[stage] = [(offset, offset + 10)] * 6
                    with contextlib.redirect_stdout(io.StringIO()):
                        with self.assertRaisesRegex(AssertionError, f"{name} {direction}: expected three distinct"):
                            measure.assert_row(frames, row, name, "ltr")


if __name__ == "__main__":
    unittest.main(verbosity=2)
