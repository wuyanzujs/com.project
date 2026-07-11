import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const runtimeArtifacts = {
  android: [
    'android/app/src/main/assets/index.android.bundle',
    'android/app/src/main/assets/index.android.map',
    'dist/sourcemaps/index.android.map'
  ],
  ios: ['ios/main.jsbundle', 'ios/main.map', 'dist/sourcemaps/main.ios.map']
}

const platform = process.argv[2]
const relativePaths = runtimeArtifacts[platform]

if (!relativePaths) {
  console.error('Usage: node scripts/prepare-runtime-bundle.mjs <android|ios>')
  process.exit(1)
}

for (const relativePath of relativePaths) {
  rmSync(path.join(process.cwd(), relativePath), { force: true })
}

mkdirSync(path.join(process.cwd(), 'dist/sourcemaps'), { recursive: true })
