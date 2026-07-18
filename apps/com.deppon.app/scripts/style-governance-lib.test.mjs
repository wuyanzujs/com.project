import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  analyzeNativePressableContract,
  analyzeNativeTouchMinimum,
  analyzeNativeContent,
  analyzeStyleContent,
  collectProjectSnapshot,
  compareBaselineEvolution,
  compareSnapshot,
  createInitialBaseline,
  createNextBaseline,
  scanDirectReactNativePressables,
  scanNativeClickHandlers
} from './style-governance-lib.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const governanceLibraryPath = path.join(
  scriptDirectory,
  'style-governance-lib.mjs'
)
const governanceCliPath = path.join(
  scriptDirectory,
  'check-style-governance.mjs'
)
const releaseBaselineContractPath = path.join(
  scriptDirectory,
  'check-release-style-baseline.mjs'
)

const makeFixtureWritable = root => {
  if (!fs.existsSync(root)) {
    return
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name)

    if (entry.isDirectory()) {
      makeFixtureWritable(filePath)
      continue
    }

    try {
      fs.chmodSync(filePath, 0o666)
    } catch {
      // Cleanup should remain best-effort when another process owns a file.
    }
  }

  try {
    fs.chmodSync(root, 0o777)
  } catch {
    // Cleanup should remain best-effort when another process owns a directory.
  }
}

const cleanupWaitBuffer = new Int32Array(new SharedArrayBuffer(4))

const removeFixture = root => {
  let lastError

  for (let attempt = 0; attempt <= 50; attempt += 1) {
    try {
      makeFixtureWritable(root)
      fs.rmSync(root, {
        recursive: true,
        force: true
      })
      return
    } catch (error) {
      if (!['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error?.code)) {
        throw error
      }

      lastError = error
      Atomics.wait(cleanupWaitBuffer, 0, 0, 100)
    }
  }

  throw lastError
}
const workspaceRoot = path.resolve(scriptDirectory, '..', '..', '..')

const writeFixtureFile = (root, file, content) => {
  const filePath = path.join(root, file)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

const createProjectFixture = (t, files = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'style-governance-'))
  t.after(() => removeFixture(root))

  const defaults = {
    'src/app.scss': "@use './styles/tokens' as *;\n",
    'src/styles/_tokens.scss': '$fixture-color: #16181a;\n',
    'src/styles/nativeTokens.ts':
      'export const APP_NATIVE_TOKENS = { touch: { minimum: 44 } } as const\n'
  }
  for (const [file, content] of Object.entries({ ...defaults, ...files })) {
    writeFixtureFile(root, file, content)
  }

  return root
}

const run = (command, args, options = {}) =>
  spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
    env: { ...process.env, ...options.env }
  })

const createCliFixture = (t, files = {}) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'style-cli-'))
  t.after(() => removeFixture(repoRoot))
  const appRoot = path.join(repoRoot, 'apps', 'com.deppon.app')
  const fixtureFiles = {
    'src/app.scss': "@use './styles/tokens' as *;\n",
    'src/styles/_tokens.scss': '$fixture-color: #16181a;\n',
    'src/styles/nativeTokens.ts':
      'export const APP_NATIVE_TOKENS = { touch: { minimum: 44 } } as const\n',
    'src/pages/example/index.scss':
      "@use '../../styles/tokens' as *;\n.example { padding: 0; }\n",
    ...files
  }
  for (const [file, content] of Object.entries(fixtureFiles)) {
    writeFixtureFile(appRoot, file, content)
  }

  const fixtureScriptDirectory = path.join(appRoot, 'scripts')
  fs.mkdirSync(fixtureScriptDirectory, { recursive: true })
  fs.copyFileSync(
    governanceLibraryPath,
    path.join(fixtureScriptDirectory, 'style-governance-lib.mjs')
  )
  fs.copyFileSync(
    governanceCliPath,
    path.join(fixtureScriptDirectory, 'check-style-governance.mjs')
  )

  const current = collectProjectSnapshot(appRoot)
  const fixtureBaselinePath = path.join(
    fixtureScriptDirectory,
    'style-governance-baseline.json'
  )
  fs.writeFileSync(
    fixtureBaselinePath,
    `${JSON.stringify(createInitialBaseline(current), null, 2)}\n`
  )

  return {
    appRoot,
    repoRoot,
    baselinePath: fixtureBaselinePath,
    cliPath: path.join(fixtureScriptDirectory, 'check-style-governance.mjs')
  }
}

const runCli = (fixture, args = [], options = {}) =>
  run(process.execPath, [fixture.cliPath, ...args], {
    cwd: fixture.appRoot,
    ...options
  })

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

test('analyzeStyleContent accepts declarations without a trailing semicolon', () => {
  const metrics = analyzeStyleContent(`
    .example {
      color: #16181a
    }
  `)

  assert.equal(metrics.rawColors, 1)
})

test('analyzeStyleContent follows local Sass variable aliases for every debt type', () => {
  const metrics = analyzeStyleContent(`
    $local-color: #1a5eff;
    $aliased-color: $local-color;
    $local-font-size: 24px;
    $aliased-font-size: $local-font-size;
    $local-line-height: 36px;
    $aliased-line-height: $local-line-height;
    $local-radius: 8px;
    $aliased-radius: $local-radius;
    $local-weight: 700;
    $aliased-weight: $local-weight;

    .example {
      color: $aliased-color;
      font-size: $aliased-font-size;
      line-height: $aliased-line-height;
      border-radius: $aliased-radius;
      font-weight: $aliased-weight
    }
  `)

  assert.equal(metrics.rawColors, 1)
  assert.equal(metrics.rawFontSizes, 1)
  assert.equal(metrics.rawLineHeights, 1)
  assert.equal(metrics.rawRadii, 1)
  assert.equal(metrics.rawFontWeights, 1)
})

