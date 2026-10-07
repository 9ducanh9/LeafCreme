import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';
import exec from 'k6/execution';

if (__ENV.RUN_K6_RELIABILITY !== '1') throw new Error('Disposable local workload only');
const rate = Number(__ENV.LOAD_RATE || 200);
const seconds = Number(__ENV.LOAD_SECONDS || 30);
if (!Number.isInteger(rate) || rate < 1 || rate > 200 || !Number.isInteger(seconds) || seconds < 10 || seconds > 120) {
  throw new Error('Invalid bounded workload');
}
const base = 'http://leafcreme-image-api-test:8000';
const completed = new Counter('completed_reads');
const busy = new Counter('controlled_busy');
const contract = new Rate('response_contract');
const completion = new Rate('read_completed');
const latency = new Trend('completed_read_latency', true);

// Busy responses are transport-valid but NOT completed customer requests.
http.setResponseCallback(http.expectedStatuses(200, 503));
export const options = {
  scenarios: { reads: { executor: 'constant-arrival-rate', rate, timeUnit: '1s',
    duration: `${seconds}s`, preAllocatedVUs: 512, maxVUs: 512, gracefulStop: '15s' } },
  thresholds: { dropped_iterations: ['count==0'], response_contract: ['rate==1'], read_completed: ['rate==1'] },
  summaryTrendStats: ['avg', 'min', 'max', 'p(95)', 'p(99)'],
};

export default function () {
  const catalog = exec.scenario.iterationInTest % 2 === 0;
  const response = http.get(base + (catalog ? '/products?limit=80' : '/products/1/availability'), { timeout: '10s' });
  let valid = false;
  try {
    const body = response.json();
    valid = response.status === 200 ? Array.isArray(body) && (catalog ? body.length === 80 :
      body.length === 3 && body.every(row => row.so_luong_con === 10)) :
      response.status === 503 && body.detail === 'Server busy; retry shortly.' && response.headers['Retry-After'] === '1';
  } catch (_) { /* Invalid bodies are retained as failed contract metrics. */ }
  const done = response.status === 200 && valid;
  completed.add(done ? 1 : 0);
  busy.add(response.status === 503 && valid ? 1 : 0);
  contract.add(valid);
  completion.add(done);
  if (done) latency.add(response.timings.duration);
}

export function handleSummary(data) {
  const dropped = data.metrics.dropped_iterations ? data.metrics.dropped_iterations.values.count : null;
  const valid = data.metrics.response_contract && data.metrics.response_contract.values.rate === 1;
  const allCompleted = data.metrics.read_completed && data.metrics.read_completed.values.rate === 1;
  const report = { verification_status: dropped === 0 && valid && allCompleted ? 'passed' : 'failed',
    environment: 'disposable Docker; synthetic read-only data; no external providers',
    api_image_id: __ENV.API_IMAGE_ID, harness_sha256: __ENV.HARNESS_SHA256,
    target_rate_per_second: rate, offering_seconds: seconds, dropped_iterations: dropped,
    all_responses_contract_valid: Boolean(valid), all_reads_completed: Boolean(allCompleted),
    retries: 0, raw_summary: data };
  return { [`/results/k6-arrival-${rate}rps-${seconds}s-summary.json`]: JSON.stringify(report, null, 2) };
}
