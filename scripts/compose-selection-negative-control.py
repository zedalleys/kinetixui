"""Prove the rendered selection tests reject a snapped indicator."""
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = Path("packages/ui-compose")
SOURCE = PACKAGE / "ui/src/main/kotlin/com/kinetixui/ui/KinetixSelectionIndicator.kt"
SUITE = "com.kinetixui.ui.SelectionIndicatorTest"
REPORT = Path(f"ui/build/test-results/testDebugUnitTest/TEST-{SUITE}.xml")
MOTION_TESTS = {
    "tabsGlidePreviousToNext",
    "tabsGlideNextToPrevious",
    "segmentsGlidePreviousToNext",
    "segmentsGlideNextToPrevious",
}


def run_suite(checkout, expect_snap_failure=False):
    package = checkout / PACKAGE
    report = package / REPORT
    report.unlink(missing_ok=True)
    gradle = subprocess.run([
        "./gradlew", "--console=plain", *sys.argv[1:],
        ":ui:testDebugUnitTest", "--tests", SUITE, "--rerun",
    ], cwd=package)
    cases = ET.parse(report).findall("testcase")
    names = {case.attrib["name"] for case in cases if case.find("skipped") is None}
    failures = {
        case.attrib["name"]: case.find("failure").attrib["message"]
        for case in cases if case.find("failure") is not None
    }
    if not MOTION_TESTS <= names or any(case.find("error") is not None for case in cases):
        raise SystemExit("The expected Compose motion tests did not execute cleanly.")
    if expect_snap_failure:
        if gradle.returncode == 0 or set(failures) != MOTION_TESTS or any(
            "indicator must travel through distinct intermediate positions" not in message
            for message in failures.values()
        ):
            raise SystemExit(f"Expected only the rendered motion assertions to fail: {failures}")
        print("All four independent motion tests reject a snapped indicator.", flush=True)
    elif gradle.returncode != 0 or failures:
        raise SystemExit(f"The normal Compose indicator suite failed: {failures}")


def main():
    with tempfile.TemporaryDirectory(prefix="compose-selection-control-") as temporary:
        checkout = Path(temporary) / "checkout"
        subprocess.run(["git", "worktree", "add", "--detach", checkout, "HEAD"], cwd=ROOT, check=True)
        try:
            source = checkout / SOURCE
            original = source.read_text()
            mutated, count = re.subn(
                r"presentation\.animateTo\(\n\s+target,\n\s+tween\([^\n]+\),\n\s+\)",
                "presentation.snapTo(target)",
                original,
            )
            if count != 1:
                raise SystemExit("Expected exactly one selection indicator animation to mutate.")

            run_suite(checkout)
            source.write_text(mutated)
            try:
                run_suite(checkout, expect_snap_failure=True)
            finally:
                source.write_text(original)
            run_suite(checkout)
        finally:
            subprocess.run(["git", "worktree", "remove", "--force", checkout], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
