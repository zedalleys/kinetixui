"""Measure mounted SwiftUI indicator pixels and timeline markers in a simulator recording."""
import argparse
import statistics
import subprocess


WIDTH, HEIGHT = 402, 874
FRAME_RATE = 60
FRAME_SIZE = WIDTH * HEIGHT * 3


def samples(video):
    command = [
        "ffmpeg", "-v", "error", "-i", video, "-vf", f"fps={FRAME_RATE},scale={WIDTH}:{HEIGHT}",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
    ]
    with subprocess.Popen(command, stdout=subprocess.PIPE) as decoder:
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
            if not 0 <= stage <= 6 or abs(marker_width - (20 + stage * 20)) > 6:
                yield None, ()
                continue

            bands = []
            for y in range(220, 650, 2):
                row = frame[y * WIDTH * 3:(y + 1) * WIDTH * 3]
                xs = [
                    x for x, (r, g, b) in enumerate(zip(row[::3], row[1::3], row[2::3]))
                    if r > 180 and g < 105 and b > 140
                ]
                if len(xs) < 22:
                    continue
                if not bands or y - bands[-1][-1][0] > 4:
                    bands.append([])
                bands[-1].append((y, min(xs), max(xs)))
            centers = [
                (min(left for _, left, _ in band) + max(right for _, _, right in band)) / 2
                for band in bands if len(band) >= 5
            ]
            yield stage, tuple(centers)
        if decoder.wait() != 0:
            raise RuntimeError(f"Video decoder failed (exit {decoder.returncode})")


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def assert_travel(values, start, end, name):
    margin = 7
    lower, upper = sorted((start, end))
    intermediate = [position for position in values if lower + margin < position < upper - margin]
    distinct = {round(position / 3) for position in intermediate}
    require(len(distinct) >= 3, f"{name}: expected three distinct rendered intermediate positions, got {intermediate}")


def assert_row(stages, row, name, mode):
    positions = {stage: [centers[row] for centers in frames] for stage, frames in stages.items()}
    settled = {stage: statistics.median(xs[-5:]) for stage, xs in positions.items() if stage != 3}
    first, last, middle = settled[0], settled[1], settled[4]
    print(f"{name} stages { {key: value[:12] for key, value in positions.items()} }", flush=True)
    require(abs(first - last) > 75, f"{name}: first and last endpoints overlap")
    require((first > last) == (mode == "rtl"), f"{name}: physical direction is wrong")
    require(min(first, last) + 10 < middle < max(first, last) - 10, f"{name}: bad middle endpoint")
    require(abs(settled[2] - first) < 4 and abs(settled[6] - first) < 4, f"{name}: reverse did not settle")
    if mode == "reduce":
        for stage, target in ((1, last), (2, first), (3, last), (4, middle), (5, first), (6, first)):
            require(
                all(abs(sample - target) <= 4 for sample in positions[stage]),
                f"{name}: rendered travel under reduced motion in stage {stage}",
            )
    else:
        assert_travel(positions[1], first, last, f"{name} forward")
        assert_travel(positions[2], last, first, f"{name} reverse")
        assert_travel(positions[3] + positions[4][:2], first, last, f"{name} interrupted forward")
        before, after = positions[3][-1], positions[4][0]
        require(abs(before - after) < 32, f"{name}: abrupt retarget from {before} to {after}")
        require(
            any(abs(sample - middle) > 8 for sample in positions[4][:4]),
            f"{name}: retarget snapped immediately to its endpoint",
        )
    return name


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video")
    parser.add_argument("mode", choices=("ltr", "rtl", "reduce"))
    args = parser.parse_args()
    stages = {stage: [] for stage in range(7)}
    try:
        for stage, centers in samples(args.video):
            if stage is not None and len(centers) == 2:
                stages[stage].append(centers)
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
