/**
 * Choose Pexels photos for every spot on the site and pin them in
 * config/photos.json, so the live site never depends on search results.
 *
 *   npm run photos:pick              fill every empty slot (first unused result)
 *   npm run photos:pick -- --all     re-pick every slot
 *   npm run photos:pick -- --list hero       show the top 15 candidates for a slot
 *   npm run photos:pick -- hero 3            pin candidate #3 for a slot
 *   npm run photos:pick -- hero id:1234567   pin a specific Pexels photo id from the list
 *
 * Needs PEXELS_API_KEY in .env. Review the choices on the Pexels pages printed.
 */
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'node:fs'
import { PHOTO_SLOTS, type PhotoSlotKey } from '../config/photo-slots'
import { searchPexels, type Photo } from '../lib/pexels'

const FILE = new URL('../config/photos.json', import.meta.url)
const key = process.env.PEXELS_API_KEY
if (!key) {
  console.error('Set PEXELS_API_KEY in .env first (https://www.pexels.com/api/).')
  process.exit(1)
}

const pins: Record<string, Photo> = JSON.parse(readFileSync(FILE, 'utf8'))
const save = () => writeFileSync(FILE, JSON.stringify(pins, null, 2) + '\n')
const show = (slot: string, p: Photo) => console.log(`  ${slot.padEnd(16)} ${String(p.id).padEnd(9)} ${p.photographer.padEnd(22).slice(0, 22)} ${p.url}`)
const args = process.argv.slice(2)
const isSlot = (s: string): s is PhotoSlotKey => s in PHOTO_SLOTS

if (args[0] === '--list') {
  const slot = args[1]
  if (!isSlot(slot)) throw new Error(`Unknown slot. Try: ${Object.keys(PHOTO_SLOTS).join(', ')}`)
  const results = await searchPexels(PHOTO_SLOTS[slot], key)
  console.log(`\n${slot}: "${PHOTO_SLOTS[slot].query}"\n`)
  results.forEach((p, i) => console.log(`  #${String(i).padEnd(3)} id:${String(p.id).padEnd(9)} ${p.alt.slice(0, 60).padEnd(60)} ${p.url}`))
  console.log(`\nPin one with: npm run photos:pick -- ${slot} <#number | id:NNN>\n`)
} else if (args[0] && isSlot(args[0])) {
  const slot = args[0]
  const results = await searchPexels(PHOTO_SLOTS[slot], key, 40)
  const choice = args[1]?.startsWith('id:') ? results.find((p) => String(p.id) === args[1].slice(3)) : results[Number(args[1] ?? 0)]
  if (!choice) throw new Error('No such candidate. Run with --list to see options.')
  pins[slot] = choice
  save()
  console.log('Pinned:')
  show(slot, choice)
} else {
  const all = args.includes('--all')
  const used = new Set(Object.entries(pins).filter(([s]) => !all || !isSlot(s)).map(([, p]) => p.id))
  console.log('\nPicking photos…\n')
  for (const slot of Object.keys(PHOTO_SLOTS) as PhotoSlotKey[]) {
    if (pins[slot] && !all) {
      show(slot, pins[slot])
      continue
    }
    const results = await searchPexels(PHOTO_SLOTS[slot], key)
    const choice = results.find((p) => !used.has(p.id))
    if (!choice) {
      console.log(`  ${slot.padEnd(16)} no results for "${PHOTO_SLOTS[slot].query}"`)
      continue
    }
    used.add(choice.id)
    pins[slot] = choice
    show(slot, choice)
  }
  save()
  console.log('\nSaved to config/photos.json. Open the links to review; swap any with --list and a slot name.\n')
}
