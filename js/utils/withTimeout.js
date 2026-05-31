/**
 * Promise.race with timeout. Rejects with Error('timeout: <label>') after ms.
 * Pure helper — does not abort the original promise, just stops waiting.
 */
export function withTimeout(promise, ms, label = 'operation') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout: ${label} (${ms}ms)`)), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}
