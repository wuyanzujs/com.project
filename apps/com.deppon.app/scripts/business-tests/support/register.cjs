const { existsSync, readFileSync } = require('node:fs')
const { registerHooks } = require('node:module')
const path = require('node:path')
const { fileURLToPath, pathToFileURL } = require('node:url')
const ts = require('typescript')

const appRoot = path.resolve(__dirname, '../../..')
const srcRoot = path.join(appRoot, 'src')
const taroMockURL = pathToFileURL(path.join(__dirname, 'taro.cjs')).href

globalThis.__APP_RUNTIME_CONFIG__ = require('./runtime-config.cjs')

// Use Node's public hooks instead of patching Module._resolveFilename.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@tarojs/taro') {
      return { url: taroMockURL, format: 'commonjs', shortCircuit: true }
    }

    if (
      specifier.startsWith('@/') ||
      (specifier.startsWith('.') && context.parentURL?.startsWith('file:'))
    ) {
      const base = specifier.startsWith('@/')
        ? path.join(srcRoot, specifier.slice(2))
        : path.resolve(
            path.dirname(fileURLToPath(context.parentURL)),
            specifier
          )
      const target = [
        `${base}.ts`,
        `${base}.tsx`,
        path.join(base, 'index.ts')
      ].find(existsSync)

      if (!target && specifier.startsWith('@/')) {
        throw new Error(`Unknown application import: ${specifier}`)
      }

      if (target) {
        return {
          url: pathToFileURL(target).href,
          format: 'commonjs',
          shortCircuit: true
        }
      }
    }

    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url)) {
      const fileName = fileURLToPath(url)

      if (fileName.startsWith(`${srcRoot}${path.sep}`)) {
        const result = ts.transpileModule(readFileSync(fileName, 'utf8'), {
          fileName,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactNative,
            esModuleInterop: true,
            sourceMap: false
          }
        })

        return {
          source: result.outputText,
          format: 'commonjs',
          shortCircuit: true
        }
      }
    }

    return nextLoad(url, context)
  }
})