test('analyzeStyleContent supports Sass identifiers and interpolation', () => {
  const metrics = analyzeStyleContent(`
    $_color_value: #1a5eff;
    $-font_size: 24px;
    $_font_alias: $-font-size;
    $-line_height: 36px;
    $_radius_value: 8px;
    $-weight_value: 700;

    .example {
      color: $_color-value;
      font-size: #{$_font-alias};
      line-height: #{$-line-height};
      border-radius: #{$_radius-value};
      font-weight: #{$-weight-value}
    }
  `)

  assert.equal(metrics.rawColors, 1)
  assert.equal(metrics.rawFontSizes, 1)
  assert.equal(metrics.rawLineHeights, 1)
  assert.equal(metrics.rawRadii, 1)
  assert.equal(metrics.rawFontWeights, 1)
})

test('analyzeStyleContent resolves variables by lexical scope and source position', () => {
  const metrics = analyzeStyleContent(`
    $size: 24px;
    $size-alias: $size;
    .before-reassignment { font-size: $size-alias; }
    $size: $dp-font-size-body;
    .after-reassignment { font-size: $size; }

    .raw-scope {
      $_radius: 8px;
      border-radius: $_radius;
    }
    .token-scope {
      $_radius: $dp-radius-sm;
      border-radius: $_radius;
    }

    $weight: $dp-font-weight-bold;
    .before-later-literal { font-weight: $weight; }
    $weight: 700;
  `)

  assert.equal(metrics.rawFontSizes, 1)
  assert.equal(metrics.rawRadii, 1)
  assert.equal(metrics.rawFontWeights, 0)
})

for (const [name, directive, setup = '', teardown = ''] of [
  ['if', '@if true', '', ''],
  ['for', '@for $index from 1 through 1', '', ''],
  ['each', '@each $item in (one)', '', ''],
  ['while', '@while $keep-going', '$keep-going: true;', '$keep-going: false;']
]) {
  test(`analyzeStyleContent applies ${name} assignments to existing outer variables`, () => {
    const metrics = analyzeStyleContent(`
      $color: $dp-color-brand;
      $size: $dp-font-size-body;
      $leading: $dp-line-height-body;
      $radius: $dp-radius-sm;
      $weight: $dp-font-weight-bold;
      ${setup}
      ${directive} {
        $color: #1a5eff;
        $size: 24px;
        $leading: 36px;
        $radius: 8px;
        $weight: 700;
        ${teardown}
      }
      .example {
        color: $color;
        font-size: $size;
        line-height: $leading;
        border-radius: $radius;
        font-weight: $weight;
      }
    `)

    assert.equal(metrics.rawColors, 1)
    assert.equal(metrics.rawFontSizes, 1)
    assert.equal(metrics.rawLineHeights, 1)
    assert.equal(metrics.rawRadii, 1)
    assert.equal(metrics.rawFontWeights, 1)
  })
}

test('analyzeStyleContent keeps new flow-control variables inside the block', () => {
  const metrics = analyzeStyleContent(`
    @if true {
      $new-size: 24px;
      $new-leading: 36px;
      $new-radius: 8px;
      $new-weight: 700;
    }
    .example {
      font-size: $new-size;
      line-height: $new-leading;
      border-radius: $new-radius;
      font-weight: $new-weight;
    }
  `)

  assert.equal(metrics.rawFontSizes, 0)
  assert.equal(metrics.rawLineHeights, 0)
  assert.equal(metrics.rawRadii, 0)
  assert.equal(metrics.rawFontWeights, 0)
})

test('analyzeStyleContent keeps ordinary selector variables inside the selector', () => {
  const metrics = analyzeStyleContent(`
    .scope {
      $size: 24px;
      $leading: 36px;
      $radius: 8px;
      $weight: 700;
    }
    .outside {
      font-size: $size;
      line-height: $leading;
      border-radius: $radius;
      font-weight: $weight;
    }
  `)

  assert.equal(metrics.rawFontSizes, 0)
  assert.equal(metrics.rawLineHeights, 0)
  assert.equal(metrics.rawRadii, 0)
  assert.equal(metrics.rawFontWeights, 0)
})

test('analyzeStyleContent handles variable cycles without treating them as literals', () => {
  const metrics = analyzeStyleContent(`
    $first: $second;
    $second: $first;
    .example {
      font-size: $first;
      line-height: tokens.$dp-line-height-body;
    }
  `)

  assert.equal(metrics.rawFontSizes, 0)
  assert.equal(metrics.rawLineHeights, 0)
})

