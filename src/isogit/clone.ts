import * as ig from 'isomorphic-git';
import deps from './deps';

export default async function clone(dir: string, url: string): Promise<void> {
  await ig.clone({ ...deps, dir, url });
}