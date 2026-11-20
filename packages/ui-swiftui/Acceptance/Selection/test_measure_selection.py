"""Verify the mounted selection analyzer's CLI and temporal trajectory checks."""
import functools
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
            5: [55, 43, 31, 21] + [10] * 6,
            6: [10] * 6,
        }.items()
    }


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
            "    try:\n"
            "        shutil.copyfileobj(raw, sys.stdout.buffer)\n"
            "        sys.stdout.buffer.flush()\n"
            "    except BrokenPipeError:\n"
            "        import os; os._exit(0)\n"
            "if source.name == 'decoder-failure.rgb':\n"
            "    sys.exit(23)\n",
            encoding="utf-8",
        )
        decoder.chmod(0o755)

    @staticmethod
    @functools.lru_cache(maxsize=64)
    def frame(stage, centers, mode, selected, shift, omit, width, y_shift, transform):
        rgb = bytearray(measure.FRAME_SIZE)

        def stripe(y, x, width, color):
            start = (y * measure.WIDTH + x) * 3
            rgb[start:start + width * 3] = bytes(color) * width

        stripe(32, 10, 20 + stage * 20, (0, 255, 0))
        schedule = (0, 2, 0, 2, 1, 0, 0)
        colors = ((0, 255, 255), (0, 0, 255), (255, 255, 0))
        for row, (top, center) in enumerate(zip((260, 380), centers)):
            # Target layout is constructed from controls independent of indicator samples.
            slots = [10 + row * 10, 65 + row * 10, 130 + row * 10]
            if mode == "rtl":
                slots = [140 - value for value in slots]
            for slot, (target, color) in enumerate(zip(slots, colors)):
                if omit == slot:
                    continue
                offset = shift if slot == schedule[stage % len(schedule)] else 0
                left = target + 40 - 12 + offset
                for y in range(top - 8, top - 3):
                    stripe(y, left, 25, color)
                for y in range(top + 17, top + 22):
                    stripe(y, left + transform, 25, color)
            target_slot = schedule[stage % len(schedule)] if selected is None else selected
            if target_slot >= 0:
                offset = shift if target_slot == schedule[stage % len(schedule)] else 0
                for y in range(top - 16, top - 11):
                    stripe(y, slots[target_slot] + 40 - 5 + offset, 11, (0, 255, 0))
            for y in range(top + y_shift, top + 11 + y_shift):
                stripe(y, center + 40 - width // 2, width, (255, 0, 255))
        return bytes(rgb)

    def evidence(self, stages, name="fixture.rgb", suffix=b"", mode="ltr", faults=None):
        fixture = self.root / name
        with fixture.open("wb") as footage:
            for stage, frames in stages.items():
                for centers in frames:
                    fault = (faults or {}).get(stage, {})
                    footage.write(self.frame(
                        stage, centers, mode, fault.get("selected"), fault.get("shift", 0),
                        fault.get("omit"), fault.get("width", 25), fault.get("y_shift", 0),
                        fault.get("transform", 0),
                    ))
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
                self.assert_success(self.run_analyzer(self.evidence(values, mode=mode), mode), mode)

    def test_real_command_rejects_forward_and_reverse_snaps(self):
        for stage, offset, direction in ((1, 130, "forward"), (2, 10, "reverse")):
            with self.subTest(direction=direction):
                frames = trace()
                frames[stage] = [(offset, offset + 10)] * 2
                run = self.run_analyzer(self.evidence(frames), optimize=True)
                for control in ("Tabs", "SegmentedControl"):
                    self.assert_failure(run, control + " " + direction + ": expected three distinct")


    def test_real_command_rejects_wrong_way_travel_in_both_directions(self):
        for stage, direction, wrong in (
            (1, "forward", [130, 110, 90, 70, 50, 30] + [130] * 6),
            (2, "reverse", [10, 30, 50, 70, 90, 110] + [10] * 6),
        ):
            for mode in ("ltr", "rtl"):
                with self.subTest(direction=direction, mode=mode):
                    frames = trace()
                    frames[stage] = [(x, x + 10) for x in wrong]
                    if mode == "rtl":
                        frames = {s: [tuple(140 - x for x in row) for row in rows] for s, rows in frames.items()}
                    result = self.run_analyzer(self.evidence(frames, mode=mode), mode, optimize=True)
                    for name in ("Tabs", "SegmentedControl"):
                        self.assert_failure(result, f"{name} {direction}: wrong-way travel")

    def test_real_command_requires_target_convergence_and_limited_jitter(self):
        for label, stage, samples, diagnostic in (
            ("away from start", 1, [2, 30, 50, 70, 90] + [130] * 6, "outside its endpoints"),
            ("oscillation", 1, [30, 50, 46, 70, 90] + [130] * 6, "wrong-way travel"),
            ("wrong reverse endpoint", 2, [110, 90, 70, 50] + [30] * 6, "stage 2 slot 0: indicator center x"),
            ("wrong retarget trajectory", 4, [88, 83, 75, 86, 70] + [65] * 6, "retarget: wrong-way travel"),
        ):
            with self.subTest(label=label):
                frames = trace()
                frames[stage] = [(x, x + 10) for x in samples]
                self.assert_failure(self.run_analyzer(self.evidence(frames)), diagnostic)

        frames = trace()
        frames[1] = [(x, x + 10) for x in [30, 50, 49, 70, 90] + [130] * 6]
        self.assert_success(self.run_analyzer(self.evidence(frames)), "ltr")

    def test_real_command_rejects_incorrect_destination_geometry(self):
        for label, stage, positions, faults, diagnostic in (
            ("shift both retarget indicators", 4, [88, 83, 77, 70, 58, 52] + [47] * 6,
             {}, "stage 4 slot 1: indicator center x"),
            ("shift target witnesses with indicators", 4, [88, 83, 77, 70, 58, 52] + [47] * 6,
             {"shift": -18}, "layout moved during a stable fixture"),
            ("forward toward wrong destination", 1, [30, 50, 70, 90, 98] + [112] * 6,
             {}, "stage 1 slot 2: indicator center x"),
            ("wrong selected identity with aligned paint", 4, [130] * 6,
             {"selected": 2}, "wrong selected identity"),
            ("return ignores selected first", 5, [65] * 6,
             {}, "stage 5 slot 0: indicator center x"),
            ("wrong final width", 4, None, {"width": 37}, "indicator width"),
            ("wrong final vertical center", 4, None, {"y_shift": 7}, "indicator center y"),
            ("missing selected bounds", 4, None, {"omit": 1}, "Missing selected-control bounds"),
            ("bad coordinate transform", 4, None, {"transform": 9}, "Invalid coordinate transform"),
            ("missing identity", 4, None, {"selected": -1}, "Missing or ambiguous selected-control identity"),
            ("missing final paint", 4, None, {"width": 5}, "Missing indicator measurement"),
        ):
            with self.subTest(label=label):
                frames = trace()
                if positions is not None:
                    frames[stage] = [(x, x + 10) for x in positions]
                result = self.run_analyzer(self.evidence(frames, faults={stage: faults}), optimize=True)
                self.assert_failure(result, diagnostic)

    def test_real_command_rejects_missing_and_out_of_order_stage_metadata(self):
        frames = trace()
        missing_target = {stage: rows for stage, rows in frames.items() if stage != 1}
        self.assert_failure(self.run_analyzer(self.evidence(missing_target)), "1: 0")
        invalid_marker = {7 if stage == 1 else stage: rows for stage, rows in frames.items()}
        self.assert_failure(self.run_analyzer(self.evidence(invalid_marker)), "1: 0")
        out_of_order = {stage: frames[stage] for stage in (0, 2, 1, 3, 4, 5, 6)}
        self.assert_failure(self.run_analyzer(self.evidence(out_of_order)), "Stage markers out of order")


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
