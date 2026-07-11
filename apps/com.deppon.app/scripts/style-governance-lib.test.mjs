import assert from 'node:assert/strict'
import test from 'node:test'

import {
  analyzeNativeContent,
  analyzeStyleContent,
  compareBaselineEvolution,
  compareSnapshot,
  createNextBaseline
} from './style-governance-lib.mjs'

const cleanStyle = (overrides = {}) => ({
  rawColors: 0,
  rawFontSizes: 0,
  rawLineHeights: 0,
  rawRadii: 0,
  rawFontWeights: 0,
  usesTokens: true,
  lines: 20,
  ...overrides
})

const snapshot = (overrides = {}) => ({
  scss: {
    files: {
      'src/pages/example/index.scss': cleanStyle()
    }
  },
  native: { files: {} },
  architecture: {
    parentStyleImports: [],
    legacyGlobalClassFiles: []
  },
  systemFailures: [],
  ...overrides
})

const baseline = current => ({
  version: 2,
  limits: {
    pageScssLines: 300,
    componentScssLines: 180
  },
  scss: current.scss,
  native: current.native,
  architecture: current.architecture
})

test('analyzeStyleContent detects every supported static color form', () => {
  const metrics = analyzeStyleContent(`
    @use '../../styles/tokens' as *;
    .example {
      color: #16181a;
      background: rgba(22, 24, 26, 0.48);
      border-color: red;
      shadow-color: transparent;
    }
    // color: #ffffff;
    /* background: blue; */
  `)

  assert.equal(metrics.rawColors, 4)
  assert.equal(metrics.usesTokens, true)
})

test('analyzeStyleContent detects colors hidden in local Sass variables', () => {
  const metrics = analyzeStyleContent(`
    $local-brand: #1a5eff;
    $local-overlay: rgba(0, 0, 0, 0.5);
    .example {
      color: $local-brand;
      background: $local-overlay;
    }
  `)

  assert.equal(metrics.rawColors, 2)
})

test('analyzeStyleContent detects typography and radius literals', () => {
  const metrics = analyzeStyleContent(`
    .example {
      font-size: 24px;
      line-height: 1.4;
      border-radius: 8px;
      font-weight: bold;
    }
  `)

  assert.equal(metrics.rawFontSizes, 1)
  assert.equal(metrics.rawLineHeights, 1)
  assert.equal(metrics.rawRadii, 1)
  assert.equal(metrics.rawFontWeights, 1)
})

test('analyzeStyleContent does not treat semantic font-weight tokens as literals', () => {
  const metrics = analyzeStyleContent(`
    @use '../../styles/tokens' as *;
    .example {
      font-weight: $dp-font-weight-bold;
    }
  `)

  assert.equal(metrics.rawFontWeights, 0)
})

test('analyzeNativeContent detects static colors in native props', () => {
  const metrics = analyzeNativeContent(`
    const a = '#ffffff'
    const b = 'rgba(0, 0, 0, 0.5)'
    const c = 'transparent'
  `)

  assert.equal(metrics.rawColors, 3)
})

test('daily comparison rejects a per-file increase despite a total decrease', () => {
  const previous = snapshot({
    scss: {
      files: {
        'src/pages/a/index.scss': cleanStyle({ rawColors: 2 }),
        'src/pages/b/index.scss': cleanStyle({ rawColors: 2 })
      }
    }
  })
  const current = snapshot({
    scss: {
      files: {
        'src/pages/a/index.scss': cleanStyle({ rawColors: 3 }),
        'src/pages/b/index.scss': cleanStyle({ rawColors: 0 })
      }
    }
  })

  const result = compareSnapshot(current, baseline(previous))

  assert.equal(result.ok, false)
  assert.match(
    result.failures.join('\n'),
    /src\/pages\/a\/index\.scss.*颜色.*2.*3/
  )
})

test('daily comparison requires the baseline to ratchet after improvement', () => {
  const previous = snapshot({
    scss: {
      files: {
        'src/pages/example/index.scss': cleanStyle({ rawColors: 2 })
      }
    }
  })
  const current = snapshot({
    scss: {
      files: {
        'src/pages/example/index.scss': cleanStyle({ rawColors: 1 })
      }
    }
  })

  const result = compareSnapshot(current, baseline(previous))

  assert.equal(result.ok, false)
  assert.match(result.failures.join('\n'), /基线可从 2 收紧到 1/)
})

test('baseline update accepts debt reduction and rejects debt increase', () => {
  const previous = snapshot({
    scss: {
      files: {
        'src/pages/example/index.scss': cleanStyle({ rawColors: 2 })
      }
    }
  })
  const reduced = snapshot({
    scss: {
      files: {
        'src/pages/example/index.scss': cleanStyle({ rawColors: 1 })
      }
    }
  })
  const increased = snapshot({
    scss: {
      files: {
        'src/pages/example/index.scss': cleanStyle({ rawColors: 3 })
      }
    }
  })

  assert.equal(createNextBaseline(reduced, baseline(previous)).ok, true)
  assert.equal(createNextBaseline(increased, baseline(previous)).ok, false)
})

test('baseline evolution rejects manually raised ceilings', () => {
  const previous = baseline(
    snapshot({
      scss: {
        files: {
          'src/pages/example/index.scss': cleanStyle({ rawColors: 1 })
        }
      }
    })
  )
  const raised = structuredClone(previous)
  raised.scss.files['src/pages/example/index.scss'].rawColors = 2

  const result = compareBaselineEvolution(raised, previous)

  assert.equal(result.ok, false)
  assert.match(result.failures.join('\n'), /颜色字面量上限从 1 放宽到 2/)
})

test('baseline evolution allows a new strict zero-debt file', () => {
  const previous = baseline(snapshot())
  const current = structuredClone(previous)
  current.scss.files['src/pages/new/index.scss'] = cleanStyle()

  assert.equal(compareBaselineEvolution(current, previous).ok, true)
})

test('strict comparison requires zero debt and applies file budgets', () => {
  const current = snapshot({
    scss: {
      files: {
        'src/pages/example/index.scss': cleanStyle({
          rawColors: 1,
          lines: 301
        })
      }
    },
    native: {
      files: {
        'src/pages/example/index.tsx': { rawColors: 1 }
      }
    },
    architecture: {
      parentStyleImports: [
        {
          file: 'src/pages/example/components/Panel.tsx',
          importPath: '../index.scss'
        }
      ],
      legacyGlobalClassFiles: ['src/styles/_components.scss']
    }
  })

  const result = compareSnapshot(current, baseline(current), { strict: true })
  const failures = result.failures.join('\n')

  assert.equal(result.ok, false)
  assert.match(failures, /颜色字面量必须归零/)
  assert.match(failures, /超过页面上限 300 行/)
  assert.match(failures, /TS\/TSX 静态颜色必须归零/)
  assert.match(failures, /父级 index\.scss/)
  assert.match(failures, /legacy 全局类/)
})
