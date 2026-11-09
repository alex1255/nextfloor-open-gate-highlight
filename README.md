# NextFloor Open Gate Highlight

I wanted to see at a glance whether the driveway gate was still open, just like an open window in NextFloor. This plugin draws a yellow outline across the opening while a linked sliding gate is open.

## Install

1. Copy `nextfloor-gate-open-highlight.mjs` into `/config/www/nextfloor/` on Home Assistant.
2. In NextFloor, open **Extensions → Plugins** and add `/local/nextfloor/nextfloor-gate-open-highlight.mjs`.
3. In the NextFloor editor, add or edit a native sliding gate on an outdoor fence. Link your Home Assistant gate contact, cover entity, or both. Reload any dashboard or kiosk tab that was already open.

The contact takes priority. If the contact is unavailable, the outline follows the cover and stays visible while it is opening or closing. The plugin picks up linked native sliding gates automatically and does not send gate commands.

The 3D overlay uses internal NextFloor viewer objects because the public plugin API has no gate styling hook. The local version was checked with NextFloor 0.26.5. A viewer change in a later release may require an update to the plugin.
