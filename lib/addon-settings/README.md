# Addon Settings (library)

One settings menu for Deadlock Panorama addons: tabs in CompLock HUD++'s menu, or an ADDONS window in the
Esc menu without HUD++. Vendored unchanged into each addon; the highest `BUILD` among installed copies hosts.

- `addon_settings.js`: the library (one file, no dependencies).
- `VERSION`: the library version.
- `vendor.sh`: puts the library in front of your script (`print`) or into a pak folder (`pak <dir>`).

API, languages and a step-by-step guide for forked mods: [docs/ADDON-SETTINGS-API.md](../../docs/ADDON-SETTINGS-API.md).
Example client: [examples/hello-addon](../../examples/hello-addon). MIT.
