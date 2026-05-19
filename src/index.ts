import { interceptListStorage } from './intercept.ts';

interceptListStorage(raw => {
  console.log('[psnpp-gist] lists changed:', raw);
});
