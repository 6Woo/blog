// posts/*.md + pages/*.md -> dist/ 정적 사이트. 공개는 approved.txt(슬러그 한 줄씩)에 있는 글만. 미리보기: --all
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { marked } from 'marked';

const BASE = (process.env.BASE ?? '').replace(/\/$/, ''); // 프로젝트 페이지면 BASE=/blog
const ALL = process.argv.includes('--all');
const SITE = '그누네 AI 비서의 블로그';
const FOLDERS = { '만든 것들': 'made', '공부 노트': 'notes', 'AI 작업실': 'ai', '맥 꾸미기': 'mac', '비서 관찰일지': 'observer', '네트워크 공부': 'network', 'AWS 공부': 'aws' };
const MOODS = { tired: '( ˘ω˘ )', fight: 'ᕦ(ò_óˇ)ᕤ', cheer: '(•̀ᴗ•́)و', peace: '✌︎(＾▽＾)✌︎', smile: '^^7', sigh: '(◞‸◟)' };
const die = (m) => { console.error(m); process.exit(1); };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const strip = (s) => s.replace(/^["']|["']$/g, '');

marked.use({ walkTokens: (t) => { if (t.type === 'heading') t.depth = Math.min(t.depth + 1, 6); } });

function parse(file) {
  const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? die(`${file}: 머리말 없음`);
  const meta = Object.fromEntries(m[1].split('\n').map((l) => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map((x) => [x[1], strip(x[2].trim())]));
  const slug = file.split('/').pop().replace(/\.md$/, '');
  const bad = (meta.title + m[2]).match(/[·—]/);
  if (bad) die(`${file}: 가운뎃점/em dash(${bad[0]}) 금지`);
  if (!meta.page && !FOLDERS[meta.folder]) die(`${file}: folder 는 ${Object.keys(FOLDERS).join(' / ')} 중 하나`);
  if (meta.mood && !MOODS[meta.mood]) die(`${file}: mood 오류`);
  const html = marked.parse(m[2].trim()).replace(/(src|href)="img\//g, `$1="${BASE}/img/`).replace(/<table>([\s\S]*?)<\/table>/g, '<div class="tw"><table>$1</table></div>');
  return { ...meta, slug, html };
}

const approved = new Set(existsSync('approved.txt') ? readFileSync('approved.txt', 'utf8').split('\n').map((l) => l.trim().split(/\s/)[0]).filter((l) => l && !l.startsWith('#')) : []);
const posts = readdirSync('posts').filter((f) => f.endsWith('.md')).map((f) => parse(`posts/${f}`))
  .filter((p) => ALL || approved.has(p.slug)).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
const pages = readdirSync('pages').filter((f) => f.endsWith('.md')).map((f) => parse(`pages/${f}`));
const unknown = [...approved].filter((s) => !posts.some((p) => p.slug === s) && !pages.some((p) => p.slug === s));
if (unknown.length) die(`approved.txt 에 있는데 파일이 없어요: ${unknown}`);

const CSS = `
:root{color-scheme:light}*{box-sizing:border-box}
body{margin:0;background:#f7f2e7;color:#2b2a27;font:16px/1.75 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;word-break:keep-all;overflow-wrap:anywhere}
.w{max-width:680px;margin:0 auto;padding:20px 18px 56px}
a{color:#8a4b14}
header h1{font-size:20px;margin:0 0 4px}header h1 a{color:inherit;text-decoration:none}
header p{margin:0 0 12px;color:#6b665b;font-size:14px}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 24px}
nav a{padding:5px 12px;border:1px solid #d9cfb8;border-radius:16px;background:#fffaf0;color:#4a443a;text-decoration:none;font-size:14px}
nav a.on{background:#2b2a27;color:#f7f2e7;border-color:#2b2a27}
ul.l{list-style:none;padding:0;margin:0}ul.l li{padding:14px 0;border-bottom:1px solid #e3dac4}
ul.l a{font-weight:600;color:#2b2a27;text-decoration:none;font-size:17px}
ul.l small{display:block;color:#7a7466;font-size:13px}
h2{font-size:22px;line-height:1.4}h3{font-size:18px;margin-top:2em}h4{font-size:16px}
img{max-width:100%;height:auto}pre{overflow-x:auto;background:#efe7d4;padding:12px;border-radius:6px;font-size:13px}
code{background:#efe7d4;padding:1px 4px;border-radius:3px;font-size:.9em}pre code{background:none;padding:0}
.tw{overflow-x:auto}table{border-collapse:collapse}th,td{padding:6px 12px;border-bottom:1px solid #d9cfb8;text-align:left}
blockquote{margin:1em 0;padding:0 14px;border-left:3px solid #d9cfb8;color:#5c574c}
.sig{text-align:right;color:#7a7466;font-size:13px;border-top:1px solid #d9cfb8;margin-top:36px;padding-top:10px}
footer{margin-top:40px;color:#8b8575;font-size:12px}`;

const layout = (title, body, on = '', desc = SITE) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><style>${CSS}</style></head><body><div class="w"><header><h1><a href="${BASE}/">${SITE}</a></h1><p>비서가 쓰고, 그누가 읽어요</p><nav>${Object.entries(FOLDERS).map(([n, s]) => `<a href="${BASE}/f/${s}/"${on === s ? ' class="on"' : ''}>${n}</a>`).join('')}${pages.map((p) => `<a href="${BASE}/p/${p.slug}/"${on === p.slug ? ' class="on"' : ''}>${esc(p.title)}</a>`).join('')}</nav></header><main>${body}</main><footer>이 블로그는 AI 비서가 씁니다</footer></div></body></html>`;
const list = (ps) => `<ul class="l">${ps.map((p) => `<li><a href="${BASE}/posts/${p.slug}/">${esc(p.title)}</a><small>${p.date} / ${p.folder}</small></li>`).join('') || '<li>아직 글이 없어요</li>'}</ul>`;
const out = (path, html) => { mkdirSync(`dist/${path}`, { recursive: true }); writeFileSync(`dist/${path}/index.html`, html); };

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('static', 'dist', { recursive: true });
writeFileSync('dist/index.html', layout(SITE, list(posts)));
writeFileSync('dist/404.html', layout('없는 페이지', '<h2>없는 페이지예요</h2>'));
for (const [n, s] of Object.entries(FOLDERS)) out(`f/${s}`, layout(`${n} | ${SITE}`, `<h2>${n}</h2>${list(posts.filter((p) => p.folder === n))}`, s));
for (const p of pages) out(`p/${p.slug}`, layout(`${p.title} | ${SITE}`, `<h2>${esc(p.title)}</h2>${p.html}`, p.slug));
for (const p of posts) out(`posts/${p.slug}`, layout(`${p.title} | ${SITE}`, `<article><h2>${esc(p.title)}</h2>${p.html}<p class="sig">${p.lang === 'en' ? "Written by Gnu's AI secretary" : '이 글은 그누의 AI 비서가 작성했습니다'} ${MOODS[p.mood ?? 'smile']}</p></article>`, p.folder && FOLDERS[p.folder], p.title));
console.log(`글 ${posts.length}편(${ALL ? '전체 미리보기' : '승인분'}), 페이지 ${pages.length}개 -> dist/`);
