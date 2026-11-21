"""Measure mounted SwiftUI indicator pixels and timeline markers in a simulator recording."""
import argparse
from contextlib import closing
import subprocess
from typing import NamedTuple


WIDTH, HEIGHT = 402, 874
FRAME_RATE = 60
FRAME_SIZE = WIDTH * HEIGHT * 3


# The stage schedule names the intended logical slots. Layout rails separately
# encode each slot and the green witness identifies the actually selected one.
EXPECTED_SLOT = (0, 2, 0, 2, 1, 0, 0)
GEOMETRY_TOLERANCE = 4
WIDTH_TOLERANCE = 6


class Bounds(NamedTuple):
    left: int
    right: int
    top: int
    bottom: int

    @property
    def x(self):
        return (self.left + self.right) / 2

    @property
    def y(self):
        return (self.top + self.bottom) / 2

    @property
    def width(self):
        return self.right - self.left + 1


class Row(NamedTuple):
    indicator: Bounds
    slots: tuple
    selected: int


def bands(rows, minimum_rows):
    groups = []
    for y, left, right in rows:
        if not groups or y - groups[-1][-1][0] > 4:
            groups.append([])
        groups[-1].append((y, left, right))
    return [
        Bounds(min(left for _, left, _ in group), max(right for _, _, right in group),
               group[0][0], group[-1][0])
        for group in groups if len(group) >= minimum_rows
    ]


def read_rows(frame):
    # Slot colors stay at the real unanimated control edges. Green indicates
    # selected identity separately. Magenta is the actual painted indicator.
    color_rows = [[], [], [], [], []]
    for y in range(180, 650, 2):
        pixels = frame[y * WIDTH * 3:(y + 1) * WIDTH * 3]
        columns = [[], [], [], [], []]
        for x, (r, g, b) in enumerate(zip(pixels[::3], pixels[1::3], pixels[2::3])):
            if b > 140:
                if g > 155 and r < 105:
                    columns[0].append(x)
                elif g < 105:
                    if r < 100:
                        columns[1].append(x)
                    elif r > 180:
                        columns[4].append(x)
            elif g > 155:
                if r > 175 and b < 105:
                    columns[2].append(x)
                elif r < 100 and b < 110:
                    columns[3].append(x)
        for i, xs in enumerate(columns):
            if len(xs) >= (5 if i == 3 else 22):
                color_rows[i].append((y, min(xs), max(xs)))
    indicators = bands(color_rows[4], 5)
    if len(indicators) != 2:
        return ()
    rails = [bands(rows, 2) for rows in color_rows[:3]]
    if any(len(pair) != 4 for pair in rails):
        raise RuntimeError("Missing selected-control bounds: each slot needs both layout rails for both controls")
    selected_marks = bands(color_rows[3], 2)
    if len(selected_marks) != 2:
        raise RuntimeError("Missing or ambiguous selected-control identity")
    yield_rows = []
    for row, (indicator, selected) in enumerate(zip(indicators, selected_marks)):
        slots = []
        for pair in rails:
            top, bottom = pair[2 * row:2 * row + 2]
            if (
                abs(top.left - bottom.left) > GEOMETRY_TOLERANCE
                or abs(top.right - bottom.right) > GEOMETRY_TOLERANCE
                or not top.y < bottom.y
                or not 2 <= top.y - selected.y <= 14
            ):
                raise RuntimeError("Invalid coordinate transform or layout rail alignment")
            slots.append(Bounds(top.left, top.right, top.top, bottom.bottom))
        matches = [i for i, slot in enumerate(slots) if abs(selected.x - slot.x) <= GEOMETRY_TOLERANCE]
        if len(matches) != 1:
            raise RuntimeError("Invalid selected-control identity: marker must match exactly one layout slot")
        yield_rows.append(Row(indicator, tuple(slots), matches[0]))
    return tuple(yield_rows)


