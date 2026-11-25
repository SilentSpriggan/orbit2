import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePhoto, normalize, sniff, toGeminiSchema, SCHEMA, PhotoAnalysisError, DEMO } from '../scripts/photo-analysis.mjs';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString('base64');

test('SCOPE photo check identifies image types from their bytes', () => {
  assert.equal(sniff(Buffer.from(PNG, 'base64')), 'image/png');
  assert.equal(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(sniff(Buffer.from('<svg></svg>')), null);
});

test('Gemini schema uses uppercase types and no additionalProperties', () => {
  const s = JSON.stringify(toGeminiSchema({ ...SCHEMA, additionalProperties: false }));
  assert.ok(s.includes('"type":"OBJECT"') && s.includes('"type":"ARRAY"'));
  assert.ok(!s.includes('additionalProperties'));
});

test('model output is validated and clipped', () => {
  const a = normalize({ imageQuality: 'unclear', possibilities: [{ name: 'X' }], urgency: 'whenever', suggestedSpecialty: 'Dr Who', observations: 'o'.repeat(2000) });
  assert.equal(a.possibilities.length, 0, 'no possibilities when the photo is unclear');
  assert.equal(a.urgency, 'see_doctor_soon', 'unknown urgency falls back to the cautious level');
  assert.equal(a.suggestedSpecialty, 'Primary Care');
  assert.equal(a.observations.length, 800);
});

test('without a key the photo check returns a labeled demo result', async () => {
  const r = await analyzePhoto({ image: PNG }, { config: null });
  assert.equal(r.provider, 'demo');
  assert.equal(r.analysis, DEMO);
  assert.match(r.analysis.observations, /^DEMO RESPONSE/);
});

test('non-image uploads are rejected before anything is sent', async () => {
  await assert.rejects(analyzePhoto({ image: Buffer.from('hello').toString('base64') }, { config: null }), PhotoAnalysisError);
});

test('Gemini is called with the key header and the photo, and its answer is normalized', async () => {
  let call;
  const fetchImpl = async (url, init) => {
    call = { url, init };
    const out = { imageQuality: 'good', observations: 'A small red patch.', possibilities: [{ name: 'Contact dermatitis', likelihood: 'more likely', reasoning: 'Sharp edge.', historyLink: '' }], warningSigns: [], urgency: 'routine', urgencyReason: 'Small and stable.', suggestedSpecialty: 'Dermatology', selfCare: [], followUpQuestions: [] };
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(out) }] } }] }), { status: 200 });
  };
  const r = await analyzePhoto({ image: PNG, note: 'Itchy since Monday' }, { config: { apiKey: 'test-key', model: 'gemini-3.8-flash' }, fetchImpl });
  assert.match(call.url, /models\/gemini-3\.8-flash:generateContent$/);
  assert.equal(call.init.headers['x-goog-api-key'], 'test-key');
  const body = JSON.parse(call.init.body);
  assert.equal(body.contents[0].parts[0].inlineData.mimeType, 'image/png');
  assert.match(body.contents[0].parts[1].text, /Itchy since Monday/);
  assert.equal(r.provider, 'gemini');
  assert.equal(r.analysis.possibilities[0].name, 'Contact dermatitis');
  assert.match(r.message, /contact dermatitis/);
});

test('a Gemini safety block becomes a safe, final message', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), { status: 200 });
  await assert.rejects(analyzePhoto({ image: PNG }, { config: { apiKey: 'k', model: 'm' }, fetchImpl }), /can't analyze this photo/);
});

test('an overloaded model is retried and then falls back to the stable alias', async () => {
  const seen = [];
  const out = { imageQuality: 'good', observations: 'x', possibilities: [], warningSigns: [], urgency: 'routine', urgencyReason: '', suggestedSpecialty: 'Dermatology', selfCare: [], followUpQuestions: [] };
  const fetchImpl = async (url) => {
    seen.push(url.match(/models\/([^:]+)/)[1]);
    if (seen.length < 3) return new Response('{"error":{"code":503}}', { status: 503 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }), { status: 200 });
  };
  const r = await analyzePhoto({ image: PNG }, { config: { apiKey: 'k', model: 'gemini-3.8-flash' }, fetchImpl });
  assert.deepEqual(seen, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-flash-latest']);
  assert.equal(r.model, 'gemini-flash-latest');
});
