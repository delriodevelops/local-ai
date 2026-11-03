# MeshMind motion graphics

The 24-second promo film for MeshMind, made with [Remotion](https://www.remotion.dev). It lives apart from the app and has its own dependencies.

This is the sixth cut, and the first that is a film rather than a slideshow: one virtual camera travels through the story, shots hand over to each other physically (a whip, an iris, a blade, columns falling) and everything that moves fast carries real motion blur. The look is the landing's, taken into the dark: ink as the stage, paper for type and light, and one red, which is the signal that travels the wires.

The shots, set to the voice-over:

1. **Prompts.** A chat box in macro close-up, out of focus at first. Someone types something private; behind, other people's boxes send theirs.
2. **Server.** We follow the red dot down the aisle of a data centre to someone else's server, which writes your question in its log. The music drops out.
3. **Not anymore.** "NOT" at full height, the O made of the red disc. On the drop the disc opens and swallows the screen.
4. **Title.** The red closes into the disc of the landing's hero; MESH and MIND fly in from depth and the mesh is wired inside the disc.
5. **Canvas.** The camera skims the app's canvas: a wire is dragged and snaps, the rest wire themselves, the signal runs, and the camera pulls out to the whole app in its browser window.
6. **Senses.** A tracking shot with whip pans: think, see, listen and speak, each a large node at work, its word across the frame behind it.
7. **Chip.** The graphics card from above; every model that works is a wave of red light across its cores. Network: 0 B/s.
8. **Nos.** No server, no account, no API key: each one sliced by a red blade.
9. **Machine.** The landing's red section and its mesh of models, in three layers of depth.
10. **Sign.** "MeshMind." in the bar where the music falls silent; the red closes into its full stop.
11. **End.** Free, in your browser: the hero poster again, with the address and the way into the app.

The cuts fall where words start (`src/timing.ts`, from the word timings ElevenLabs returns) and on the music's beats.

- `src/shots` holds the film, one file per shot; `src/Film.tsx` lays them out and says how much motion blur each one gets, frame by frame.
- `src/app` holds the app's own components in its dark theme: nodes, wires, the flow and the browser window.
- `src/fx` holds the camera's finish (grain, vignette), the glowing signal and the motion blur.
- `src/lib/motion.ts` holds the easing curves, keyframe tracks, springs and camera shake.

The v5 cut is kept on the local branch `motion/v5`.

## Render it

```bash
cd motion
npm install
npm run studio   # preview and scrub the timeline
npm run render   # writes out/MeshMind-motion.mp4
```

`render` runs `tools/render.mjs`, which renders the picture and the mix separately. Then `tools/master.py` converts the picture to yuv420p in TV range (BT.709) and brings the audio to −14 LUFS with the true peak under −1 dBTP.

Each frame is drawn up to 32 times for the motion blur. With every Chrome tab at once the heaviest shots ran out of memory, so `render.mjs` renders the film in four stretches, each with as many tabs as it can take, and joins them without re-encoding. It takes about half an hour on a 12-core machine. To check framing quickly, render without the blur: `--props='{"draft":true}'`. `tools/sheet6.sh <from> <to> <every> <out.png>` makes a contact sheet of a stretch of frames in draft.

It needs Python 3 (as `python3`, `python` or `py`) and ffmpeg on the PATH. `tools/sheet.py` makes contact sheets of chosen frames for review; it also needs Pillow.

## Audio

The voice leads. It plays from `vo-mix.wav`, a levelled copy of the voice-over. The music sits about 10 LU under the voice while it speaks, swells gently in longer pauses and opens fully on the drop and at section breaks. The sound effects mark the picture's hits and stay at least 10 LU under the voice. The cue sheet is in `src/Soundtrack.tsx`; its frames come from the shots, so retiming a shot moves its sounds with it.

To check the balance, render each stem on its own and measure them:

```bash
npx remotion render MeshMind out/stem-vo.wav --codec=wav --props='{"stem":"vo"}'
npx remotion render MeshMind out/stem-music.wav --codec=wav --props='{"stem":"music"}'
npx remotion render MeshMind out/stem-fx.wav --codec=wav --props='{"stem":"fx"}'
python tools/levels.py out/stem-vo.wav out/stem-music.wav out/stem-fx.wav
```

`levels.py` reports each stem's loudness, the balance per section, the margin of every word over music and effects (full range and in a phone band), and the step at the drop.

The voice-over, music and sound effects in `public/audio/` were made with ElevenLabs and are committed, so rendering needs no key.

To make new ones:

1. Set `ELEVENLABS_API_KEY` in your environment or in `motion/.env.elevenlabs` (ignored by git).
2. Use `tools/eleven.py` (`tts`, `sfx`, `music`).
3. Run `npm run stems`. It rebuilds `vo-mix.wav`, the normalised effects (the boom is reshaped and the tick is synthesised with ffmpeg) and the outro bed.

The script is in `script/vo.txt`.

Don't keep the key in `motion/.env` or `motion/.env.local`: Remotion loads those files into the Studio page, which it serves on your network.

If you change the voice-over, `src/timing.ts` picks up the new word times from `public/audio/vo.json` by itself. Check the music bed's phrase list in `src/Soundtrack.tsx` and the word lifts in `tools/stems.py`, which still hold frame numbers and times of their own.
