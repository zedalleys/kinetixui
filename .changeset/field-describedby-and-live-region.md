---
"@kinetixui/ui": patch
---

`Field` names only the description and message that exist, and an inline error is now announced.

`FieldControl` set `aria-describedby="<id>-description <id>-message"` unconditionally, while both parts are optional and usually conditional (`{error && <FieldMessage/>}`). A field with neither named two ids that were not in the document, which is the resting state of every `AddressFields` row without a description. The attribute now lists an id only when its element is rendered: resolved at render time from `Field`'s own children (so server markup is already correct and hydration does not change it), and by registration after mount for a part rendered deeper than a direct child. A `FieldMessage` with nothing to say renders nothing and is not named.

`FieldControl` also used to overwrite a consumer's own `aria-describedby`. It now merges: yours first, the field's parts appended.

`FieldMessage` had no role, so an error that appears on blur, on submit or after an async check was announced to nobody. An `error` or `warning` is now `role="alert"` and a `success` or `info` is `role="status"`. Either can be overridden with the `role` prop.

**No API change.** What a consumer may notice: a test that asserted the old fixed `aria-describedby` value, or that a `FieldMessage` had no role, will now see the corrected values.
