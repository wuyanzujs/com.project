import stylelint from 'stylelint'

const { report } = stylelint.utils

// Taro RN 不支持伪元素，也不允许 Sass 导入省略 .scss 扩展名。
// 这两条以前住在 check-rn-boundaries.mjs 的正则里，下沉到 stylelint 后编辑器可直接报红。

const PSEUDO_ELEMENT_PATTERN = /::[A-Za-z]/
const KEYFRAMES_NAME_PATTERN = /-?keyframes$/
const SASS_IMPORT_PATTERN = /^['"]([^'"]+)['"]/

function isInsideKeyframes(node) {
  let parent = node.parent

  while (parent) {
    if (parent.type === 'atrule' && KEYFRAMES_NAME_PATTERN.test(parent.name)) {
      return true
    }

    parent = parent.parent
  }

  return false
}

const noPseudoElement = stylelint.createPlugin('app-rn/no-pseudo-element', () => {
  return (root, result) => {
    root.walkRules(rule => {
      if (isInsideKeyframes(rule)) {
        return
      }

      const selectors = rule.selectors ?? [rule.selector]

      if (!selectors.some(selector => PSEUDO_ELEMENT_PATTERN.test(selector))) {
        return
      }

      report({
        message: 'RN 样式不支持伪元素，请给目标元素添加独立语义类',
        node: rule,
        result,
        ruleName: 'app-rn/no-pseudo-element'
      })
    })
  }
})

const sassImportFullFilename = stylelint.createPlugin('app-rn/sass-import-full-filename', () => {
  return (root, result) => {
    root.walkAtRules(/^(?:use|forward)$/i, atRule => {
      const match = atRule.params.trim().match(SASS_IMPORT_PATTERN)

      if (!match) {
        return
      }

      const target = match[1]

      if (target.startsWith('sass:') || target.endsWith('.scss')) {
        return
      }

      report({
        message: 'Sass 导入必须写全 .scss 文件名：Taro RN 构建不解析无扩展名或 partial 路径',
        node: atRule,
        result,
        ruleName: 'app-rn/sass-import-full-filename'
      })
    })
  }
})

export default [noPseudoElement, sassImportFullFilename]
