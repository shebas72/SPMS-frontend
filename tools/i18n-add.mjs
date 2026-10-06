// Usage (from the project root): node tools/i18n-add.mjs tools/kpi-entry.i18n.json
// Deep-merges { "<lang>": { ... } } into src/i18n/locales/<lang>/translation.json. Existing keys you didn't touch are kept.
import { readFileSync, writeFileSync } from 'node:fs'

const merge = (a, b) => {
  for (const [k, v] of Object.entries(b)) {
    a[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k] && typeof a[k] === 'object' ? a[k] : {}, v) : v
  }
  return a
}
const additions = JSON.parse(readFileSync(process.argv[2], 'utf8'))
for (const [lang, keys] of Object.entries(additions)) {
  const file = `src/i18n/locales/${lang}/translation.json`
  writeFileSync(file, JSON.stringify(merge(JSON.parse(readFileSync(file, 'utf8')), keys), null, 2) + '\n')
  console.log(`updated ${file}`)
}
