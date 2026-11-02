# MeshMind motion graphics

The 27-second promo video for MeshMind, made with [Remotion](https://www.remotion.dev). It lives apart from the app and has its own dependencies.

The edit hangs off the voice-over: every cut falls where a sentence starts (`src/timing.ts`, from the word timings ElevenLabs returns), the music ducks under each phrase and the sound effects mark the hits (`src/Soundtrack.tsx`).

## Render it

```bash
cd motion
npm install
npm run studio   # preview and scrub the timeline
npm run render   # writes out/MeshMind-motion.mp4
```

`render` renders the picture and the mix separately, then `tools/master.py` converts the picture to yuv420p in TV range (BT.709) and brings the audio to −14 LUFS with the true peak under −1 dBTP. It needs Python 3 (as `python3`, `python` or `py`) and ffmpeg on the PATH. `tools/sheet.py` makes contact sheets of chosen frames for review; it also needs Pillow.

## Audio

The voice-over, music and sound effects in `public/audio/` were made with ElevenLabs and are committed, so rendering needs no key. To make new ones, set `ELEVENLABS_API_KEY` in your environment or in `motion/.env.elevenlabs` (ignored by git) and use `tools/eleven.py` (`tts`, `sfx`, `music`); `npm run stems` then rebuilds the normalised effects and the outro bed. The script is in `script/vo.txt`.

Don't keep the key in `motion/.env` or `motion/.env.local`: Remotion loads those files into the Studio page, which it serves on your network.

If you change the voice-over, update the cut times in `src/timing.ts` from the new `public/audio/vo.json`.
