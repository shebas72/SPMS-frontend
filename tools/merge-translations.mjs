import { readFileSync, writeFileSync } from 'node:fs'

const [lang, file] = process.argv.slice(2)
if (!lang || !file) {
  console.error('Usage: node tools/merge-translations.mjs <lang> <file.json>')
  process.exit(1)
}

const target = `src/i18n/locales/${lang}/translation.json`
const current = JSON.parse(readFileSync(target, 'utf8'))
const incoming = JSON.parse(readFileSync(file, 'utf8'))
let added = 0

const merge = (to, from) => {
  for (const [key, value] of Object.entries(from)) {
    const isObject = value && typeof value === 'object' && !Array.isArray(value)
    if (isObject) {
      if (key in to && (typeof to[key] !== 'object' || to[key] === null)) continue // keep an existing text
      to[key] = to[key] ?? {}
      merge(to[key], value)
    } else if (!(key in to)) {
      to[key] = value
      added++
    }
  }
}

merge(current, incoming)
writeFileSync(target, JSON.stringify(current, null, 2) + '\n')
console.log(`Added ${added} key(s) to ${target}`)