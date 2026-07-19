const esbuild = require('esbuild')
const fs = require('fs')

esbuild.buildSync({
  entryPoints: ['src/utils/chunkSentence.ts'],
  bundle: true,
  format: 'cjs',
  outfile: 'tmp_chunk_bundle.cjs',
  logLevel: 'silent',
})
const { chunkSentence } = require('./tmp_chunk_bundle.cjs')

const data = JSON.parse(fs.readFileSync('hsk5_data.json', 'utf-8'))
const han = (s) => (s.match(/[一-鿿]/g) || []).length

let total = 0, flagged = 0
const issues = []
const allOut = []
let maxChunk = 0
for (const t of data) {
  for (const s of t.sentences) {
    total++
    const chunks = chunkSentence(s.cn, s.split)
    const clen = han(s.cn)
    let prob = []
    for (const c of chunks) {
      const hl = han(c)
      if (hl > maxChunk) maxChunk = hl
      if (hl > 13) prob.push(`TOOLONG(${hl}:${c})`)
      if (hl === 1) prob.push(`SINGLE(${c})`)
    }
    if (clen >= 26 && chunks.length < 4) prob.push(`FEWCHUNKS(${chunks.length}/len${clen})`)
    if (clen <= 10 && chunks.length > 1) prob.push(`OVERSPLIT(${chunks.length})`)
    if (prob.length) {
      flagged++
      issues.push(`[${s.id}] ${s.cn}\n   chunks: ${chunks.join(' | ')}\n   ${prob.join(' ')}`)
    }
    allOut.push(`[${s.id}] ${chunks.join(' / ')}`)
  }
}

fs.writeFileSync('tmp_chunk_all.txt', allOut.join('\n'), 'utf-8')
fs.writeFileSync('tmp_chunk_issues.txt', issues.join('\n\n'), 'utf-8')
console.log(`Total: ${total}, Flagged: ${flagged}, MaxChunkLen: ${maxChunk}`)
console.log(`Issues written to tmp_chunk_issues.txt (${issues.length})`)
console.log(`All chunks written to tmp_chunk_all.txt`)
