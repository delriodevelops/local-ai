import { Composition } from 'remotion'
import { H, W } from './brand'
import { LENGTH, MeshMind } from './MeshMind'

export function RemotionRoot() {
  return <Composition id="MeshMind" component={MeshMind} durationInFrames={LENGTH} fps={30} width={W} height={H} />
}
