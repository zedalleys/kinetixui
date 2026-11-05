# Changelog

pub.dev reads this file from the package directory and renders it as the Changelog tab. It records
what changed in `kinetix_ui` specifically; the repository's release notes under `release/notes/`
cover the npm packages and are a different cohort with a different version line.

## Unreleased

`kinetix_ui` has never been published to pub.dev. The committed `pubspec.yaml` is deliberately
unpublishable — `version: 0.0.0` and `publish_to: none` — so that a stray local `flutter pub
publish` refuses; `.github/workflows/publish-flutter.yml` supplies the real version at publish
time. Until a first version ships, consume the package from a pinned git or path dependency as
`/docs/flutter` describes.

The version this package will first publish under, and whether the native packages track the npm
version line or start their own at `0.1.0`, are open decisions. Nothing below this heading should
be written until one of them is made, because a pub.dev version is permanent once taken.
