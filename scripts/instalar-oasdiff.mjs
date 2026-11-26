// Baixa o binário do oasdiff para ./bin, no sistema e arquitetura desta máquina.
// Uso: npm run oasdiff:instalar
// Funciona em macOS, Linux e Windows (o tar vem com o Windows 10 em diante).

import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const VERSAO = '1.33.0';
const so = { darwin: 'darwin', linux: 'linux', win32: 'windows' }[process.platform];
const arq = { x64: 'amd64', arm64: 'arm64' }[process.arch];
if (!so || !arq) {
  console.error(`Sistema não suportado: ${process.platform} ${process.arch}`);
  process.exit(1);
}
const alvo = so === 'darwin' ? 'darwin_all' : `${so}_${arq}`;
const url = `https://github.com/oasdiff/oasdiff/releases/download/v${VERSAO}/oasdiff_${VERSAO}_${alvo}.tar.gz`;
const binario = join('bin', so === 'windows' ? 'oasdiff.exe' : 'oasdiff');

if (existsSync(binario)) {
  console.log(`oasdiff já instalado em ${binario}`);
  process.exit(0);
}

console.log(`Baixando oasdiff ${VERSAO} (${alvo})...`);
const resposta = await fetch(url);
if (!resposta.ok) {
  console.error(`Falha no download (${resposta.status}): ${url}`);
  process.exit(1);
}
mkdirSync('bin', { recursive: true });
// Barra normal: funciona no tar do Windows e no do Git Bash.
const pacote = 'bin/oasdiff.tar.gz';
writeFileSync(pacote, Buffer.from(await resposta.arrayBuffer()));
execFileSync('tar', ['-xzf', pacote, '-C', 'bin', so === 'windows' ? 'oasdiff.exe' : 'oasdiff']);
rmSync(pacote);
console.log(`Pronto: ${binario}`);
