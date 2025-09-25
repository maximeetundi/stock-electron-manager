export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}

export function jsonToBase64(json) {
  const stringified = JSON.stringify(json, null, 2);
  return window.btoa(unescape(encodeURIComponent(stringified)));
}
