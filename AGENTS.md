# Repository working instructions

## Dev VM launcher — 2026-09-10

VM previews use https://dev-vm.tail787e7e.ts.net/ and the root dev-apps.json.
Use the shared commands below. These supersede legacy VM port/foreground
launch instructions; the product deployment and real-data rules remain in force.

- GeoLibre: dev-app start geolibre / dev-app stop geolibre

dev-app status <id> and dev-app logs <id> show the same state as the launcher.
Return only the verified direct HTTPS URL after a successful start. Keep apps
running after ordinary task completion unless the user requested a stop.
New browser apps must add a recipe here; discovery assigns/retains their port.
A healthy preview does not certify missing external integrations or business data.
Read the notes on each recipe. Never import production credentials or trusted
document drives into this VM to fill a development dependency.
