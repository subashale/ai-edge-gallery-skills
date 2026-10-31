import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { launch } from './browser.mjs';

const html = await readFile(new URL('../skills/voice-mystery/scripts/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
// A fresh runner on every call deliberately rules out reliance on WebView lifetime.
function raw(data) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(script, context);
  return JSON.parse(context.window.ai_edge_gallery_get_result(typeof data === 'string' ? data : JSON.stringify(data)));
}
function call(data) {
  const result = raw(data);
  assert.deepEqual(Object.keys(result), ['result']);
  return JSON.parse(result.result);
}
function game() {
  let last = call({ action: 'start', caseId: 'midnight-watch-v1' });
  return (action, fields = {}) => (last = call({ action, state: last.state, ...fields }));
}
function collect(step) {
  for (const target of ['case', 'coat', 'receipt']) step('inspect', { target });
  for (const target of ['ada', 'ben']) step('talk', { target });
}

test('start exposes no solution and all four rooms can be explored', () => {
  const step = game();
  for (const target of ['study', 'kitchen', 'dining room', 'hall']) {
    const result = step('look', { target });
    assert.equal(result.notebook.length, 0);
    assert.doesNotMatch(result.narration, /Ada stole|hollow|admits/);
  }
});
test('notebook survives fresh runners and repeated clues are deduplicated', () => {
  const step = game();
  step('inspect', { target: 'case' });
  step('inspect', { target: 'case' });
  const result = step('notebook');
  assert.deepEqual(result.state.found, ['case']);
  assert.equal(result.notebook.length, 1);
  assert.match(result.notebook[0].evidence, /blue wool/);
});
test('confession and recovery require discovered evidence; full investigation solves', () => {
  const step = game();
  assert.deepEqual(step('talk', { target: 'ada', topic: 'challenge' }).state.found, []);
  assert.deepEqual(step('inspect', { target: 'umbrella' }).state.found, []);
  collect(step);
  assert.ok(step('talk', { target: 'ada', topic: 'challenge' }).state.found.includes('challenge'));
  assert.ok(step('inspect', { target: 'umbrella' }).state.found.includes('watch'));
  const solved = step('accuse', { target: 'ada', reason: 'The torn cuff matches and her alibi is false.' });
  assert.equal(solved.state.ended, true);
  assert.match(solved.narration, /Case solved/);
  assert.match(solved.narration, /not automatically graded/);
  assert.ok(raw({ action: 'hint', state: solved.state }).error);
  assert.equal(step('notebook').notebook.length, 7);
});
test('wrong accusations and unsupported guesses keep case open without spoilers', () => {
  const step = game();
  for (const target of ['ben', 'clara', 'ada']) {
    const result = step('accuse', { target, reason: 'A guess' });
    assert.equal(result.state.ended, false);
    assert.doesNotMatch(result.narration, /Ada stole|hollow umbrella|wanted the watch/);
  }
});
test('hints progress only when requested; reveal and restart are explicit', () => {
  const step = game();
  assert.equal(step('notebook').state.hints, 0);
  assert.match(step('hint').narration, /study display/);
  assert.match(step('hint').narration, /kitchen alibi/);
  assert.match(step('hint').narration, /point to Ada/);
  assert.equal(step('hint').state.hints, 3);
  assert.deepEqual(step('notebook').state.found, []);
  assert.equal(step('reveal').state.ended, true);
  assert.deepEqual(step('start', { caseId: 'midnight-watch-v1' }).state, { caseId: 'midnight-watch-v1', found: [], hints: 0, ended: false });
});
test('invalid inputs and lost or fabricated notebook return bridge errors', () => {
  const state = call({ action: 'start', caseId: 'midnight-watch-v1' }).state;
  for (const data of ['{', null, [], { action: 'invent' }, { action: 'notebook' },
    { action: 'look', state, target: '__proto__' },
    { action: 'talk', state, target: 'ada', topic: 'secret' },
    { action: 'accuse', state, target: 'ada' },
    { action: 'notebook', state: { ...state, found: ['watch'] } },
    { action: 'notebook', state: { ...state, found: ['case', 'case'] } },
    { action: 'notebook', state: { ...state, hints: 4 } }]) {
    assert.deepEqual(Object.keys(raw(data)), ['error']);
  }
});
test('Gallery bridge works in a real browser without network or storage', async t => {
  const browser = await launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route('https://mystery.test/**', route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('https://mystery.test/');
  let requests = 0;
  page.on('request', () => requests++);
  const result = JSON.parse(await page.evaluate(() => {
    for (const key of ['localStorage', 'sessionStorage', 'indexedDB']) {
      Object.defineProperty(window, key, { get() { throw new Error('Storage forbidden'); } });
    }
    window.fetch = () => { throw new Error('Network forbidden'); };
    return window.ai_edge_gallery_get_result('{"action":"start","caseId":"midnight-watch-v1"}');
  }));
  assert.match(JSON.parse(result.result).narration, /Missing Midnight Watch/);
  assert.equal(requests, 0);
});

test('catalogue and unspecified start list five spoiler-free cases without starting', () => {
  const list = call({ action: 'cases' });
  assert.equal(list.cases.length, 5);
  assert.deepEqual(list.cases.map(c => c.number), [1, 2, 3, 4, 5]);
  assert.equal(new Set(list.cases.map(c => c.caseId)).size, 5);
  assert.equal(list.state, undefined);
  assert.equal(list.notebook, undefined);
  assert.deepEqual(call({ action: 'start' }), list);
  assert.doesNotMatch(JSON.stringify(list), /culprit|solution|Ada stole|Milo stole|Sana drew|Theo deliberately|Ruth swapped/);
  const state = call({ action: 'start', caseId: 'midnight-watch-v1' }).state;
  const withClue = call({ action: 'inspect', target: 'case', state }).state;
  assert.deepEqual(call({ action: 'cases', state: withClue }).state, withClue);
  assert.ok(raw({ action: 'start', caseId: 'missing' }).error);
});

test('random selection can reach every case and excludes supplied current case', () => {
  const ids = call({ action: 'cases' }).cases.map(c => c.caseId);
  function pick(value, state) {
    const context = vm.createContext({ window: {}, randomValue: value });
    vm.runInContext('Math.random = () => randomValue;', context);
    vm.runInContext(script, context);
    return JSON.parse(JSON.parse(context.window.ai_edge_gallery_get_result(JSON.stringify({ action: 'start', caseId: 'random', ...(state ? { state } : {}) }))).result);
  }
  for (let i = 0; i < ids.length; i++) assert.equal(pick((i + 0.5) / 5).state.caseId, ids[i]);
  for (const caseId of ids) {
    const state = call({ action: 'start', caseId }).state;
    for (let i = 0; i < 4; i++) {
      const next = pick((i + 0.5) / 4, state);
      assert.notEqual(next.state.caseId, caseId);
      assert.deepEqual(next.state.found, []);
    }
  }
});

const investigations = [
  { id: 'vanishing-recipe-v1', culprit: 'milo', objects: ['board', 'apron', 'log', 'wrapper'], hiding: 'tin', recovered: 'recipe' },
  { id: 'observatory-signal-v1', culprit: 'sana', objects: ['chart', 'pencil', 'access', 'weather'], hiding: 'tube', recovered: 'draft' },
  { id: 'silent-premiere-v1', culprit: 'theo', objects: ['console', 'glove', 'recording', 'cable'], hiding: 'promptbook', recovered: 'plan' },
  { id: 'switched-envelope-v1', culprit: 'ruth', objects: ['envelope', 'tape', 'booking', 'lock'], hiding: 'route card', recovered: 'document' }
];
for (const c of investigations) {
  test(`${c.id}: investigation, gating, notebook, hints, recovery and accusation`, () => {
    let last = call({ action: 'start', caseId: c.id });
    const step = (action, fields = {}) => (last = call({ action, state: last.state, ...fields }));
    assert.equal(last.locations.length, 4);
    assert.equal(last.suspects.length, 3);
    assert.deepEqual(last.notebook, []);
    const suspects = last.suspects;
    const locations = last.locations;
    assert.equal(step('talk', { target: c.culprit, topic: 'challenge' }).state.found.length, 0);
    assert.equal(step('inspect', { target: c.hiding }).state.found.length, 0);
    assert.equal(step('accuse', { target: c.culprit, reason: 'Guess' }).state.ended, false);
    for (const room of locations) assert.match(step('look', { target: room }).narration, /inspect:/);
    for (const object of c.objects) step('inspect', { target: object });
    for (const target of suspects) step('talk', { target });
    const notebook = step('notebook');
    assert.equal(notebook.notebook.length, 7);
    assert.ok(notebook.notebook.every(c => typeof c.evidence === 'string' && c.evidence.length > 0));
    for (const target of suspects.filter(s => s !== c.culprit)) {
      assert.equal(step('accuse', { target, reason: 'Guess' }).state.ended, false);
      assert.ok(!step('talk', { target, topic: 'challenge' }).state.found.includes('challenge'));
    }
    step('hint'); step('hint');
    assert.ok(step('hint').narration.toLowerCase().includes(c.culprit));
    assert.ok(step('talk', { target: c.culprit, topic: 'challenge' }).state.found.includes('challenge'));
    assert.ok(step('inspect', { target: c.hiding }).state.found.includes(c.recovered));
    const solved = step('accuse', { target: c.culprit, reason: 'The physical trace and time record contradict the alibi.' });
    assert.equal(solved.state.ended, true);
    assert.match(solved.narration, /Case solved/);
    assert.equal(step('notebook').notebook.length, 9);
  });
}

test('switching isolates clues; foreign objects, suspects and state are rejected', () => {
  let last = call({ action: 'start', caseId: 'midnight-watch-v1' });
  last = call({ action: 'inspect', target: 'case', state: last.state });
  const next = call({ action: 'start', caseId: 'vanishing-recipe-v1', state: last.state });
  assert.deepEqual(next.state.found, []);
  for (const fields of [{ action: 'inspect', target: 'case' }, { action: 'talk', target: 'ada' },
    { action: 'notebook', caseId: 'midnight-watch-v1' },
    { action: 'notebook', state: { ...next.state, found: ['case'] } }]) {
    assert.ok(raw({ state: next.state, ...fields }).error);
  }
});
