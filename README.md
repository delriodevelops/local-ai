# MeshMind

Wire AI models into flows that run entirely in your browser: text, images and voice.

**Try it:** [delriodevelops.github.io/meshmind](https://delriodevelops.github.io/meshmind/) · the app itself lives at [/meshmind/app/](https://delriodevelops.github.io/meshmind/app/)

Build a flow on a canvas and MeshMind runs every model on your own GPU. No server, no API key; only the nodes marked online (Create video, MCP tool, Agent tools) send data, and only to the services you choose. Assistants work in parallel, lists get handled item by item, conditions route the answer, photos get described and reimagined, voice notes get transcribed and answered out loud. Every step lights up as it runs.

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
| **Speak** | text | audio | Text to a natural voice in English, Spanish, Portuguese, French or Korean |
| **Create video** | text | video | Optional and **online**: runs on [fal.ai](https://fal.ai) with your own key. Pick a current model (MiniMax H3, FLUX 3, Kling 3…) by its price per clip, or type any fal model |
| **MCP tool** | text or list | text or list, image | **Online**: calls one tool of an MCP server. Arguments are typed in the node; `{input}` is what reaches it. A list makes one call per item (only the first image goes out) |
| **Agent** | text | text | **Online tools, local model**: an assistant that decides which MCP tools to call (up to 5 tools and 4 calls) |
| **Answer** | anything | – | What reaches it is shown in the chat |

Connections are coloured by what they carry (text, list, image, audio, video) and the canvas refuses connections that don't fit or would create a loop.

Nine templates to start from: *Single assistant*, *Panel of experts*, *Draft & review*, *Brainstorm & rank*, *Illustrate & narrate*, *Photo remix*, *Voice assistant*, and two that use MCP: *Ask a GitHub repo* and *Docs agent*.

## MCP tools

Settings → **MCP servers** connects [MCP](https://modelcontextprotocol.io) servers on the web: paste the address (and a token if it needs one) or add DeepWiki, Context7, Microsoft Learn or Hugging Face with one click. Their tools then appear in the **MCP tool** and **Agent** nodes. The models keep running on your machine; only a tool call's arguments go to that server.

- The server has to accept connections from websites (CORS). Many public servers do; the ones that don't can be relayed through a local bridge.
- Servers that run on your computer (stdio) need a bridge too: see [docs/mcp-local-bridge.md](docs/mcp-local-bridge.md).
- Tokens are sent as `Authorization: Bearer` and stay in this browser. Servers that only offer a sign-in page (OAuth) are not supported yet.
- The agent writes tool calls in Qwen's `<tool_call>` format, constrained by each tool's JSON schema, so the arguments always parse. Small models tend to answer without tools; Qwen 2.5 3B or larger decides better.

## Models

Everything downloads the first time it's needed and stays cached in the browser. Settings → **Local models** chooses the model for Transcribe, See image and Create image; Auto takes the newest, smartest one that fits your device.

| For | Model | Runs on | Size |
|---|---|---|---|
| Assistants | Any [WebLLM](https://github.com/mlc-ai/web-llm) chat model you pick; the newest, smartest ones that fit your device come first | WebGPU | 0.4–5 GB |
| See image | [LFM3-VL 2B](https://huggingface.co/onnx-community/LFM3-VL-2B-ONNX), or [LFM2.5-VL 450M](https://huggingface.co/onnx-community/LFM2.5-VL-450M-ONNX) on smaller devices, via Transformers.js | WebGPU | 0.5–1.9 GB |
| Create image | [FLUX.2 klein 4B](https://huggingface.co/cgb/flux2-klein-4b-onnx-webgpu) via ONNX Runtime Web (512×512 in 4 steps, about 45 s on a recent graphics card once downloaded), or [Janus-Pro 1B](https://huggingface.co/onnx-community/Janus-Pro-1B-ONNX) via Transformers.js on smaller devices | WebGPU | 2.4–6.5 GB |
| Transcribe | [Whisper large-v3 turbo](https://huggingface.co/onnx-community/whisper-large-v3-turbo), or [Whisper base](https://huggingface.co/onnx-community/whisper-base) without fp16, via Transformers.js | WebGPU | 0.3–1.6 GB |
| Speak, English | [Kokoro 82M](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) via kokoro-js | WebGPU (WASM fallback) | 0.1–0.3 GB |
| Speak, other languages | [Supertonic 2](https://huggingface.co/onnx-community/Supertonic-TTS-2-ONNX) via Transformers.js | WASM | ~0.26 GB |

## Run it

You need Node.js 20 or later and a browser with WebGPU (Chrome or Edge on desktop).

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) for the landing page or [http://localhost:5173/app/](http://localhost:5173/app/) for the app, choose a model (the first one is the best for your device) and send a message, or pick a template from the welcome screen.

## Stack

Vite, React 19, TypeScript, [React Flow](https://reactflow.dev) for the canvas, WebLLM and Transformers.js in their own Web Workers, the official [MCP TypeScript client](https://github.com/modelcontextprotocol/typescript-sdk), Zustand (flow and settings, saved in the browser), Dexie (chat history in IndexedDB), Radix UI, Tailwind CSS 4, react-markdown with Shiki.

Models, the canvas and syntax highlighting load on demand, so the first load is about 250 KB.
