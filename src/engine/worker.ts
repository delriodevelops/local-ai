import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

// El modelo corre aquí, fuera del hilo principal, para que la interfaz no se congele
const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (message: MessageEvent) => handler.onmessage(message)
