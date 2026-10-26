// The share card's JPEG, encoded off the main thread (share-card.js toJpeg).
self.onmessage = async ({ data: { id, bitmap, quality } }) => {
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close();
    self.postMessage({ id, blob: await canvas.convertToBlob({ type: 'image/jpeg', quality }) });
  } catch (e) { self.postMessage({ id, error: e?.name || 'Error' }); }
};
