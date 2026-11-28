import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const game = 'midnight-greenhouse';
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sha = /^[a-f0-9]{40}$/;
if (!sha.test(revision)) throw new Error('Expected the tested checkout SHA.');
const [source, destination, eventPath] = process.argv.slice(2);
if (!source || !destination) throw new Error('Pass an assembled game directory and a destination ZIP path.');

const event = eventPath ? JSON.parse(await readFile(eventPath, 'utf8')) : {};
const head = event.pull_request?.head?.sha ?? revision;
if (!sha.test(head)) throw new Error('Expected the PR head SHA.');
const output = resolve(destination);
const staging = await mkdtemp(join(tmpdir(), 'greenhouse-playtest-'));
try {
  const games = join(staging, 'games');
  await mkdir(games);
  await cp(resolve(source), join(games, game), { recursive: true });
  await writeFile(join(staging, 'index.html'), `<!doctype html>
<html lang="vi">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nhà Kính Sau Nửa Đêm · Chiến dịch</title>
<body style="color:#352a22;background:#fff1c9;font:1rem system-ui;padding:1.5rem">
<h1>Nhà Kính Sau Nửa Đêm</h1>
<p><a style="color:#963d2a" href="./games/midnight-greenhouse/index.html">Chơi chiến dịch</a></p>
<p>Ứng viên <code>${head}</code></p>
</body>
</html>
`);
  await writeFile(join(staging, 'PLAYTEST.txt'), `NHÀ KÍNH SAU NỬA ĐÊM · GH-RETRO-01 V2
PR head: ${head}
Built from: ${revision}

1. Extract this ZIP.
2. Open a terminal in the extracted folder and run:
   python3 -m http.server 8089 --bind 127.0.0.1
   On Windows with the Python launcher, use py -m http.server 8089 --bind 127.0.0.1
3. Open http://127.0.0.1:8089 and select Chơi chiến dịch.
`);
  await mkdir(dirname(output), { recursive: true });
  const archive = join(staging, 'midnight-greenhouse-campaign.zip');
  execFileSync('zip', ['-q', '-r', archive, 'index.html', 'PLAYTEST.txt', 'games'], { cwd: staging });
  await cp(archive, output);
} finally {
  await rm(staging, { recursive: true, force: true });
}
