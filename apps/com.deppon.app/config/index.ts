import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import * as path from 'path'
import devConfig from './dev'
import prodConfig from './prod'
import runtimeBuild from './runtime-build.cjs'

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'webpack5'>(async (merge, { command, mode }) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'com.deppon.app',
    date: '2026-7-6',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: runtimeBuild.createRuntimeDefineConstants(process.env),
    copy: {
      patterns: [
      ],
      options: {
      }
    },
    framework: 'react',
    compiler: 'webpack5',
    alias: {
      '@': path.resolve(__dirname, '..', 'src')
    },
    cache: {
      enable: false // Webpack 持久化缓存配置，建议开启。默认配置请参考：https://docs.taro.zone/docs/config-detail#cache
    },
    rn: {
      appName: 'DepponApp',
      entry: 'app',
      output: {
        ios: './ios/main.jsbundle',
        iosAssetsDest: './ios',
        android: './android/app/src/main/assets/index.android.bundle',
        androidAssetsDest: './android/app/src/main/res',
        // iosSourceMapUrl: '',
        iosSourcemapOutput: './dist/sourcemaps/main.ios.map',
        // iosSourcemapSourcesRoot: '',
        // androidSourceMapUrl: '',
        androidSourcemapOutput: './dist/sourcemaps/index.android.map',
        // androidSourcemapSourcesRoot: '',
      },
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        }
      }
    }
  }
  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
