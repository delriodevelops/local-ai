import type { AssistantData, FlowEdge, FlowNode } from './types'

export const COLORS = ['#c8f560', '#60a5fa', '#f472b6', '#fb923c', '#f87171', '#a78bfa', '#2dd4bf', '#facc15']

export const ASSISTANTS: AssistantData[] = [
  { label: 'Researcher', color: '#60a5fa', instructions: 'Investigate the request. List the key facts, user needs and open questions. Be concise.' },
  { label: 'Designer', color: '#f472b6', instructions: 'Turn the input into a clear product or UX proposal: screens, flows and the main decisions.' },
  { label: 'Developer', color: '#fb923c', instructions: 'Turn the input into a concrete technical plan or code. Prefer simple, working solutions.' },
  { label: 'Critic', color: '#f87171', instructions: 'Find the weaknesses, risks and missing pieces in the input. Be direct and specific.' },
  { label: 'Summarizer', color: '#c8f560', instructions: 'Combine everything you receive into one clear, well-structured answer. Keep what matters, drop repetition.' },
]

let counter = 0
export const newId = (kind: string) => `${kind}-${Date.now().toString(36)}-${(counter++).toString(36)}`

type Spec = { nodes: FlowNode[]; edges: FlowEdge[] }

const edge = (source: string, target: string, sourceHandle = 'out'): FlowEdge => ({
  id: `${source}-${sourceHandle}-${target}`,
  source,
  target,
  sourceHandle,
  targetHandle: 'in',
})

const assistant = (id: string, x: number, y: number, data: AssistantData): FlowNode =>
  ({ id, type: 'assistant', position: { x, y }, data: { ...data } })

