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
