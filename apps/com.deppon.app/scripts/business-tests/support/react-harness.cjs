const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { runInNewContext } = require('node:vm')

const ts = require('typescript')

// 运行真实 hook/页面处理器，替换原生运行时并允许测试控制渲染和异步返回顺序。
function createReactHarness() {
  const values = []
  const cleanups = []
  let cursor = 0

  const react = {
    useState(initial) {
      const index = cursor++
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial
      return [values[index], next => (values[index] = typeof next === 'function' ? next(values[index]) : next)]
    },
    useRef(initial) {
      const index = cursor++
      if (!(index in values)) values[index] = { current: initial }
      return values[index]
    },
    useMemo(factory, deps) {
      const index = cursor++
      const previous = values[index]
      if (!previous || !deps || deps.some((value, offset) => !Object.is(value, previous.deps[offset]))) {
        values[index] = { result: factory(), deps }
      }
      return values[index].result
    },
    useCallback(callback) {
      return callback
    },
    useEffect(effect, deps) {
      const index = cursor++
      const previous = values[index]
      if (!previous || !deps || deps.some((value, offset) => !Object.is(value, previous[offset]))) {
        cleanups[index]?.()
        cleanups[index] = effect()
        values[index] = deps
      }
    }
  }

  return {
    react,
    render(callback) {
      cursor = 0
      return callback()
    },
    unmount() {
      cleanups.forEach(cleanup => cleanup?.())
    }
  }
}

function loadReactModule(relativeFile, imports, globals = {}) {
  const fileName = path.resolve(__dirname, '../../../src', relativeFile)
  const { outputText } = ts.transpileModule(readFileSync(fileName, 'utf8'), {
    fileName,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  })
  const exports = {}
  runInNewContext(outputText, {
    exports,
    setTimeout,
    clearTimeout,
    ...globals,
    require(specifier) {
      assert.ok(Object.hasOwn(imports, specifier), `Unexpected dependency: ${specifier}`)
      return imports[specifier]
    }
  })
  return exports
}

function findElement(element, predicate) {
  if (!element || typeof element !== 'object') return undefined
  if (predicate(element)) return element
  return [element.props?.children]
    .flat(Infinity)
    .map(child => findElement(child, predicate))
    .find(Boolean)
}

module.exports = { createReactHarness, loadReactModule, findElement }
