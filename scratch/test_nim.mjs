// scratch/test_nim.mjs  — run with: node scratch/test_nim.mjs
const key = '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';

console.log('Testing NVIDIA NIM API…');
console.log('Key prefix:', key.slice(0, 10));

try {
  const start = Date.now();
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:      'meta/llama-3.1-8b-instruct',
      messages:   [{ role: 'user', content: 'Reply with just the single word: OK' }],
      max_tokens: 10,
      stream:     false,
    }),
  });

  const elapsed = Date.now() - start;
  const text    = await r.text();
  console.log(`\nSTATUS : ${r.status} (${elapsed}ms)`);
  console.log('BODY   :', text.slice(0, 600));
} catch (e) {
  console.error('\nNETWORK ERROR:', e.message);
}
