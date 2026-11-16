#!/bin/bash
set -euo pipefail
device=$1
app=$2
output=$3
shift 3
bundle=dev.kinetixui.m682selection
xcrun simctl bootstatus "$device" -b
xcrun simctl terminate "$device" "$bundle" 2>/dev/null || true
xcrun simctl install "$device" "$app"
xcrun simctl io "$device" recordVideo --codec=h264 --force "$output" &
recording=$!
trap 'kill -INT "$recording" 2>/dev/null || true; wait "$recording" || true' EXIT
sleep 1
xcrun simctl launch "$device" "$bundle" --timeline "$@"
sleep 7
