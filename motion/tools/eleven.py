"""ElevenLabs for the MeshMind film: voice-over with timings, sound effects and music.

The key comes from the ELEVENLABS_API_KEY environment variable or from motion/.env.elevenlabs (ignored by git).
It is never printed. Not .env or .env.local: Remotion loads those into the Studio page, which it serves on the network.

  python tools/eleven.py account
  python tools/eleven.py voices
  python tools/eleven.py tts VOICE_ID script.txt public/audio/vo.mp3      (also writes vo.json with word timings)
  python tools/eleven.py sfx "prompt" SECONDS public/audio/sfx/name.mp3
  python tools/eleven.py music "prompt" SECONDS public/audio/music.mp3
"""
import base64
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

API = 'https://api.elevenlabs.io'
HERE = pathlib.Path(__file__).resolve().parent.parent


def key():
    value = os.environ.get('ELEVENLABS_API_KEY')
    if value:
        return value.strip()
    local = HERE / '.env.elevenlabs'
    if local.exists():
        for line in local.read_text(encoding='utf-8').splitlines():
            if line.startswith('ELEVENLABS_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"')
    sys.exit('Set ELEVENLABS_API_KEY in the environment or in motion/.env.elevenlabs')


def call(method, path, body=None, accept='application/json'):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(API + path, data=data, method=method, headers={
        'xi-api-key': key(), 'Content-Type': 'application/json', 'Accept': accept,
    })
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        # The error body never contains the key; it says what the API did not accept
        sys.exit(f'{method} {path} -> HTTP {error.code}: {error.read().decode(errors="replace")[:600]}')


def save(path, data):
    out = pathlib.Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    print(f'{out} ({len(data) // 1024} KB)')


def words(alignment):
    """Groups ElevenLabs character timings into words: [{word, start, end}] in seconds."""
    result, current, start, end = [], '', None, None
    for char, a, b in zip(alignment['characters'], alignment['character_start_times_seconds'], alignment['character_end_times_seconds']):
        if char.isspace():
            if current:
                result.append({'word': current, 'start': start, 'end': end})
            current, start = '', None
            continue
        if start is None:
            start = a
        current += char
        end = b
    if current:
        result.append({'word': current, 'start': start, 'end': end})
    return result


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else ''
    if command == 'account':
        sub = json.loads(call('GET', '/v1/user/subscription'))
        keep = ['tier', 'status', 'character_count', 'character_limit', 'next_character_count_reset_unix', 'voice_limit', 'can_use_instant_voice_cloning']
        print(json.dumps({k: sub.get(k) for k in keep}, indent=2))
    elif command == 'voices':
        voices = json.loads(call('GET', '/v2/voices?page_size=100'))['voices']
        for v in voices:
            labels = v.get('labels') or {}
            print(f"{v['voice_id']}  {v['name'][:28]:28}  {v.get('category', ''):12}  {labels.get('gender', '')} {labels.get('accent', '')} {labels.get('age', '')} {labels.get('descriptive', labels.get('description', ''))}")
    elif command == 'tts':
        voice, script, out = sys.argv[2], sys.argv[3], sys.argv[4]
        text = pathlib.Path(script).read_text(encoding='utf-8').strip()
        body = {
            'text': text,
            'model_id': os.environ.get('ELEVEN_MODEL', 'eleven_multilingual_v2'),
            'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.35, 'use_speaker_boost': True, 'speed': float(os.environ.get('ELEVEN_SPEED', '1.0'))},
        }
        result = json.loads(call('POST', f'/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128', body))
        save(out, base64.b64decode(result['audio_base64']))
        timing = words(result['alignment'])
        pathlib.Path(out).with_suffix('.json').write_text(json.dumps(timing, indent=1), encoding='utf-8')
        print(f'{len(timing)} words, {timing[-1]["end"]:.2f} s')
    elif command == 'sfx':
        prompt, seconds, out = sys.argv[2], float(sys.argv[3]), sys.argv[4]
        save(out, call('POST', '/v1/sound-generation?output_format=mp3_44100_128', {'text': prompt, 'duration_seconds': seconds, 'prompt_influence': 0.6}, accept='audio/mpeg'))
    elif command == 'music':
        prompt, seconds, out = sys.argv[2], float(sys.argv[3]), sys.argv[4]
        save(out, call('POST', '/v1/music?output_format=mp3_44100_128', {'prompt': prompt, 'music_length_ms': int(seconds * 1000), 'model_id': 'music_v1'}, accept='audio/mpeg'))
    else:
        print(__doc__)


if __name__ == '__main__':
    main()