export const TEMPLATES: { id: string; name: string; description: string; build: () => Spec }[] = [
  {
    id: 'single',
    name: 'Single assistant',
    description: 'Message → assistant → answer.',
    build: () => ({
      nodes: [
        { id: 'in', type: 'input', position: { x: 0, y: 80 }, data: { label: 'Your message' } },
        assistant('a1', 260, 40, { label: 'Assistant', color: '#c8f560', instructions: 'You are a helpful assistant. Answer clearly and briefly.' }),
        { id: 'out', type: 'output', position: { x: 620, y: 80 }, data: { label: 'Answer' } },
      ],
      edges: [edge('in', 'a1'), edge('a1', 'out')],
    }),
  },
  {
    id: 'panel',
    name: 'Panel of experts',
    description: 'Three assistants answer in parallel, a fourth merges them.',
    build: () => ({
      nodes: [
        { id: 'in', type: 'input', position: { x: 0, y: 300 }, data: { label: 'Your message' } },
        assistant('r', 260, 0, ASSISTANTS[0]),
        assistant('d', 260, 300, ASSISTANTS[1]),
        assistant('c', 260, 600, ASSISTANTS[3]),
        assistant('s', 640, 300, ASSISTANTS[4]),
        { id: 'out', type: 'output', position: { x: 1020, y: 340 }, data: { label: 'Answer' } },
      ],
      edges: [edge('in', 'r'), edge('in', 'd'), edge('in', 'c'), edge('r', 's'), edge('d', 's'), edge('c', 's'), edge('s', 'out')],
    }),
  },
  {
    id: 'review',
    name: 'Draft & review',
    description: 'A writer drafts; a reviewer approves it or sends it to be rewritten.',
    build: () => ({
      nodes: [
        { id: 'in', type: 'input', position: { x: 0, y: 160 }, data: { label: 'Your message' } },
        assistant('w', 240, 120, { label: 'Writer', color: '#60a5fa', instructions: 'Write a first draft that answers the request.' }),
        assistant('rv', 580, 120, { label: 'Reviewer', color: '#f87171', instructions: 'Review the draft. If it fully answers the request, reply with APPROVED on the first line followed by the draft unchanged. Otherwise list what to fix.' }),
        { id: 'if', type: 'condition', position: { x: 920, y: 160 }, data: { label: 'Approved?', match: 'APPROVED' } },
        assistant('rw', 1180, 300, { label: 'Rewriter', color: '#fb923c', instructions: 'Rewrite the draft applying every fix in the review. Return only the final text.' }),
        { id: 'out', type: 'output', position: { x: 1540, y: 160 }, data: { label: 'Answer' } },
      ],
      edges: [edge('in', 'w'), edge('w', 'rv'), edge('rv', 'if'), edge('if', 'out', 'yes'), edge('if', 'rw', 'no'), edge('rw', 'out')],
    }),
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm & rank',
    description: 'Generate ideas, judge each one separately, rank the best.',
    build: () => ({
      nodes: [
        { id: 'in', type: 'input', position: { x: 0, y: 120 }, data: { label: 'Your message' } },
        assistant('g', 240, 80, { label: 'Ideas', color: '#facc15', instructions: 'Give exactly 4 different ideas for the request, one per line, no extra text.' }),
        { id: 'sp', type: 'split', position: { x: 580, y: 120 }, data: { label: 'Each idea', max: 6 } },
        assistant('j', 820, 80, { label: 'Judge', color: '#f87171', instructions: 'Rate this idea from 1 to 10 for usefulness and originality, with one sentence of reasoning. Start with the idea itself.' }),
        { id: 'jn', type: 'join', position: { x: 1160, y: 120 }, data: { label: 'All ratings', separator: '\n\n' } },
        assistant('rk', 1400, 80, { label: 'Ranker', color: '#c8f560', instructions: 'Rank the rated ideas from best to worst and recommend one, briefly.' }),
        { id: 'out', type: 'output', position: { x: 1760, y: 120 }, data: { label: 'Answer' } },
      ],
      edges: [edge('in', 'g'), edge('g', 'sp'), edge('sp', 'j'), edge('j', 'jn'), edge('jn', 'rk'), edge('rk', 'out')],
    }),
  },
  {
    id: 'story',
    name: 'Illustrate & narrate',
    description: 'A tiny story from your idea, with a picture and a voice reading it.',
    build: () => ({
      nodes: [
        { id: 'in', type: 'input', position: { x: 0, y: 160 }, data: { label: 'Your idea' } },
        assistant('wr', 300, 140, { label: 'Storyteller', color: '#facc15', instructions: 'Write a very short story (3 sentences) based on the idea. Vivid and visual. No title.' }),
        assistant('pr', 680, 0, { label: 'Art director', color: '#f472b6', instructions: 'Describe the key scene of this story as one image prompt: subject, setting, light, mood. One sentence, no names.' }),
        { id: 'img', type: 'imagine', position: { x: 1060, y: 0 }, data: { label: 'Illustration', style: 'storybook illustration, soft light, rich colour' } },
        { id: 'tts', type: 'speak', position: { x: 680, y: 320 }, data: { label: 'Narrator', voice: 'bf_emma' } },
        { id: 'o1', type: 'output', position: { x: 1400, y: 20 }, data: { label: 'Picture' } },
        { id: 'o2', type: 'output', position: { x: 1060, y: 340 }, data: { label: 'Narration' } },
        { id: 'o3', type: 'output', position: { x: 1060, y: 560 }, data: { label: 'Story' } },
      ],
      edges: [edge('in', 'wr'), edge('wr', 'pr'), edge('pr', 'img'), edge('img', 'o1'), edge('wr', 'tts'), edge('tts', 'o2'), edge('wr', 'o3')],
    }),
  },
  {
    id: 'remix',
    name: 'Photo remix',
    description: 'Attach a photo: it is described, reimagined in the style you ask for and painted again.',
    build: () => ({
      nodes: [
        { id: 'in', type: 'input', position: { x: 0, y: 160 }, data: { label: 'Photo + style' } },
        { id: 'see', type: 'describe', position: { x: 320, y: 220 }, data: { label: 'What is in it', prompt: 'Describe the main subject, setting, colours and composition of this image.' } },
        assistant('dir', 680, 120, { label: 'Remixer', color: '#f472b6', instructions: 'You get a description of a photo and a requested style. Write one image prompt that keeps the subject and composition but applies the style. One sentence.' }),
        { id: 'img', type: 'imagine', position: { x: 1060, y: 140 }, data: { label: 'Remix', style: '' } },
        { id: 'o1', type: 'output', position: { x: 1400, y: 160 }, data: { label: 'New image' } },
        { id: 'o2', type: 'output', position: { x: 680, y: 440 }, data: { label: 'Description' } },
      ],
      edges: [edge('in', 'see', 'image'), edge('in', 'dir'), edge('see', 'dir'), edge('dir', 'img'), edge('img', 'o1'), edge('see', 'o2')],
    }),
  },
  {
    id: 'voice',
    name: 'Voice assistant',
    description: 'Record a voice note: it is transcribed, answered and read back to you.',
    build: () => ({
      nodes: [
        { id: 'in', type: 'input', position: { x: 0, y: 160 }, data: { label: 'Voice note' } },
        { id: 'stt', type: 'transcribe', position: { x: 320, y: 220 }, data: { label: 'What you said' } },
        assistant('a', 660, 160, { label: 'Assistant', color: '#c8f560', instructions: 'Answer in 2–3 short spoken-style sentences. No lists, no markdown.' }),
        { id: 'tts', type: 'speak', position: { x: 1020, y: 120 }, data: { label: 'Reply', voice: 'af_heart' } },
        { id: 'o1', type: 'output', position: { x: 1340, y: 140 }, data: { label: 'Spoken answer' } },
        { id: 'o2', type: 'output', position: { x: 1020, y: 380 }, data: { label: 'Text answer' } },
      ],
      edges: [edge('in', 'stt', 'audio'), edge('stt', 'a'), edge('a', 'tts'), edge('tts', 'o1'), edge('a', 'o2')],
    }),
  },
]