def samples(video):
    command = [
        "ffmpeg", "-v", "error", "-i", video, "-vf", f"fps={FRAME_RATE},scale={WIDTH}:{HEIGHT}",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
    ]
    with subprocess.Popen(command, stdout=subprocess.PIPE) as decoder:
        try:
            while frame := decoder.stdout.read(FRAME_SIZE):
                if len(frame) != FRAME_SIZE:
                    raise RuntimeError("Video decoder returned a partial frame")
                marker_width = 0
                for y in range(32, 180, 3):
                    row = frame[y * WIDTH * 3:(y + 1) * WIDTH * 3]
                    marker_width = max(marker_width, sum(
                        g > 165 and r < 100 and b < 110
                        for r, g, b in zip(row[::3], row[1::3], row[2::3])
                    ))
                stage = round((marker_width - 20) / 20)
                if 0 <= stage <= 6 and abs(marker_width - (20 + stage * 20)) <= 6:
                    yield stage, read_rows(frame)
                else:
                    yield None, ()  # Preserve unreadable frames for timeline validation.
            if decoder.wait() != 0:
                raise RuntimeError(f"Video decoder failed (exit {decoder.returncode})")
        finally:
            # On evidence rejection, stop decoding before Popen waits. Closing
            # the generator explicitly also avoids noisy FFmpeg broken pipes.
            if decoder.poll() is None:
                decoder.kill()
            decoder.wait()
            decoder.stdout.close()


def require(condition, message):
    if not condition:
        raise AssertionError(message)


# Decoder edges are measured in integer pixels and their midpoint can shift by
# half a pixel. Allow two pixels of capture jitter without permitting cumulative
# backtracking. The selection indicator uses a non-spring timing curve.
POSITION_JITTER = 2
SETTLED_TOLERANCE = 4


def assert_travel(values, start, end, name, *, settles=True, min_positions=3):
    require(abs(end - start) > SETTLED_TOLERANCE, f"{name}: missing distinct target geometry")
    margin = min(7, abs(end - start) / 5)
    lower, upper = sorted((start, end))
    intermediate = [position for position in values if lower + margin < position < upper - margin]
    distinct = {round(position / 3) for position in intermediate}
    require(
        len(distinct) >= min_positions,
        f"{name}: expected {'three' if min_positions == 3 else 'one'} distinct rendered intermediate positions, got {intermediate}",
    )

    span = end - start
    tolerance = POSITION_JITTER / abs(span)
    farthest = 0.0
    for frame, position in enumerate(values):
        progress = (position - start) / span
        require(-tolerance <= progress <= 1 + tolerance, f"{name}: frame {frame} traveled outside its endpoints")
        require(
            progress >= farthest - tolerance,
            f"{name}: wrong-way travel at frame {frame}: progress {progress:.3f} after {farthest:.3f}",
        )
        farthest = max(farthest, progress)
    if settles:
        require(
            all(abs(x - end) < SETTLED_TOLERANCE for x in values[-3:]),
            f"{name}: final frames did not converge on target {end}",
        )

def assert_alignment(indicator, target, label):
    require(abs(indicator.x - target.x) <= GEOMETRY_TOLERANCE,
            f"{label}: indicator center x {indicator.x} misses selected slot x {target.x}")
    require(abs(indicator.y - target.y) <= GEOMETRY_TOLERANCE,
            f"{label}: indicator center y {indicator.y} misses selected slot y {target.y}")
    require(abs(indicator.width - target.width) <= WIDTH_TOLERANCE,
            f"{label}: indicator width {indicator.width} misses selected slot width {target.width}")


