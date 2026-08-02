#!/usr/bin/env node
// run.cjs — 一键串起 ③enrich → ④validate → ⑤emit →（可选 ⑥audio）
// 用法: node pipeline/run.cjs <bookId> [--audio] [--force]
const { execSync } = require('child_process')
const path = require('path')

const bookId = process.argv[2]
const audio = process.argv.includes('--audio')
const force = process.argv.includes('--force')
if (!bookId) { console.error('用法: node pipeline/run.cjs <bookId> [--audio] [--force]'); process.exit(1) }

const here = path.join(__dirname)
function run(script) {
  const cmd = `node ${path.join(here, script)} ${bookId}${force ? ' --force' : ''}`
  console.log('\n$ ' + cmd)
  execSync(cmd, { stdio: 'inherit' })
}

try {
  run('03_enrich.cjs')
  run('04_validate.cjs') // validate 失败会抛错，自动中断
  run('05_emit.cjs')
  if (audio) run('06_audio.cjs')
  console.log('\n✅ 流水线完成。' + (audio ? '' : ' 如需语音再运行：node pipeline/06_audio.cjs ' + bookId))
  console.log('下一步：npm run build 验证，然后 git 提交并推送到 Vercel 自动部署。')
} catch (e) {
  console.error('\n❌ 流水线在上方步骤中断。请修正后重跑。')
  process.exit(1)
}
