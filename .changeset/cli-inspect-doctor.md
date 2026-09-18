---
"@kinetixui/cli": minor
---

Add `kinetixui inspect <name>` (show a registry item's description, dependencies, files, and whether it's installed in the current project) and `kinetixui doctor` (check `kinetixui.json`, its aliases, the Tailwind CSS target, registry reachability, and whether anything in your `ui` directory still matches a registry name — exits non-zero on failure, so it's CI-safe).
