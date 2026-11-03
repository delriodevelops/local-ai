import { Composition } from 'remotion'
import { FPS, H, W } from './brand'
import { Film } from './Film'
import { TOTAL } from './timing'

export function RemotionRoot() {
  return <Composition id="MeshMind" component={Film} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
}
