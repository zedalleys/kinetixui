---
"@kinetixui/iot": patch
---

Preserve client boundaries in the IoT React build so server components can import the mixed root without executing React client modules, while the functions entry stays React-free.
