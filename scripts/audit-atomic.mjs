/**
 * Vérifie que chaque fichier de hooks ne contient pas de mutationFn
 * avec plusieurs opérations d'écriture Supabase séquentielles.
 *
 * Usage : node scripts/audit-atomic.mjs
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HOOKS_DIR = join(__dirname, '..', 'src', 'hooks')
const WRITE_PATTERN = /supabase\s*\.\s*from\s*\([^)]+\)\s*\.(insert|update|delete)\s*\(/g

let violations = 0

for (const file of readdirSync(HOOKS_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
  const src = readFileSync(join(HOOKS_DIR, file), 'utf8')

  // Découpe le fichier en blocs mutationFn (heuristique : tout ce qui est entre mutationFn: async et la prochaine virgule au niveau 0)
  const mutationBlocks = []
  const mutationStart = /mutationFn\s*:/g
  let match
  while ((match = mutationStart.exec(src)) !== null) {
    // Extrait ~400 chars après le début de la mutationFn pour l'analyse
    mutationBlocks.push({ pos: match.index, snippet: src.slice(match.index, match.index + 600) })
  }

  for (const { snippet, pos } of mutationBlocks) {
    const writeOps = [...snippet.matchAll(WRITE_PATTERN)]
    if (writeOps.length >= 2) {
      const lineNum = src.slice(0, pos).split('\n').length
      console.error(`\n❌ VIOLATION — ${file}:${lineNum}`)
      console.error(`   ${writeOps.length} opérations d'écriture Supabase dans un même mutationFn :`)
      writeOps.forEach(m => console.error(`   → .${m[1]}(...)`))
      console.error(`   → Créer une fonction RPC pour rendre cette opération atomique.`)
      violations++
    }
  }
}

if (violations === 0) {
  console.log('✅ audit:atomic — aucune mutation non-atomique détectée')
  process.exit(0)
} else {
  console.error(`\n${violations} violation(s) trouvée(s). Voir ci-dessus.`)
  process.exit(1)
}
