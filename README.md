# MeshMind

Chain AI assistants that run entirely in your browser, and watch the reasoning step by step.

Pick a language model and MeshMind downloads it once and runs it on your own GPU with [WebLLM](https://github.com/mlc-ai/web-llm). No server, no API key, nothing leaves your machine. Then line up specialised assistants, such as Product Research → UX Designer → Developer, so each one works on the previous one's answer, and follow the whole chain as a diagram.

## Features

- **Local models**: dozens of open models (Llama, Qwen, Phi, Gemma, SmolLM…), filtered to the ones your CPU, RAM and GPU can run. Cached after the first download.
- **Custom assistants**: name, icon, colour and instructions. Five examples included; yours are saved in the browser.
- **Chains**: each assistant in the chain receives the previous one's answer.
- **Chain diagram**: *Chain* shows You → step 1 → step 2 → … → Result, with each step's status (working, waiting, done) and the start of its answer. Click a step to jump to its answer, drag to reorder.
- **Conversation history**, search, adjustable length and creativity, read aloud and copy.

## Run it

You need Node.js 18 or later and a browser with WebGPU (Chrome or Edge on desktop).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), choose a model at the top (start with a small one, such as Llama 3.2 1B or Qwen 2.5 1.5B), add assistants from the sidebar and send a message.

Very small models (under 1B) answer quickly but loosely; 1–3B models give much better chains.

## Stack

Next.js 14, React 18, WebLLM, Zustand, Framer Motion, Tailwind CSS.
