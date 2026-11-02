import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const { transformSync } = createRequire(require.resolve('vite/package.json'))('esbuild');
const source = readFileSync(new URL('../src/components/atelier/guided-tour.tsx', import.meta.url), 'utf8');
const { code } = transformSync(source, { loader: 'tsx', format: 'cjs', jsx: 'automatic' });

// Mock the modal primitives and hook lifecycle; never load the app, API, or database.
function harness(storage = new Map(), blocked = false) {
  let cursor = 0;
  const states = [];
  const writes = [];
  const modules = {
    react: {
      createContext: (value) => ({ Provider: 'mock-provider', value }),
      useContext: (context) => context.value,
      useState: (initial) => {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], (value) => { states[index] = value; }];
      },
    },
    '@/components/ui/dialog': Object.fromEntries(
      ['Dialog', 'DialogContent', 'DialogDescription', 'DialogHeader', 'DialogTitle'].map((name) => [
        name, ({ children, open }) => name === 'Dialog' && !open ? null : React.createElement('div', null, children),
      ]),
    ),
    './motifs': { CatMark: () => React.createElement('svg', { 'data-cat-logo': true }) },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: (id) => id in modules ? modules[id] : require(id),
    localStorage: {
      getItem: (key) => { if (blocked) throw new Error('Blocked'); return storage.get(key) ?? null; },
      setItem: (key, value) => {
        if (blocked) throw new Error('Blocked');
        writes.push([key, value]);
        storage.set(key, value);
      },
    },
  });
  const render = () => {
    cursor = 0;
    const provider = module.exports.GuidedTourProvider({ children: null });
    return { actions: provider.props.value, dialog: provider.props.children[1] };
  };
  return { ...module.exports, render, writes };
}

function button(tree, id) {
  if (!React.isValidElement(tree)) return null;
  if (tree.props['data-testid'] === id) return tree;
  return React.Children.toArray(tree.props.children).map((child) => button(child, id)).find(Boolean);
}

test('starts closed, opens only after naming, visits all five steps, supports Back and completes', () => {
  const h = harness();
  assert.equal(h.render().dialog.props.step, null);
  h.render().actions.afterNaming();
  let tree = h.GuidedTourDialog(h.render().dialog.props);
  assert.equal(button(tree, 'button-tour-back').props.disabled, true);
  for (let i = 0; i < 5; i++) {
    const view = h.render();
    assert.equal(view.dialog.props.step, i);
    tree = h.GuidedTourDialog(view.dialog.props);
    const html = renderToStaticMarkup(tree);
    assert.ok(html.includes(h.TOUR_STEPS[i].title));
    assert.ok(html.includes(`${i + 1} of 5`));
    assert.match(html, /data-cat-logo/);
    assert.ok(button(tree, 'button-skip-tour'));
    if (i === 1) {
      button(tree, 'button-tour-back').props.onClick();
      assert.equal(h.render().dialog.props.step, 0);
      button(h.GuidedTourDialog(h.render().dialog.props), 'button-tour-next').props.onClick();
    }
    button(h.GuidedTourDialog(h.render().dialog.props), 'button-tour-next').props.onClick();
  }
  assert.equal(h.render().dialog.props.step, null);
  assert.deepEqual(h.writes, [[h.TOUR_COMPLETED_KEY, 'true']]);
});

test('Skip and modal dismissal persist completion; reload stays closed; replay starts at Welcome', () => {
  for (const dismissal of ['skip', 'close']) {
    const storage = new Map();
    const h = harness(storage);
    h.render().actions.afterNaming();
    const tree = h.GuidedTourDialog(h.render().dialog.props);
    if (dismissal === 'skip') button(tree, 'button-skip-tour').props.onClick();
    else tree.props.onOpenChange(false); // Escape, X, or outside dismissal.
    assert.equal(h.render().dialog.props.step, null);
    h.render().actions.afterNaming();
    assert.equal(h.render().dialog.props.step, null);
    const reloaded = harness(storage);
    reloaded.render().actions.afterNaming();
    assert.equal(reloaded.render().dialog.props.step, null);
    reloaded.render().actions.replay();
    assert.equal(reloaded.render().dialog.props.step, 0);
    assert.deepEqual([...storage], [[h.TOUR_COMPLETED_KEY, 'true']]);
  }
});

test('blocked localStorage never blocks dismissal or replay and completion lasts for the session', () => {
  const h = harness(new Map(), true);
  h.render().actions.afterNaming();
  button(h.GuidedTourDialog(h.render().dialog.props), 'button-skip-tour').props.onClick();
  h.render().actions.afterNaming();
  assert.equal(h.render().dialog.props.step, null);
  h.render().actions.replay();
  assert.equal(h.render().dialog.props.step, 0);
});

test('naming save/skip share the tour trigger; Studio exposes replay; tour has no navigation or network dependencies', () => {
  const naming = readFileSync(new URL('../src/components/atelier/naming-dialog.tsx', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../src/pages/settings.tsx', import.meta.url), 'utf8');
  assert.match(naming, /onSettled: \(\) => \{ onDone\(\); tour.afterNaming\(\); \}/);
  assert.match(naming, /finish\(false\)/);
  assert.match(naming, /finish\(true\)/);
  assert.match(settings, /onClick=\{tour.replay\}[^>]*>Replay guided tour/);
  assert.doesNotMatch(source, /fetch\(|navigate\(|useSaveLook|useSaveSettings|useRender|@\/lib\/db/);
});
