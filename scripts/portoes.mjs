// Roda todos os portões, um depois do outro, e mostra um placar no fim.
// Uso:
//   npm run portoes                    todos
//   node scripts/portoes.mjs --forma   só os que conferem a forma (usado pelo eval)

import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const soForma = process.argv.includes('--forma');

const portoes = [
  { nome: 'Lint do contrato', script: 'contrato:lint', forma: true },
  { nome: `Breaking change contra ${process.env.CONTRATO_BASE ?? 'a main'}`, script: 'contrato:quebras', forma: true },
  { nome: 'Tipos gerados do contrato', script: 'tipos', forma: true },
  { nome: 'Testes de aceite', script: 'test:aceite', forma: false },
  { nome: 'Conformidade do servidor', script: 'conformidade', forma: true },
].filter((p) => !soForma || p.forma);

const resultados = [];
for (const portao of portoes) {
  console.log(`\n=== ${portao.nome} (npm run ${portao.script})\n`);
  // Um texto só, com shell: o npm do Windows é um .cmd, e lista de argumentos com shell gera o aviso DEP0190.
  const r = spawnSync(`${npm} run --silent ${portao.script}`, { stdio: 'inherit', shell: true });
  resultados.push({ ...portao, passou: r.status === 0 });
}

console.log('\n=== Placar dos portões\n');
for (const r of resultados) console.log(`${r.passou ? 'passou' : 'FALHOU'}  ${r.nome}`);
const falhas = resultados.filter((r) => !r.passou).length;
console.log(falhas ? `\n${falhas} portão(ões) barraram.` : '\nTodos os portões passaram.');
process.exit(falhas ? 1 : 0);
