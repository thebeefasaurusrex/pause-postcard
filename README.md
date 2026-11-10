# PausePostcard

Frame an in-game screenshot with a build label, a location supplied by the game, and a report code. Players can preview and save it. The browser version offers file sharing where the browser supports it.

## Try it

Clone this repository. For the web demo, serve its root with Python 3.

    python -m http.server 8000 --bind 127.0.0.1

Open **http://127.0.0.1:8000/demo/**, click **Make a PausePostcard**, and click **Save**. On Windows, use py instead of python if your installation exposes the Python launcher. Use HTTPS or localhost for browser features such as sharing and random report codes.

For Godot, open project.godot in Godot 4 and run the demo in a window. Use the same button to capture and save a PNG under your system Pictures/PausePostcard/DEMO directory.

## Add it to a game

- **Browser:** Serve web/ and addons/pause_postcard/fonts/ with their relative paths intact. Import frameSnap and reportCode from web/frame.mjs and offerSnap from web/browser.mjs. Pass the game's canvas, metadata, display name, and whether to scale pixel art with nearest neighbor. See demo/index.html for a working example.
- **Godot:** Copy addons/pause_postcard/ into your project. Add postcard.gd as the PausePostcard autoload. Call configure(game_id, report_prefix, display_name, build), set_where(location), and capture(). Use 1–12 uppercase letters or digits for the report prefix. The desktop capture requires a renderer.
- **Godot Web:** Serve web/ beside the export and include web/godot-web.mjs as a module in the export HTML. Keep the bridge and game on the same origin. The optional pause-postcard-feedback meta element supplies a feedback URL.
- **Feedback:** The default UI has no feedback destination. Set the browser offerSnap base option or the Godot desktop feedback_url to opt in. Browser same-origin feedback can retrieve a user-selected attachment with getSnap and remove it with forgetSnap. It lives in that origin's IndexedDB and expires after one hour. For cross-origin feedback the player saves and attaches the file manually. Godot desktop accepts an HTTPS feedback URL.

The PNG contains the visible game pixels and an allowlisted record of the game ID, build, location, platform, resolution, time, and report code. Use a short in-game location label. Do not pass account or chat data as display text. The code does not upload screenshots.

## Verify

Run node --test test/*.test.mjs with Node.js 22 or later. The demo also exercises rendering and saving a real PNG. The bundled Anybody, Instrument Sans, and Martian Mono fonts have separate SIL Open Font License files beside the fonts.

## License

Original project code is licensed under [Apache 2.0](LICENSE). See [NOTICE](NOTICE) for attribution.