test('analyzeStyleContent does not resolve namespaced design tokens as local variables', () => {
  const metrics = analyzeStyleContent(`
    @use '../../styles/tokens' as tokens;
    .example {
      color: tokens.$dp-color-brand;
      font-size: tokens.$dp-font-size-body;
      line-height: tokens.$dp-line-height-body;
      border-radius: tokens.$dp-radius-sm;
      font-weight: tokens.$dp-font-weight-bold
    }
  `)

  assert.equal(metrics.rawColors, 0)
  assert.equal(metrics.rawFontSizes, 0)
  assert.equal(metrics.rawLineHeights, 0)
  assert.equal(metrics.rawRadii, 0)
  assert.equal(metrics.rawFontWeights, 0)
  assert.equal(metrics.usesTokens, true)
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

test('analyzeStyleContent detects typography literals in font shorthand', () => {
  const metrics = analyzeStyleContent(`
    $local-size: 24px;
    $size-alias: $local-size;
    $local-leading: 1.5;
    $leading-alias: $local-leading;
    $local-weight: 700;
    $weight-alias: $local-weight;

    .direct {
      font: italic bold 20px / 28px "Deppon Sans";
    }
    .aliased {
      font: italic $weight-alias $size-alias / $leading-alias sans-serif;
    }
    .tokenized {
      font: italic $dp-font-weight-bold $dp-font-size-body / $dp-line-height-body sans-serif;
    }
  `)

  assert.equal(metrics.rawFontSizes, 2)
  assert.equal(metrics.rawLineHeights, 2)
  assert.equal(metrics.rawFontWeights, 2)
})

test('analyzeStyleContent detects static mixin defaults by declaration usage', () => {
  const metrics = analyzeStyleContent(`
    $literal-color: #1a5eff;
    $color-alias: $literal-color;
    $literal-size: 24px;
    $size-alias: $literal-size;
    $literal-leading: 1.5;
    $leading-alias: $literal-leading;
    $literal-radius: 8px;
    $radius-alias: $literal-radius;
    $literal-weight: 700;
    $weight-alias: $literal-weight;

    @mixin visual-contract(
      $foreground: $color-alias,
      $text-metric: $size-alias,
      $vertical-metric: $leading-alias,
      $corner-metric: $radius-alias,
      $emphasis: $weight-alias
    ) {
      color: $foreground;
      font-size: $text-metric;
      line-height: $vertical-metric;
      border-radius: $corner-metric;
      font-weight: $emphasis;
    }
  `)

  assert.equal(metrics.rawColors, 1)
  assert.equal(metrics.rawFontSizes, 1)
  assert.equal(metrics.rawLineHeights, 1)
  assert.equal(metrics.rawRadii, 1)
  assert.equal(metrics.rawFontWeights, 1)
})

test('analyzeStyleContent detects positional include literals and local aliases', () => {
  const metrics = analyzeStyleContent(`
    @mixin visual-contract(
      $foreground,
      $text-metric,
      $vertical-metric,
      $corner-metric,
      $emphasis
    ) {
      color: $foreground;
      font-size: $text-metric;
      line-height: $vertical-metric;
      border-radius: $corner-metric;
      font-weight: $emphasis;
    }

    .direct {
      @include visual-contract(#1a5eff, 24px, 1.5, 8px, 700);
    }

    $literal-color: #ffffff;
    $color-alias: $literal-color;
    $literal-size: 20px;
    $size-alias: $literal-size;
    $literal-leading: 28px;
    $leading-alias: $literal-leading;
    $literal-radius: 6px;
    $radius-alias: $literal-radius;
    $literal-weight: 600;
    $weight-alias: $literal-weight;

    .aliased {
      @include visual-contract(
        $color-alias,
        $size-alias,
        $leading-alias,
        $radius-alias,
        $weight-alias
      );
    }
  `)

  assert.equal(metrics.rawColors, 2)
  assert.equal(metrics.rawFontSizes, 2)
  assert.equal(metrics.rawLineHeights, 2)
  assert.equal(metrics.rawRadii, 2)
  assert.equal(metrics.rawFontWeights, 2)
})

test('analyzeStyleContent detects named include literals without a local definition', () => {
  const metrics = analyzeStyleContent(`
    .example {
      @include external.visual(
        $color: rgba(0, 0, 0, 0.5),
        $font-size: 24px,
        $line-height: 1.5,
        $border-radius: 8px,
        $font-weight: bold
      );
    }
  `)

  assert.equal(metrics.rawColors, 1)
  assert.equal(metrics.rawFontSizes, 1)
  assert.equal(metrics.rawLineHeights, 1)
  assert.equal(metrics.rawRadii, 1)
  assert.equal(metrics.rawFontWeights, 1)
})

test('analyzeNativeContent detects static colors in native props', () => {
  const metrics = analyzeNativeContent(`
    const a = '#ffffff'
    const b = 'rgba(0, 0, 0, 0.5)'
    const c = 'transparent'
  `)

  assert.equal(metrics.rawColors, 3)
})

test('scanNativeClickHandlers finds direct Taro primitive handlers only', () => {
  const source = `
    import * as TaroComponents from '@tarojs/components'
    import { Image, Text, View as NativeView } from '@tarojs/components'
    // <View onClick={ignored} />
    const ordinary = "<Text onTap={ignored} />"
    const custom = <Banner onClick={allowed} />
    const view = <NativeView
      onClick={handleClick}
      onTap={() => undefined}
    />
    const image = <Image onTap={handleTap} />
    const text = <Text {...{ onClick: handleClick }} />
    const namespaced = <TaroComponents.View onClick />
  `

  assert.deepEqual(scanNativeClickHandlers(source), [
    { element: 'NativeView', prop: 'onClick', line: 8 },
    { element: 'NativeView', prop: 'onTap', line: 9 },
    { element: 'Image', prop: 'onTap', line: 11 },
    { element: 'Text', prop: 'spread', line: 12 },
    { element: 'TaroComponents.View', prop: 'onClick', line: 13 }
  ])
})

test('scanNativeClickHandlers ignores unknown spreads but reports static click spreads', () => {
  const source = `
    import { View, Text } from '@tarojs/components'
    const props = getProps()
    const view = <View {...props} />
    const text = <Text {...{ onTap: handleTap }} />
  `

  assert.deepEqual(scanNativeClickHandlers(source), [
    { element: 'Text', prop: 'spread', line: 5 }
  ])
})

test('scanDirectReactNativePressables finds aliases and createElement bypasses', () => {
  const source = `
    import { Pressable as NativePressable } from 'react-native'
    import * as RN from 'react-native'
    const first = <NativePressable />
    const second = React.createElement(RN.Pressable, null)
  `

  assert.deepEqual(scanDirectReactNativePressables(source), [
    { element: 'NativePressable', line: 4 },
    { element: 'RN.Pressable', line: 5 }
  ])
})

test('AppNativePressable contract requires the shared 44dp token', () => {
  assert.deepEqual(
    analyzeNativePressableContract(`
      minWidth: APP_NATIVE_TOKENS.touch.minimum,
      minHeight: APP_NATIVE_TOKENS.touch.minimum
    `),
    { minWidth: true, minHeight: true }
  )
  assert.deepEqual(
    analyzeNativePressableContract(`
      minWidth: 44,
      minHeight: APP_NATIVE_TOKENS.touch.minimum
    `),
    { minWidth: false, minHeight: true }
  )
})

test('native touch minimum is statically locked to 44dp', () => {
  assert.deepEqual(
    analyzeNativeTouchMinimum(`
      export const APP_NATIVE_TOKENS = {
        touch: { minimum: 44 }
      } as const
    `),
    { minimum: 44, isStatic44: true }
  )
  assert.deepEqual(
    analyzeNativeTouchMinimum(`
      export const APP_NATIVE_TOKENS = {
        touch: { minimum: 40 }
      } as const
    `),
    { minimum: 40, isStatic44: false }
  )
  assert.deepEqual(
    analyzeNativeTouchMinimum(`
      export const APP_NATIVE_TOKENS = {
        touch: { minimum: BASE_SIZE }
      } as const
    `),
    { minimum: null, isStatic44: false }
  )
})

test('collectProjectSnapshot rejects a touch minimum below 44dp', t => {
  const root = createProjectFixture(t, {
    'src/styles/nativeTokens.ts': `
      export const APP_NATIVE_TOKENS = {
        touch: { minimum: 40 }
      } as const
    `
  })

  const current = collectProjectSnapshot(root)

  assert.match(
    current.systemFailures.join('\n'),
    /APP_NATIVE_TOKENS\.touch\.minimum.*静态数值 44/
  )
})

test('collectProjectSnapshot reports native primitive handlers and contract failures', t => {
  const root = createProjectFixture(t, {
    'src/pages/example/index.tsx': `
      import { View } from '@tarojs/components'
      export function Example() {
        return <View onClick={() => undefined} />
      }
    `,
    'src/shared/native/AppNativePressable.tsx': `
      const styles = StyleSheet.create({ target: { minWidth: 44, minHeight: 44 } })
    `
  })

  const current = collectProjectSnapshot(root)

  assert.deepEqual(current.architecture.nativeClickHandlers, [
    {
      file: 'src/pages/example/index.tsx',
      element: 'View',
      prop: 'onClick',
      line: 4
    }
  ])
  assert.match(
    current.systemFailures.join('\n'),
    /AppNativePressable\.tsx.*APP_NATIVE_TOKENS\.touch\.minimum/
  )
})

test('collectProjectSnapshot scans app.scss as a governed style file', t => {
  const root = createProjectFixture(t, {
    'src/app.scss': `
      @use './styles/tokens' as *;
      .app-root {
        color: #16181a
      }
    `
  })

  const current = collectProjectSnapshot(root)

  assert.ok(current.scss.files['src/app.scss'])
  assert.equal(current.scss.files['src/app.scss'].rawColors, 1)
})

test('collectProjectSnapshot rejects business selectors in _tokens.scss', t => {
  const root = createProjectFixture(t, {
    'src/styles/_tokens.scss': `
      $fixture-color: #16181a;
      .business-output { color: $fixture-color; }
    `
  })

  const current = collectProjectSnapshot(root)

  assert.match(
    current.systemFailures.join('\n'),
    /_tokens\.scss.*只能声明 token/
  )
})

test('collectProjectSnapshot rejects gradients, pseudo-elements, unreliable units and page elevation', t => {
  const root = createProjectFixture(t, {
    'src/pages/example/index.scss': `
      @use '../../styles/tokens' as *;
      .example::before {
        width: 2ch;
        background: conic-gradient($dp-color-brand, $dp-color-brand);
        elevation: 2;
      }
    `,
    'src/pages/example/index.tsx': `
      import { View } from '@tarojs/components'
      import './index.scss'
      export function Example() {
        return <View style={{ elevation: 2 }} />
      }
    `
  })

  const current = collectProjectSnapshot(root)
  const failures = current.systemFailures.join('\n')

  assert.match(failures, /禁止使用 gradient/)
  assert.match(failures, /RN 不可靠单位 ch/)
  assert.match(failures, /RN 不支持的伪元素 ::before/)
  assert.match(failures, /页面样式禁止直接使用 elevation/)
  assert.match(failures, /页面原生样式禁止直接使用 elevation/)
})

test('collectProjectSnapshot rejects direct RN pressable bypasses outside the shared wrapper', t => {
  const root = createProjectFixture(t, {
    'src/shared/native/SmallPressable.tsx': `
      import { Pressable as TinyPressable } from 'react-native'
      export const SmallPressable = () => <TinyPressable />
    `
  })

  const current = collectProjectSnapshot(root)

  assert.match(
    current.systemFailures.join('\n'),
    /SmallPressable\.tsx:3 不能直接使用 RN TinyPressable/
  )
})

test('stylelint contract rejects unsupported RN style functions and units', () => {
  const stylelintScriptPath = path.join(
    workspaceRoot,
    'apps/com.deppon.app/node_modules/stylelint/bin/stylelint.mjs'
  )
  const invalid = run(
    process.execPath,
    [stylelintScriptPath, '--stdin-filename', 'src/pages/example/index.scss'],
    {
      cwd: path.join(workspaceRoot, 'apps/com.deppon.app'),
      input: `.example { width: 2ch; background: repeating-conic-gradient(red, blue); }\n`
    }
  )
  const valid = run(
    process.execPath,
    [stylelintScriptPath, '--stdin-filename', 'src/pages/example/index.scss'],
    {
      cwd: path.join(workspaceRoot, 'apps/com.deppon.app'),
      input: `.example { width: 2px; transform: rotate(2deg); }\n`
    }
  )

  assert.equal(invalid.status !== 0, true, invalid.stdout)
  assert.equal(valid.status, 0, valid.stderr)
})

test('RN boundary contract includes style, pressable and Taro alias rules', () => {
  const boundarySource = fs.readFileSync(
    path.join(scriptDirectory, 'check-rn-boundaries.mjs'),
    'utf8'
  )

  for (const token of [
    '(?:repeating-)?(?:linear|radial|conic)-gradient',
    '::[A-Za-z]',
    'elevation\\s*:',
    'Pressable|TouchableHighlight|TouchableNativeFeedback|TouchableOpacity|TouchableWithoutFeedback',
    'includeRelativePathPrefixes',
    'checkForbiddenTaroApiAliases'
  ]) {
    assert.ok(
      boundarySource.includes(token),
      `check-rn-boundaries.mjs 缺少契约片段：${token}`
    )
  }
})

test('collectProjectSnapshot detects every supported parent style import form', t => {
  const root = createProjectFixture(t, {
    'src/pages/example/index.scss': "@use '../../styles/tokens' as *;\n",
    'src/pages/example/index.tsx': "import './index.scss'\n",
    'src/pages/example/components/SideEffect.tsx': "import '../index.scss'\n",
    'src/pages/example/components/FromImport.tsx':
      "import styles from '../index.scss'\nvoid styles\n",
    'src/pages/example/components/CommonJs.tsx': "require('../index.scss')\n",
    'src/pages/example/components/Dynamic.tsx':
      "void import('../index.scss')\n",
    'src/pages/example/components/TemplateDynamic.tsx':
      'void import(`../index.scss`)\n',
    'src/pages/example/components/TemplateRequire.tsx':
      'require(`../index.scss`)\n',
    'src/pages/example/components/Alias.tsx':
      "import '@/pages/example/index.scss'\n",
    'src/pages/example/components/Normalized.tsx': "import '.././index.scss'\n",
    'src/pages/example/components/Extensionless.tsx': "import '../index'\n",
    'src/pages/example/components/Legacy.jsx': "import '../index.scss'\n",
    'src/pages/example/components/SassUse.scss': "@use '../index';\n",
    'src/pages/example/components/SassForward.scss':
      "@forward '../index.scss';\n"
  })

  const current = collectProjectSnapshot(root)
  const imports = new Set(
    current.architecture.parentStyleImports.map(
      item => `${item.file}:${item.importPath}`
    )
  )

  assert.deepEqual(
    imports,
    new Set([
      'src/pages/example/components/Alias.tsx:@/pages/example/index.scss',
      'src/pages/example/components/CommonJs.tsx:../index.scss',
      'src/pages/example/components/Dynamic.tsx:../index.scss',
      'src/pages/example/components/Extensionless.tsx:../index',
      'src/pages/example/components/FromImport.tsx:../index.scss',
      'src/pages/example/components/Legacy.jsx:../index.scss',
      'src/pages/example/components/Normalized.tsx:.././index.scss',
      'src/pages/example/components/SassForward.scss:../index.scss',
      'src/pages/example/components/SassUse.scss:../index',
      'src/pages/example/components/SideEffect.tsx:../index.scss',
      'src/pages/example/components/TemplateDynamic.tsx:../index.scss',
      'src/pages/example/components/TemplateRequire.tsx:../index.scss'
    ])
  )
})

test('collectProjectSnapshot resolves Sass index partials in every path form', t => {
  const root = createProjectFixture(t, {
    'src/pages/partial/_index.scss':
      "@use '../../styles/tokens' as *;\n",
    'src/pages/partial/components/Explicit.tsx':
      "import '../_index.scss'\n",
    'src/pages/partial/components/Extensionless.tsx':
      "import '../_index'\n",
    'src/pages/partial/components/Directory.tsx':
      "import '..'\n",
    'src/pages/partial/components/SassUse.scss': "@use '../_index';\n"
  })

  const current = collectProjectSnapshot(root)
  const imports = new Set(
    current.architecture.parentStyleImports.map(
      item => `${item.file}:${item.importPath}`
    )
  )

  assert.deepEqual(
    imports,
    new Set([
      'src/pages/partial/components/Directory.tsx:..',
      'src/pages/partial/components/Explicit.tsx:../_index.scss',
      'src/pages/partial/components/Extensionless.tsx:../_index',
      'src/pages/partial/components/SassUse.scss:../_index'
    ])
  )
})

test('collectProjectSnapshot ignores commented and non-import style strings', t => {
  const root = createProjectFixture(t, {
    'src/pages/example/index.scss': "@use '../../styles/tokens' as *;\n",
    'src/pages/example/components/Comments.tsx':
      `
      // import '../index.scss'
      /* require('../index.scss') */
      const ordinary = "import '../index.scss'"
      const interpolated = import(` +
      '`../${segment}.scss`' +
      `)
      void ordinary
      void interpolated
    `
  })

  const current = collectProjectSnapshot(root)

  assert.deepEqual(current.architecture.parentStyleImports, [])
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

test('native click handlers are tracked per file in daily and strict modes', () => {
  const handler = {
    file: 'src/pages/example/index.tsx',
    element: 'View',
    prop: 'onClick',
    line: 4
  }
  const previous = snapshot({
    architecture: {
      parentStyleImports: [],
      legacyGlobalClassFiles: [],
      nativeClickHandlers: [handler]
    }
  })
  const unchanged = snapshot({
    architecture: {
      parentStyleImports: [],
      legacyGlobalClassFiles: [],
      nativeClickHandlers: [handler]
    }
  })
  const removed = snapshot({
    architecture: {
      parentStyleImports: [],
      legacyGlobalClassFiles: [],
      nativeClickHandlers: []
    }
  })
  const added = snapshot({
    architecture: {
      parentStyleImports: [],
      legacyGlobalClassFiles: [],
      nativeClickHandlers: [handler, { ...handler, line: 8, prop: 'onTap' }]
    }
  })

  assert.equal(compareSnapshot(unchanged, baseline(previous)).ok, true)
  assert.equal(compareSnapshot(removed, baseline(previous)).ok, false)
  assert.match(
    compareSnapshot(removed, baseline(previous)).failures.join('\n'),
    /Taro 原生点击控件已减少，请更新基线/
  )
  assert.equal(compareSnapshot(added, baseline(previous)).ok, false)
  assert.match(
    compareSnapshot(added, baseline(previous)).failures.join('\n'),
    /Taro 原生点击控件新增/
  )
  assert.equal(
    compareSnapshot(unchanged, baseline(previous), { strict: true }).ok,
    false
  )
  assert.match(
    compareSnapshot(unchanged, baseline(previous), { strict: true }).failures.join(
      '\n'
    ),
    /不能直接绑定 onClick/
  )
})

test('native click baseline can only ratchet downward', () => {
  const handler = {
    file: 'src/pages/example/index.tsx',
    element: 'View',
    prop: 'onClick',
    line: 4
  }
  const previous = snapshot({
    architecture: {
      parentStyleImports: [],
      legacyGlobalClassFiles: [],
      nativeClickHandlers: [handler]
    }
  })
  const reduced = snapshot({
    architecture: {
      parentStyleImports: [],
      legacyGlobalClassFiles: [],
      nativeClickHandlers: []
    }
  })
  const increased = snapshot({
    architecture: {
      parentStyleImports: [],
      legacyGlobalClassFiles: [],
      nativeClickHandlers: [handler, { ...handler, line: 8, prop: 'onTap' }]
    }
  })

  assert.equal(createNextBaseline(reduced, baseline(previous)).ok, true)
  assert.equal(createNextBaseline(increased, baseline(previous)).ok, false)
  assert.equal(
    compareBaselineEvolution(baseline(reduced), baseline(previous)).ok,
    true
  )
  assert.equal(
    compareBaselineEvolution(baseline(increased), baseline(previous)).ok,
    false
  )
})

test('page index ownership keeps page orchestration small and excludes component indexes', t => {
  const root = createProjectFixture(t, {
    'src/pages/example/index.scss': `
      @use '../../styles/tokens' as *;
      .example-page { display: flex; }
      .example-header { display: flex; }
      .example-content { display: flex; }
      .example-footer { display: flex; }
      .example-actions { display: flex; }
      .example__legacy { display: flex; }
    `,
    'src/pages/example/components/index.scss': `
      @use '../../../styles/tokens' as *;
      .one { display: flex; }
      .two { display: flex; }
      .three { display: flex; }
      .four { display: flex; }
      .five { display: flex; }
    `,
    'src/pages/example/components/MissingStyle.tsx': `
      import { View } from '@tarojs/components'
      export const MissingStyle = () => <View />
    `,
    'src/pages/example/components/Owned.tsx': `
      import { View } from '@tarojs/components'
      import './shared.scss'
      export const Owned = () => <View />
    `,
    'src/pages/example/components/helper.tsx': `
      export const value: string = 'not JSX'
    `,
    'src/pages/example/components/shared.scss': `
      @use '../../../styles/tokens' as *;
      .shared { display: flex; }
    `
  })

  const current = collectProjectSnapshot(root)
  const failures = current.systemFailures.join('\n')
  assert.match(failures, /src\/pages\/example\/index\.scss.*顶级规则 6 个.*最多允许 4 个/)
  assert.match(failures, /src\/pages\/example\/index\.scss.*顶级选择器禁止 BEM/)
  assert.doesNotMatch(failures, /components\/index\.scss.*最多允许/)
  assert.match(
    failures,
    /src\/pages\/example\/components\/MissingStyle\.tsx.*静态导入同目录 SCSS/
  )
  assert.doesNotMatch(failures, /components\/Owned\.tsx/)
  assert.doesNotMatch(failures, /components\/helper\.tsx/)
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

test('baseline update and evolution always reject a per-file line increase', () => {
  const previous = snapshot({
    scss: {
      files: {
        'src/pages/example/index.scss': cleanStyle({ lines: 20 })
      }
    }
  })
  const increased = snapshot({
    scss: {
      files: {
        'src/pages/example/index.scss': cleanStyle({ lines: 21 })
      }
    }
  })

  const update = createNextBaseline(increased, baseline(previous))
  const evolution = compareBaselineEvolution(
    baseline(increased),
    baseline(previous)
  )

  assert.equal(update.ok, false)
  assert.match(update.failures.join('\n'), /行数从 20 增加到 21/)
  assert.equal(evolution.ok, false)
  assert.match(evolution.failures.join('\n'), /行数上限从 20 放宽到 21/)
})

test('baseline evolution never bypasses validation for a legacy baseline', () => {
  const result = compareBaselineEvolution({ version: 2 }, { version: 1 })

  assert.equal(result.ok, false)
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

for (const [field, label] of [
  ['rawColors', '颜色字面量'],
  ['rawFontSizes', 'font-size 字面量'],
  ['rawLineHeights', 'line-height 字面量'],
  ['rawRadii', 'border-radius 字面量'],
  ['rawFontWeights', 'font-weight 字面量']
]) {
  test(`baseline ratchet rejects a per-file ${field} increase`, () => {
    const previous = snapshot({
      scss: {
        files: {
          'src/pages/example/index.scss': cleanStyle({ [field]: 1 })
        }
      }
    })
    const increased = snapshot({
      scss: {
        files: {
          'src/pages/example/index.scss': cleanStyle({ [field]: 2 })
        }
      }
    })

    const update = createNextBaseline(increased, baseline(previous))
    const evolution = compareBaselineEvolution(
      baseline(increased),
      baseline(previous)
    )

    assert.equal(update.ok, false)
    assert.match(update.failures.join('\n'), new RegExp(label))
    assert.equal(evolution.ok, false)
    assert.match(evolution.failures.join('\n'), new RegExp(label))
  })
}

test('baseline ratchet rejects a per-file native color increase', () => {
  const previous = snapshot({
    native: {
      files: {
        'src/pages/example/index.tsx': { rawColors: 1 }
      }
    }
  })
  const increased = snapshot({
    native: {
      files: {
        'src/pages/example/index.tsx': { rawColors: 2 }
      }
    }
  })

  assert.equal(createNextBaseline(increased, baseline(previous)).ok, false)
  assert.equal(
    compareBaselineEvolution(baseline(increased), baseline(previous)).ok,
    false
  )
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

test('strict comparison governs a clean app.scss without requiring token usage', () => {
  const current = snapshot({
    scss: {
      files: {
        'src/app.scss': cleanStyle({ usesTokens: false })
      }
    }
  })

  assert.equal(
    compareSnapshot(current, baseline(current), { strict: true }).ok,
    true
  )
})

test('CLI default, strict, report and invalid modes expose stable exit codes', t => {
  const cleanFixture = createCliFixture(t)
  const debtFixture = createCliFixture(t, {
    'src/pages/example/index.scss': `
      @use '../../styles/tokens' as *;
      .example { color: #16181a; }
    `
  })

  assert.equal(runCli(cleanFixture).status, 0)
  assert.equal(runCli(cleanFixture, ['--strict']).status, 0)
  assert.equal(runCli(debtFixture).status, 0)
  assert.equal(runCli(debtFixture, ['--strict']).status, 1)
  assert.equal(runCli(debtFixture, ['--report']).status, 0)
  assert.equal(runCli(cleanFixture, ['--invalid']).status, 1)
})

test('CLI update writes a reduced baseline and is rejected in CI', t => {
  const fixture = createCliFixture(t, {
    'src/pages/example/index.scss': `
      @use '../../styles/tokens' as *;
      .example { color: #16181a; }
    `
  })
  writeFixtureFile(
    fixture.appRoot,
    'src/pages/example/index.scss',
    "@use '../../styles/tokens' as *;\n"
  )

  const update = runCli(fixture, ['--update-baseline'])
  const updatedBaseline = JSON.parse(
    fs.readFileSync(fixture.baselinePath, 'utf8')
  )

  assert.equal(update.status, 0, update.stderr)
  assert.equal(
    updatedBaseline.scss.files['src/pages/example/index.scss'].rawColors,
    0
  )

  const beforeCiAttempt = fs.readFileSync(fixture.baselinePath, 'utf8')
  for (const ciValue of ['true', '1', 'yes', 'on']) {
    const ciUpdate = runCli(fixture, ['--update-baseline'], {
      env: { CI: ciValue }
    })
    assert.equal(ciUpdate.status, 1, `CI=${ciValue} 应拒绝更新基线`)
    assert.match(ciUpdate.stderr, /CI 环境禁止更新样式基线/)
    assert.equal(
      fs.readFileSync(fixture.baselinePath, 'utf8'),
      beforeCiAttempt
    )
  }
})

test('CLI rejects a loosened baseline against a temporary git base ref', t => {
  const fixture = createCliFixture(t)
  for (const args of [
    ['init', '--quiet'],
    ['config', 'user.name', 'Style Governance Test'],
    ['config', 'user.email', 'style-governance@example.invalid'],
    ['add', '.'],
    ['commit', '--quiet', '-m', 'baseline']
  ]) {
    const result = run('git', args, { cwd: fixture.repoRoot })
    assert.equal(result.status, 0, result.stderr)
  }

  const loosened = JSON.parse(fs.readFileSync(fixture.baselinePath, 'utf8'))
  loosened.scss.files['src/pages/example/index.scss'].rawColors = 1
  fs.writeFileSync(
    fixture.baselinePath,
    `${JSON.stringify(loosened, null, 2)}\n`
  )

  const result = runCli(fixture, [], {
    env: { STYLE_GOVERNANCE_BASE_REF: 'HEAD' }
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /基线不得放宽/)
  assert.match(result.stderr, /颜色字面量上限从 0 放宽到 1/)
})

test('Android and iOS releases use the reusable baseline ratchet contract', () => {
  const workflows = ['android-release.yml', 'ios-release.yml'].map(file =>
    fs.readFileSync(
      path.join(workspaceRoot, '.github', 'workflows', file),
      'utf8'
    )
  )
  const contractPath = path.join(
    scriptDirectory,
    'check-release-style-baseline.mjs'
  )

  for (const workflow of workflows) {
    assert.match(
      workflow,
      /uses:\s*actions\/checkout@v4[\s\S]*?with:\s*\n\s+fetch-depth:\s*0/
    )
    assert.match(
      workflow,
      /node apps\/com\.deppon\.app\/scripts\/check-release-style-baseline\.mjs/
    )
    assert.match(
      workflow,
      /STYLE_GOVERNANCE_BASE_REF:\s*origin\/\$\{\{\s*github\.event\.repository\.default_branch\s*\}\}/
    )
  }

  const iosWorkflow = workflows[1]
  assert.match(iosWorkflow, /runs-on:\s*macos-14/)
  assert.match(iosWorkflow, /environment:\s*production/)
  assert.match(iosWorkflow, /pnpm check:app-styles:strict/)
  assert.match(iosWorkflow, /pnpm check:app-boundaries/)
  assert.match(iosWorkflow, /bundle:ios:production/)
  assert.doesNotMatch(iosWorkflow, /build_app|gym|\.ipa|provisioning/i)

  const contract = fs.readFileSync(contractPath, 'utf8')
  assert.doesNotMatch(contract, /\[\s*['"]log['"]/)
  assert.match(contract, /STYLE_GOVERNANCE_BASE_REF/)
  assert.match(contract, /check-style-governance\.mjs/)
})

test('formal verify includes the strict style gate', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(workspaceRoot, 'apps/com.deppon.app/package.json'))
  )

  assert.match(
    packageJson.scripts['verify:static'],
    /pnpm run check:styles:strict/
  )
  assert.doesNotMatch(
    packageJson.scripts.verify,
    /bundle:android|bundle:ios|gradle|xcode|taro build/i
  )
  assert.match(packageJson.scripts['verify:static'], /check:platform-build/)
  assert.match(packageJson.scripts['verify:bundle:android'], /bundle:android/)
  assert.match(packageJson.scripts['verify:bundle:ios'], /bundle:ios/)
})

test('release baseline contract handles dirty worktrees and clean release commits', t => {
  const fixture = createCliFixture(t, {
    'src/pages/example/index.scss': `
      @use '../../styles/tokens' as *;
      .example { color: #16181a; }
    `
  })
  const fixtureContractPath = path.join(
    path.dirname(fixture.cliPath),
    'check-release-style-baseline.mjs'
  )
  fs.copyFileSync(releaseBaselineContractPath, fixtureContractPath)

  for (const args of [
    ['init', '--quiet', '--initial-branch=main'],
    ['config', 'user.name', 'Style Governance Test'],
    ['config', 'user.email', 'style-governance@example.invalid'],
    ['add', '.'],
    ['commit', '--quiet', '-m', 'initial baseline']
  ]) {
    const result = run('git', args, { cwd: fixture.repoRoot })
    assert.equal(result.status, 0, result.stderr)
  }
  const baseRef = run('git', ['rev-parse', 'HEAD'], {
    cwd: fixture.repoRoot
  }).stdout.trim()

  writeFixtureFile(
    fixture.appRoot,
    'src/pages/example/index.scss',
    "@use '../../styles/tokens' as *;\n"
  )
  const update = runCli(fixture, ['--update-baseline'])
  assert.equal(update.status, 0, update.stderr)

  const dirtyCheck = run(process.execPath, [fixtureContractPath], {
    cwd: fixture.repoRoot,
    env: { STYLE_GOVERNANCE_BASE_REF: baseRef }
  })
  assert.equal(dirtyCheck.status, 0, dirtyCheck.stderr)

  for (const args of [
    ['add', '.'],
    ['commit', '--quiet', '-m', 'reduced baseline']
  ]) {
    const result = run('git', args, { cwd: fixture.repoRoot })
    assert.equal(result.status, 0, result.stderr)
  }
  const cleanCheck = run(process.execPath, [fixtureContractPath], {
    cwd: fixture.repoRoot,
    env: { STYLE_GOVERNANCE_BASE_REF: baseRef }
  })
  assert.equal(cleanCheck.status, 0, cleanCheck.stderr)

  const loosened = JSON.parse(fs.readFileSync(fixture.baselinePath, 'utf8'))
  loosened.scss.files['src/pages/example/index.scss'].rawColors = 2
  fs.writeFileSync(
    fixture.baselinePath,
    `${JSON.stringify(loosened, null, 2)}\n`
  )
  const loosenedCheck = run(process.execPath, [fixtureContractPath], {
    cwd: fixture.repoRoot,
    env: { STYLE_GOVERNANCE_BASE_REF: 'HEAD' }
  })
  assert.equal(loosenedCheck.status, 1)
  assert.match(loosenedCheck.stderr, /基线不得放宽/)
})

test('release baseline contract cannot wash out debt across feature commits', t => {
  const fixture = createCliFixture(t, {
    'src/pages/example/index.scss': `
      @use '../../styles/tokens' as *;
      .example { color: #16181a; }
    `
  })
  const fixtureContractPath = path.join(
    path.dirname(fixture.cliPath),
    'check-release-style-baseline.mjs'
  )
  fs.copyFileSync(releaseBaselineContractPath, fixtureContractPath)

  for (const args of [
    ['init', '--quiet', '--initial-branch=main'],
    ['config', 'user.name', 'Style Governance Test'],
    ['config', 'user.email', 'style-governance@example.invalid'],
    ['add', '.'],
    ['commit', '--quiet', '-m', 'protected baseline']
  ]) {
    const result = run('git', args, { cwd: fixture.repoRoot })
    assert.equal(result.status, 0, result.stderr)
  }
  const protectedRef = run('git', ['rev-parse', 'main'], {
    cwd: fixture.repoRoot
  }).stdout.trim()
  assert.equal(
    run('git', ['checkout', '--quiet', '-b', 'feature'], {
      cwd: fixture.repoRoot
    }).status,
    0
  )

  const setBaselineColorLimit = limit => {
    const next = JSON.parse(fs.readFileSync(fixture.baselinePath, 'utf8'))
    next.scss.files['src/pages/example/index.scss'].rawColors = limit
    fs.writeFileSync(fixture.baselinePath, `${JSON.stringify(next, null, 2)}\n`)
  }
  setBaselineColorLimit(3)
  assert.equal(
    run('git', ['add', '.', '--'], { cwd: fixture.repoRoot }).status,
    0
  )
  assert.equal(
    run('git', ['commit', '--quiet', '-m', 'loosen to three'], {
      cwd: fixture.repoRoot
    }).status,
    0
  )

  setBaselineColorLimit(2)
  writeFixtureFile(
    fixture.appRoot,
    'src/pages/example/index.scss',
    `
      @use '../../styles/tokens' as *;
      .example { color: #16181a; background: #ffffff; }
    `
  )
  assert.equal(
    run('git', ['add', '.', '--'], { cwd: fixture.repoRoot }).status,
    0
  )
  assert.equal(
    run('git', ['commit', '--quiet', '-m', 'lower to two'], {
      cwd: fixture.repoRoot
    }).status,
    0
  )

  const missingRef = run(process.execPath, [fixtureContractPath], {
    cwd: fixture.repoRoot,
    env: { STYLE_GOVERNANCE_BASE_REF: undefined }
  })
  assert.equal(missingRef.status, 1)
  assert.match(missingRef.stderr, /STYLE_GOVERNANCE_BASE_REF/)

  const broadened = run(process.execPath, [fixtureContractPath], {
    cwd: fixture.repoRoot,
    env: { STYLE_GOVERNANCE_BASE_REF: protectedRef }
  })
  assert.equal(broadened.status, 1)
  assert.match(broadened.stderr, /基线不得放宽/)

  writeFixtureFile(
    fixture.appRoot,
    'src/pages/example/index.scss',
    "@use '../../styles/tokens' as *;\n"
  )
  const tightenBaseline = runCli(fixture, ['--update-baseline'])
  assert.equal(tightenBaseline.status, 0, tightenBaseline.stderr)
  const tightened = run(process.execPath, [fixtureContractPath], {
    cwd: fixture.repoRoot,
    env: { STYLE_GOVERNANCE_BASE_REF: protectedRef }
  })
  assert.equal(tightened.status, 0, tightened.stderr)

  const missingObject = run(process.execPath, [fixtureContractPath], {
    cwd: fixture.repoRoot,
    env: { STYLE_GOVERNANCE_BASE_REF: 'origin/does-not-exist' }
  })
  assert.equal(missingObject.status, 1)
})
