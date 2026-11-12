import { Composition } from 'remotion';
import { Promo } from './Promo';
import tl from './timeline.json';

export const Root = () => (
  <>
    <Composition id="Promo16x9" component={Promo} width={1920} height={1080} fps={tl.fps} durationInFrames={tl.frames} defaultProps={{ format: 'h' as const }} />
    <Composition id="Promo9x16" component={Promo} width={1080} height={1920} fps={tl.fps} durationInFrames={tl.frames} defaultProps={{ format: 'v' as const }} />
  </>
);
