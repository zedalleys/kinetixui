"""Prove that mounted pixel analysis refuses a snap in either direction."""
import contextlib
import functools
import io
import os
import subprocess
import sys
import tempfile
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


class AnalyzerCommandTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        # Stub only the decoder process. The production CLI still reads RGB bytes,
        # identifies bands and stages, dispatches assertions and sets the exit code.
        decoder = self.root / "ffmpeg"
        decoder.write_text(
            "#!/usr/bin/env python3\n"
            "import shutil, sys\n"
            "from pathlib import Path\n"
            "source = Path(sys.argv[sys.argv.index('-i') + 1])\n"
            "with source.open('rb') as raw:\n"
            "    shutil.copyfileobj(raw, sys.stdout.buffer)\n"
            "if source.name == 'decoder-failure.rgb':\n"
            "    sys.exit(23)\n",
            encoding="utf-8",
        )
        decoder.chmod(0o755)

    @staticmethod
    @functools.lru_cache(maxsize=64)
    def frame(stage, centers):
        rgb = bytearray(measure.FRAME_SIZE)

        def stripe(y, x, width, color):
            start = (y * measure.WIDTH + x) * 3
            rgb[start:start + width * 3] = bytes(color) * width

        stripe(32, 10, 20 + stage * 20, (0, 255, 0))
        for top, center in zip((260, 380), centers):
            for y in range(top, top + 12, 2):
                stripe(y, center + 40 - 12, 25, (255, 0, 255))
        return bytes(rgb)

    def evidence(self, stages, name="fixture.rgb", suffix=b""):
        fixture = self.root / name
        with fixture.open("wb") as footage:
            for stage, frames in stages.items():
                for centers in frames:
                    footage.write(self.frame(stage, centers))
            footage.write(suffix)
        return fixture

    def run_analyzer(self, input_path, mode="ltr", source=None, optimize=False):
        env = dict(os.environ, PATH=str(self.root) + os.pathsep + os.environ.get("PATH", ""))
        command = [sys.executable, "-B"]
        if optimize:
            command.append("-O")
        command.extend([str(source or Path(measure.__file__)), str(input_path), mode])
        return subprocess.run(command, env=env, capture_output=True, text=True, timeout=60)

    def assert_success(self, run, mode):
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn("Tabs stages", run.stdout)
        self.assertIn("SegmentedControl stages", run.stdout)
        self.assertEqual(run.stdout.splitlines()[-1], "PASS mounted selection " + mode)

    def assert_failure(self, run, message):
        self.assertNotEqual(run.returncode, 0, run.stdout)
        self.assertIn(message, run.stderr)
        self.assertNotIn("PASS mounted selection", run.stdout)

    def test_real_command_accepts_ltr_rtl_and_reduced_motion(self):
        reduced = {stage: [(x, x + 10)] * 2 for stage, x in enumerate((10, 130, 10, 130, 65, 10, 10))}
        rtl = {stage: [tuple(140 - x for x in row) for row in rows] for stage, rows in trace().items()}
        for mode, values in (("ltr", trace()), ("rtl", rtl), ("reduce", reduced)):
            with self.subTest(mode=mode):
                self.assert_success(self.run_analyzer(self.evidence(values), mode), mode)

    def test_real_command_rejects_forward_and_reverse_snaps(self):
        for stage, offset, direction in ((1, 130, "forward"), (2, 10, "reverse")):
            with self.subTest(direction=direction):
                frames = trace()
                frames[stage] = [(offset, offset + 10)] * 2
                run = self.run_analyzer(self.evidence(frames), optimize=True)
                for control in ("Tabs", "SegmentedControl"):
                    self.assert_failure(run, control + " " + direction + ": expected three distinct")

    def test_real_command_rejects_absent_and_malformed_evidence(self):
        no_reverse = trace()
        del no_reverse[2]
        no_controls = {stage: [(10,)] * 2 for stage in range(7)}
        for label, values, suffix, diagnostic in (
            ("empty", {}, b"", "Missing frames with both selection controls"),
            ("no-controls", no_controls, b"", "Missing frames with both selection controls"),
            ("no-reverse", no_reverse, b"", "2: 0"),
            ("no-interrupted", {**trace(), 3: trace()[3][:1]}, b"", "3: 1"),
            ("partial", trace(), b"truncated", "Video decoder returned a partial frame"),
        ):
            with self.subTest(label=label):
                self.assert_failure(self.run_analyzer(self.evidence(values, suffix=suffix)), diagnostic)

    def test_real_command_rejects_decoder_failure_even_after_valid_frames(self):
        fixture = self.evidence(trace(), "decoder-failure.rgb")
        self.assert_failure(self.run_analyzer(fixture), "Video decoder failed (exit 23)")

    def test_real_command_requires_both_assertion_results(self):
        source = Path(measure.__file__).read_text(encoding="utf-8")
        dispatch = "verified.append(assert_row(stages, row, name, args.mode))"
        self.assertEqual(source.count(dispatch), 1)
        for mutation in ("pass", "verified.append(None)"):
            with self.subTest(mutation=mutation):
                modified = self.root / "measure-selection.py"
                modified.write_text(source.replace(dispatch, mutation), encoding="utf-8")
                run = self.run_analyzer(self.evidence(trace()), source=modified)
                self.assert_failure(run, "Incomplete selection analysis")

    def test_command_contract_rejects_zero_exit_without_analysis_output(self):
        modified = self.root / "measure-selection.py"
        modified.write_text("raise SystemExit(0)\n", encoding="utf-8")
        run = self.run_analyzer(self.evidence(trace()), source=modified)
        self.assertEqual(run.returncode, 0)
        with self.assertRaisesRegex(AssertionError, "Tabs stages"):
            self.assert_success(run, "ltr")



if __name__ == "__main__":
    unittest.main(verbosity=2)
