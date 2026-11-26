// Roda o oasdiff instalado em ./bin, ou o que estiver no PATH.
// Os argumentos passam direto: node scripts/oasdiff.mjs breaking main:openapi/openapi.yaml openapi/openapi.yaml
// A base da comparação é a main. Para comparar com outra referência, defina CONTRATO_BASE
// (para refazer uma feature que a main já tem, aponte para a tag do ponto de partida, como CONTRATO_BASE=v5.2-inicio).

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const local = join('bin', process.platform === 'win32' ? 'oasdiff.exe' : 'oasdiff');
const comando = existsSync(local) ? local : 'oasdiff';

const base = process.env.CONTRATO_BASE;
const args = process.argv.slice(2).map((a) => (base && a.startsWith('main:') ? `${base}:${a.slice(5)}` : a));

const resultado = spawnSync(comando, args, { stdio: 'inherit' });
if (resultado.error) {
  console.error('oasdiff não encontrado. Rode: npm run oasdiff:instalar');
  process.exit(2);
}
process.exit(resultado.status ?? 1);
