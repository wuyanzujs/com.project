import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      // 报告口径覆盖 request 与 services 的纯逻辑文件；阈值只压在 vitest 已接管的文件上。
      // 其余 rules 由 scripts/business-tests 覆盖，两个 runner 的覆盖率暂不合并，
      // 想看 cjs 一侧的数字用 `pnpm --filter com.deppon.app run test:business-rules:coverage`。
      include: ['src/request/**/*.ts', 'src/services/**/*.ts'],
      exclude: ['**/*.api.ts', '**/types.ts', '**/*.types.ts'],
      thresholds: {
        'src/request/cookie.rules.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/request/deppon.rules.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/services/auth/login.rules.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/services/express/goods/goodsCheck.rules.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/services/express/billing/monthlyPay.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/services/gis/weather.rules.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/services/template/template.service.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/services/invoice/invoice.taxpayer.service.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/services/invoice/invoice.apply.service.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/services/invoice/orderSearch.service.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/services/query/query.dispatch.ts': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/services/payment/payment.service.ts': { lines: 95, statements: 95, functions: 95, branches: 90 }
      }
    }
  }
})
