import assert from 'node:assert/strict';
import test from 'node:test';
import {insertSnap, readSnap, reportCode} from '../web/frame.mjs';

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1sAAAAASUVORK5CYII=', 'base64');
test('postcard round-trips Unicode and drops private fields', async () => {
  const report = reportCode('DEMO');
  const payload = {game:'démo',build:'1',reportCode:report,resolution:[1,1]};
  const blob = insertSnap(pixel, {...payload, rawKeys:['secret'], settings:{privatePath:'secret'}});
  assert.deepEqual(await readSnap(blob), payload);
  assert.equal(Buffer.from(await blob.arrayBuffer()).includes(Buffer.from('secret')), false);
});
test('rejects invalid PNGs and ignores a PNG without postcard metadata', async () => {
  assert.throws(() => insertSnap(new Uint8Array([0]), {}), /Invalid PNG/);
  assert.equal(await readSnap(new Blob([pixel])), null);
});
