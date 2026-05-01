import fetch from 'node-fetch'; // Requires node-fetch if using older Node, or native fetch in Node 18+

/**
 * Run this script periodically via cron or a cloud scheduler.
 * Set VITE_NVIDIA_API_KEY in your environment before running.
 */

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.1-8b-instruct';

function classifyLatency(durationMs) {
  if (durationMs > 25000) return 'VERY SLOW';
  if (durationMs > 15000) return 'DEGRADED';
  if (durationMs > 8000)  return 'WARNING';
  return 'HEALTHY';
}

async function checkHealth() {
  const apiKey = process.env.VITE_NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('Missing VITE_NVIDIA_API_KEY environment variable.');
    process.exit(1);
  }

  const startTime = Date.now();
  console.log(`[HealthCheck] Pinging ${MODEL}...`);

  try {
    const response = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'Say hello in one word.' }],
        max_tokens: 5,
        stream: false,
      }),
    });

    const duration = Date.now() - startTime;
    const health = classifyLatency(duration);

    if (!response.ok) {
      const err = await response.text();
      console.error(`[HealthCheck] FAILED (${duration}ms) - Status ${response.status}: ${err}`);
      return;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    console.log(JSON.stringify({
      event: 'ai_health_check',
      timestamp: new Date().toISOString(),
      latency_ms: duration,
      health: health,
      status: 200,
      reply: reply
    }, null, 2));

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[HealthCheck] NETWORK ERROR (${duration}ms):`, error.message);
  }
}

checkHealth();