def assert_row(stages, row, name, mode):
    rows = {stage: [frame[row] for frame in frames] for stage, frames in stages.items()}
    layout = rows[0][-1].slots
    first, middle, last = (slot.x for slot in layout)
    positions = {stage: [sample.indicator.x for sample in frames] for stage, frames in rows.items()}
    print(f"{name} stages { {key: value[:12] for key, value in positions.items()} }", flush=True)
    print(f"{name} layout {layout}", flush=True)
    require(abs(first - last) > 75, f"{name}: first and last endpoints overlap")
    require((first > last) == (mode == "rtl"), f"{name}: physical direction is wrong")
    require(min(first, last) + 10 < middle < max(first, last) - 10, f"{name}: bad middle endpoint")

    for stage, frames in rows.items():
        slot = EXPECTED_SLOT[stage]
        for sample in frames:
            require(sample.selected == slot, f"{name} stage {stage}: wrong selected identity {sample.selected}, expected {slot}")
            require(
                all(abs(a - b) <= GEOMETRY_TOLERANCE
                    for actual, baseline in zip(sample.slots, layout)
                    for a, b in zip(actual, baseline)),
                f"{name} stage {stage}: selected-control layout moved during a stable fixture",
            )
        if mode == "reduce" or stage != 3:
            settled = frames if mode == "reduce" or stage == 6 else frames[-3:]
            for sample in settled:
                assert_alignment(sample.indicator, layout[slot], f"{name} stage {stage} slot {slot}")

    if mode != "reduce":
        assert_travel(positions[1], first, last, f"{name} forward")
        assert_travel(positions[2], last, first, f"{name} reverse")
        # The stage marker can precede the rendered turn by one frame. Split
        # at the farthest of the first two samples toward the original target.
        retarget = positions[4]
        pivot = max(range(2), key=lambda frame: (retarget[frame] - first) / (last - first))
        assert_travel(
            positions[3] + retarget[:pivot + 1], first, last,
            f"{name} interrupted forward", settles=False,
        )
        before, after = positions[3][-1], retarget[0]
        require(abs(before - after) < 32, f"{name}: abrupt retarget from {before} to {after}")
        require(
            any(abs(sample - middle) > 8 for sample in positions[4][:4]),
            f"{name}: retarget snapped immediately to its endpoint",
        )
        assert_travel(retarget[pivot:], retarget[pivot], middle, f"{name} retarget", min_positions=1)
        assert_travel(positions[5], middle, first, f"{name} return from retarget")
    return name


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video")
    parser.add_argument("mode", choices=("ltr", "rtl", "reduce"))
    args = parser.parse_args()
    stages = {stage: [] for stage in range(7)}
    previous_stage = 0
    try:
        with closing(samples(args.video)) as decoded:
            for frame_index, (stage, rows) in enumerate(decoded):
                if stage is None:
                    if any(stages.values()):
                        raise RuntimeError(
                            f"Missing or invalid timeline marker at frame {frame_index} after stage {previous_stage}"
                        )
                    continue  # Leading capture pre-roll precedes the measured run.
                if stage < previous_stage:
                    raise RuntimeError(f"Stage markers out of order: {stage} follows {previous_stage}")
                if not rows:
                    if any(stages.values()):
                        raise RuntimeError(f"Missing indicator measurement in stage {stage}")
                    continue  # SwiftUI can paint the first marker before the first indicator.
                previous_stage = stage
                stages[stage].append(rows)
    except (OSError, RuntimeError) as error:
        raise SystemExit(str(error)) from None

    missing = {stage: len(frames) for stage, frames in stages.items() if len(frames) < 2}
    if missing:
        raise SystemExit(f"Missing frames with both selection controls by stage: {missing}")

    expected = ("Tabs", "SegmentedControl")
    verified = []
    failures = []
    for row, name in enumerate(expected):
        try:
            verified.append(assert_row(stages, row, name, args.mode))
        except AssertionError as error:
            failures.append(str(error))
    if failures:
        raise SystemExit("\n".join(failures))
    if tuple(verified) != expected:
        raise SystemExit("Incomplete selection analysis: both controls must return a verification result")
    print(f"PASS mounted selection {args.mode}")

if __name__ == "__main__":
    main()
