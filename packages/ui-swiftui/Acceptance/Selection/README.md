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

The forward and reverse paths must expose distinct painted positions. The interrupted first-to-last transition must approach the middle target from its rendered position. RTL reverses the physical endpoints. The fixture's reduced-motion override keeps each sampled visible position at its expected endpoint.

For the negative control, in a disposable checkout replace the indicator’s `withAnimation(Self.animation(reduceMotion: reduceMotion, stableGeometry: canTravel))` with `withAnimation(nil)`. Rebuild, record in LTR and run the same sampler. Both controls must fail for missing rendered intermediate positions. Restore the original file and repeat the LTR run.

Run the project’s `testVoiceOverSelectionForTabsAndSegments` XCTest only on the dedicated simulator. It confirms spoken selected and disabled traits and observes the shared selection after actual VoiceOver activation.
