# Mounted SwiftUI selection check

Use a dedicated iOS 27 simulator with a 402 × 874 point display and the installed Xcode toolchain. The host renders Tabs and SegmentedControl from the local package. The timeline marker and contrasting theme let the sampler identify the two painted indicators without altering product layout or animation.

From this directory, run:

```sh
xcodebuild build -project MotionHost.xcodeproj -scheme MotionHost \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/kinetix-selection-build
app=/tmp/kinetix-selection-build/Build/Products/Debug-iphonesimulator/MotionHost.app
bash record-selection.sh "$SIMULATOR_UDID" "$app" /tmp/selection-ltr.mp4
python3 measure-selection.py /tmp/selection-ltr.mp4 ltr
bash record-selection.sh "$SIMULATOR_UDID" "$app" /tmp/selection-rtl.mp4 --rtl
python3 measure-selection.py /tmp/selection-rtl.mp4 rtl
bash record-selection.sh "$SIMULATOR_UDID" "$app" /tmp/selection-reduced.mp4 --reduce
python3 measure-selection.py /tmp/selection-reduced.mp4 reduce
```

The recording fixture renders cyan, blue and yellow rails from the unanimated
bounds of the first, middle and last controls. A separate green badge identifies
the selected slot. The magenta indicator is measured independently in the same
normalized raster. The analyzer checks stable layout, the fixture's logical
selection schedule, and settled indicator center (4 px on either axis) and width
(6 px). The top and bottom rails locate the control center despite rounded
indicator corners. These tolerances cover raster quantization and compressed
chroma edges. RTL reverses the physical endpoints without remapping logical
slots. Older recordings without layout rails cannot establish destination
geometry and should be re-recorded with this host.

Forward, reverse, and return from the middle slot require distinct painted
positions. The interrupted first-to-last transition must approach the middle
target from its rendered position. Reduced motion requires aligned endpoint
samples at every stage. The final settled stage must retain the first slot.

Run the same CLI suite used by CI from the repository root:

```sh
python3 -B packages/ui-swiftui/Acceptance/Selection/test_measure_selection.py
```

The suite exercises the real CLI with controlled RGB frames, including both
snap directions, wrong-way motion, width, alignment, identity, missing evidence,
and coherently shifted target metadata. For a product-motion control, replace
the shared indicator's `withAnimation(animation)` with `withAnimation(nil)`
in a disposable checkout. Rebuild, record and run the same analyzer. Replay
the unmodified host to verify valid travel.

Run the project’s `testVoiceOverSelectionForTabsAndSegments` XCTest only on the dedicated simulator. It confirms spoken selected and disabled traits and observes the shared selection after actual VoiceOver activation.

## Timeline evidence contract

This CLI certifies the scripted seven-stage recording, not an arbitrary selection
clip. Every LTR, RTL and reduced-motion run includes all these stages, with at
least two measurements of both controls per stage:

| Stage | Logical selected slot | Meaning |
| --- | --- | --- |
| 0 | first (0) | initial settled selection |
| 1 | last (2) | ordinary forward selection |
| 2 | first (0) | ordinary reverse selection |
| 3 | last (2) | interrupted forward selection |
| 4 | middle (1) | retarget and settle |
| 5 | first (0) | return from retarget |
| 6 | first (0) | final settled no-op / completion witness |

Stages are repeated visual state markers, not unique event records. Contiguous
repetition is expected; returning to an earlier stage is invalid. Skipping a
stage, removing the retarget window, or truncating before completion fails the
coverage requirement. Standalone no-op or non-retarget clips do not satisfy this
scripted contract; this does not classify those product interactions as invalid.

Capture pre-roll before the first valid measured frame is permitted. From that
frame to decoder EOF, every frame requires a readable timeline marker and both
controls. A missing or malformed marker fails with its frame index and preceding
stage, even if surviving frames would otherwise prove alignment. No observed
indicator position supplies the expected destination. The host schedule supplies
logical intent; button rails supply control bounds; a separate badge supplies
selected identity; component paint supplies the observed indicator. All witnesses
share the capture and fixture, so this is independent of indicator paint, not an
external oracle for arbitrary host tampering. The CLI preserves geometry and
ordered travel assertions and exits nonzero on evidence, geometry or motion
failure. Early rejection terminates and reaps the decoder.
