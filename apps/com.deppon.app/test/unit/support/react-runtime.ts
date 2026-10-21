type HookDeps = readonly unknown[] | undefined

interface EffectSlot {
  cleanup?: () => void
  deps?: HookDeps
}

interface MemoSlot {
  deps?: HookDeps
  value: unknown
}

function depsChanged(previous: HookDeps, next: HookDeps) {
  if (!previous || !next || previous.length !== next.length) {
    return true
  }

  return next.some((value, index) => !Object.is(value, previous[index]))
}

function createReactRuntime() {
  const values: unknown[] = []
  const effects: EffectSlot[] = []
  let cursor = 0

  const react = {
    useState<TValue>(initial: TValue | (() => TValue)) {
      const index = cursor++

      if (!(index in values)) {
        values[index] = typeof initial === 'function' ? (initial as () => TValue)() : initial
      }

      return [
        values[index] as TValue,
        (next: TValue | ((previous: TValue) => TValue)) => {
          values[index] = typeof next === 'function' ? (next as (previous: TValue) => TValue)(values[index] as TValue) : next
        }
      ] as const
    },
    useRef<TValue>(initial: TValue) {
      const index = cursor++

      if (!(index in values)) {
        values[index] = { current: initial }
      }

      return values[index] as { current: TValue }
    },
    useMemo<TValue>(factory: () => TValue, deps?: HookDeps) {
      const index = cursor++
      const previous = values[index] as MemoSlot | undefined

      if (!previous || depsChanged(previous.deps, deps)) {
        values[index] = { deps, value: factory() }
      }

      return (values[index] as MemoSlot).value as TValue
    },
    useCallback<TValue>(callback: TValue) {
      return callback
    },
    useEffect(effect: () => void | (() => void), deps?: HookDeps) {
      const index = cursor++
      const previous = effects[index]

      if (!previous || depsChanged(previous.deps, deps)) {
        previous?.cleanup?.()
        const cleanup = effect()

        effects[index] = { cleanup: typeof cleanup === 'function' ? cleanup : undefined, deps }
      }
    }
  }

  return {
    react,
    render<TValue>(callback: () => TValue): TValue {
      cursor = 0
      return callback()
    },
    reset() {
      effects.forEach(slot => slot.cleanup?.())
      effects.length = 0
      values.length = 0
      cursor = 0
    }
  }
}

export const reactRuntime = createReactRuntime()

export function findElement(node: unknown, predicate: (element: any) => boolean): any {
  if (!node || typeof node !== 'object') {
    return undefined
  }

  if (predicate(node)) {
    return node
  }

  return [(node as { props?: { children?: unknown } }).props?.children]
    .flat(Infinity)
    .map(child => findElement(child, predicate))
    .find(Boolean)
}

export function findAllElements(node: unknown, predicate: (element: any) => boolean): any[] {
  if (!node || typeof node !== 'object') {
    return []
  }

  const matches = predicate(node) ? [node] : []

  return [...matches, ...[(node as { props?: { children?: unknown } }).props?.children].flat(Infinity).flatMap(child => findAllElements(child, predicate))]
}

export function textOf(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(textOf).join('')
  }

  if (!node || typeof node !== 'object') {
    return ''
  }

  return textOf((node as { props?: { children?: unknown } }).props?.children)
}
