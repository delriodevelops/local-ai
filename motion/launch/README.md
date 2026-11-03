# MeshMind launch film (v7)

The launch film made with the app-motion skill: one web page whose every frame is a function of time, rendered frame by frame in Chrome with real motion blur. The app is rebuilt in HTML with its real sizes, copy and dark theme inside a browser window that turns in 3D, and the camera travels through it. The voice-over leads: every shot starts on a word (`timing.js` reads the word timings in `assets/audio/vo.json`), so a new recording retimes the whole film by itself.

The shots, set to the voice-over:

1. **Every prompt you type.** A close-up of someone else's chat box, out of focus around it.
2. **Goes to someone else's server.** The message becomes a red dot; a whip pan follows it into a server rack, whose log writes the question down.
3. **Not anymore.** The music drops; NOT fills the frame and the full stop of ANYMORE floods it red.
4. **This is MeshMind.** MESH and MIND arrive from depth with the landing's disc, and the camera pushes through the M.
5. **Wire AI models into flows.** A low flight over the canvas, chasing the signal along the wires.
6. **Right in your browser.** The camera pulls out to the whole app in its window.
7. **They think, see, listen, speak.** One cut per "They", one node per sense.
8. **All on your own graphics card.** The Resources monitor, every GPU tag in red.
9. **No server. No account. No API key.**
10. **Your machine is the server.** The window in three-quarter view, the signal running through it.
11. **MeshMind. Free, in your browser.** The full stop of "server." becomes the red of the end card, with the app icon.

## Record the voice

The voice-over comes from ElevenLabs with word timings. With `ELEVENLABS_API_KEY` in `motion/.env.elevenlabs`:

```bash
cd motion
python tools/eleven.py voices
python tools/eleven.py tts VOICE_ID script/vo.txt launch/assets/audio/vo.mp3   # also writes vo.json
cd launch && node prep-audio.mjs
```

`prep-audio.mjs` levels the voice (`assets/sfx/vo.wav`) and builds the music bed (`assets/audio/bed.wav`): `motion/public/audio/music.mp3` with two bars played twice so it lasts the voice-over, started where its drop lands on "Not", and ducked about 11 dB under the voice.

## Render it

The scripts live in the app-motion skill (`K` below is its folder). Playwright drives the installed Chrome.

```bash
cd motion/launch
npm install
node $K/scripts/serve.mjs .                          # live preview
node $K/scripts/qa.mjs .                             # words colliding or leaving the frame
node $K/scripts/render.mjs . --blur 16 --workers 6   # the master, about 10 minutes
node $K/scripts/sound.mjs .                          # effects from the film's cues, the voice and the bed, at -14 LUFS
node $K/scripts/finish.mjs .                         # out/MeshMind_launch.mp4
node $K/scripts/check.mjs out/MeshMind_launch.mp4    # every gate must pass
```

The master takes 16 sub-frames per frame: with 8, the whip to the server, the push through the M and the red flood show separate copies of their edges. Six Chrome tabs render it steadily; one render with eight stalled before its first frame. A draft without blur (`--blur 1`) takes under a minute.

`engine/` is the skill's engine, copied into the folder so the film renders the same everywhere. `icons.js` holds the app's own lucide icons.
