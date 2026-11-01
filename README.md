# MeshMind

Wire AI assistants into flows that run entirely in your browser.

**Try it:** [delriodevelops.github.io/meshmind](https://delriodevelops.github.io/meshmind/)

Pick a language model and MeshMind downloads it once and runs it on your own GPU with [WebLLM](https://github.com/mlc-ai/web-llm). No server, no API key, nothing leaves your machine. Then build a flow on a canvas: assistants that work in parallel, lists that get handled item by item, conditions that route the answer, and watch every step run.

## Nodes

| Node | Takes | Gives | What it does |
|---|---|---|---|
| **Message** | – | text | Where your chat message enters |
| **Assistant** | text or list | text or list | Answers with its own instructions. Several inputs are merged; a list is answered item by item |
| **Split** | text | list | One item per line, up to a limit |
| **Join** | anything | text | Merges every input and list item into one text |
| **Condition** | text | text (yes / no) | Sends the text one way or the other depending on whether it contains a word |
| **Answer** | anything | – | What reaches it is shown in the chat |

Connections are coloured by type (lime = text, blue = list) and the canvas refuses connections that don't fit or would create a loop.

Four templates to start from: *Single assistant*, *Panel of experts*, *Draft & review* and *Brainstorm & rank*.

## Run it

You need Node.js 20 or later and a browser with WebGPU (Chrome or Edge on desktop).

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), choose a model (start with a recommended one) and send a message. Very small models answer quickly but loosely; 1–3B models give much better flows.

## Stack

Vite, React 19, TypeScript, [React Flow](https://reactflow.dev) for the canvas, WebLLM in a Web Worker, Zustand (flow and settings, saved in the browser), Dexie (chat history in IndexedDB), Radix UI, Tailwind CSS 4, react-markdown with Shiki.

WebLLM, the canvas and syntax highlighting are loaded on demand, so the first load is about 250 KB.
