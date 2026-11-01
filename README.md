# MeshMind

Wire AI models into flows that run entirely in your browser: text, images and voice.

**Try it:** [delriodevelops.github.io/meshmind](https://delriodevelops.github.io/meshmind/)

Build a flow on a canvas and MeshMind runs every model on your own GPU. No server, no API key, nothing leaves your machine. Assistants work in parallel, lists get handled item by item, conditions route the answer, photos get described and reimagined, voice notes get transcribed and answered out loud. Every step lights up as it runs.

## Nodes

| Node | Takes | Gives | What it does |
|---|---|---|---|
| **Message** | – | text, image, audio | Your chat message, the photo you attach and your voice note |
| **Assistant** | text or list | text or list | Answers with its own instructions. Several inputs are merged; a list is answered item by item |
| **Split** | text | list | One item per line, up to a limit |
| **Join** | anything | text | Merges every input and list item into one text |
| **Condition** | text | text (yes / no) | Sends the text one way or the other depending on whether it contains a word |
| **See image** | image | text | Describes or reads a picture |
| **Create image** | text | image | Paints an image from a prompt |
| **Transcribe** | audio | text | Speech to text |
| **Speak** | text | audio | Text to a natural voice, five voices |
| **Create video** | text | video | Optional and **online**: runs on [fal.ai](https://fal.ai) with your own key |
| **Answer** | anything | – | What reaches it is shown in the chat |

Connections are coloured by what they carry (text, list, image, audio, video) and the canvas refuses connections that don't fit or would create a loop.

Seven templates to start from: *Single assistant*, *Panel of experts*, *Draft & review*, *Brainstorm & rank*, *Illustrate & narrate*, *Photo remix* and *Voice assistant*.

## Models

Everything downloads the first time it's needed and stays cached in the browser.

| For | Model | Runs on | Size |
|---|---|---|---|
| Assistants | Any [WebLLM](https://github.com/mlc-ai/web-llm) chat model you pick (Qwen 2.5 1.5B recommended) | WebGPU | 0.4–5 GB |
| See / create image | [Janus-Pro 1B](https://huggingface.co/onnx-community/Janus-Pro-1B-ONNX) via Transformers.js | WebGPU | ~2.4 GB |
| Transcribe | [Whisper base](https://huggingface.co/onnx-community/whisper-base) via Transformers.js | WebGPU | ~0.3 GB |
| Speak | [Kokoro 82M](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) via kokoro-js | WASM | ~0.1 GB |

## Run it

You need Node.js 20 or later and a browser with WebGPU (Chrome or Edge on desktop).

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), choose a model (start with a recommended one) and send a message, or pick a template from the welcome screen.

## Stack

Vite, React 19, TypeScript, [React Flow](https://reactflow.dev) for the canvas, WebLLM and Transformers.js in their own Web Workers, Zustand (flow and settings, saved in the browser), Dexie (chat history in IndexedDB), Radix UI, Tailwind CSS 4, react-markdown with Shiki.

Models, the canvas and syntax highlighting load on demand, so the first load is about 250 KB.
