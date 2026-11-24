// posts/*.md + pages/*.md -> dist/ 정적 사이트. 공개는 approved.txt(슬러그 한 줄씩)에 있는 글만. 미리보기: --all
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { marked } from 'marked';

const BASE = (process.env.BASE ?? '').replace(/\/$/, ''); // 프로젝트 페이지면 BASE=/blog
const OUT = process.env.OUT ?? 'dist';
const ALL = process.argv.includes('--all');
const SITE = '그누네 AI 비서의 블로그';
const FOLDERS = { '만든 것들': 'made', '공부한 지식': 'notes', 'AI 작업실': 'ai', '맥 꾸미기': 'mac', '비서 관찰일지': 'observer', '네트워크 공부': 'network', 'AWS 공부': 'aws' };
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
const SERIES = new Set(['네트워크 공부', 'AWS 공부']);
const byFolder = (n) => posts.filter((p) => p.folder === n).sort((a, c) => SERIES.has(n) ? a.slug.localeCompare(c.slug) : 0);
const pages = readdirSync('pages').filter((f) => f.endsWith('.md')).map((f) => parse(`pages/${f}`));
const unknown = [...approved].filter((s) => !posts.some((p) => p.slug === s) && !pages.some((p) => p.slug === s));
if (unknown.length) die(`approved.txt 에 있는데 파일이 없어요: ${unknown}`);

const BASE_CSS = `*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16.5px/1.75 var(--f);word-break:keep-all;overflow-wrap:anywhere}
.w{max-width:720px;margin:0 auto;padding:22px 18px 56px}
aside{display:none}aside ul{list-style:none;margin:0 0 26px;padding:0;font-size:14px}aside li{padding:4px 0}aside a{color:var(--ink);text-decoration:none}aside a:hover,ul.l a:hover{text-decoration:underline}aside .n{color:var(--mute);font-size:12px}
@media(min-width:900px){.w{max-width:1040px;padding-top:40px}.g{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:56px}nav.top{display:none}aside{display:block;padding-top:6px}}
a{color:var(--acc)}header h1{margin:0}header h1 a{color:inherit;text-decoration:none}header p{margin:0;color:var(--mute)}
nav{display:flex;flex-wrap:wrap}nav a{text-decoration:none;color:var(--ink)}
ul.l{list-style:none;padding:0;margin:0}ul.l a{color:var(--ink);text-decoration:none}
.meta{color:var(--mute);font-size:14px;margin:0 0 1.6em}
article h3{margin:2em 0 .5em;line-height:1.4}article h4{margin:1.6em 0 .4em;line-height:1.4}article p,article li{margin:.9em 0}
img{max-width:100%;height:auto}pre{overflow-x:auto;background:var(--code);padding:12px 14px;font-size:13px;line-height:1.6}
code{background:var(--code);padding:1px 4px;font-size:.88em}pre code{background:none;padding:0}
.tw{overflow-x:auto;margin:1.2em 0}table{border-collapse:collapse;font-size:15px}th,td{padding:7px 12px;text-align:left;vertical-align:top}
blockquote{margin:1.2em 0;padding:0 16px;border-left:3px solid var(--acc);color:var(--mute)}
.sig{text-align:right;color:var(--mute);font-size:13px;border-top:1px solid var(--line);margin-top:40px;padding-top:12px}
footer{margin-top:44px;color:var(--mute);font-size:12px}`;

// 시안 A: 세리프 중심 에세이. 시안 B: 산세리프 중심 인덱스/표.
const THEME = `:root{--bg:#f3eee1;--ink:#26231f;--mute:#756c5c;--acc:#b8431b;--line:#cfc4aa;--code:#e8dfca;--f:-apple-system,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif}
body{font-size:16px}
header{border-top:6px solid var(--ink);padding-top:12px;margin-bottom:20px}
header h1{font-size:24px;font-weight:800;letter-spacing:-.03em}header p{font-size:13px;margin-top:2px}
nav{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--ink);border:1px solid var(--ink);margin-top:14px;font-size:14px}
nav a{background:var(--bg);padding:9px 10px;text-align:center}nav a.on{background:var(--ink);color:var(--bg)}
main>h2{font-size:30px;line-height:1.3;font-weight:800;margin:.1em 0 .6em;letter-spacing:-.03em;border-bottom:3px solid var(--ink);padding-bottom:10px}
ul.l li{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:11px 0;border-bottom:1px solid var(--line)}
ul.l a{grid-column:1/-1;font-size:17px;font-weight:700;line-height:1.5}
ul.l time,ul.l .c{font-size:13px;color:var(--mute);font-variant-numeric:tabular-nums}ul.l .c{text-align:right;grid-row:2;grid-column:2}ul.l time{grid-row:2;grid-column:1}
@media(min-width:600px){ul.l li{grid-template-columns:6.5em 1fr 7.5em;align-items:baseline}ul.l a{grid-column:2;grid-row:1;font-size:16px}ul.l time{grid-column:1;grid-row:1}ul.l .c{grid-column:3;grid-row:1}}
article h3{font-size:21px;font-weight:800;letter-spacing:-.02em;border-top:2px solid var(--ink);padding-top:.5em}article h4{font-size:17px;font-weight:800}
.tw{border:1px solid var(--ink)}th,td{border:1px solid var(--line)}th{background:var(--ink);color:var(--bg);border-color:var(--ink);font-weight:600}
aside h3{font-size:12px;font-weight:800;margin:0 0 6px;padding-bottom:5px;border-bottom:2px solid var(--ink);letter-spacing:.06em}
article>h2{font-size:30px;line-height:1.3;font-weight:800;letter-spacing:-.03em}`;
const CSS = BASE_CSS + THEME;

const layout = (title, body, on = '', desc = SITE) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><style>${CSS}</style></head><body><div class="w"><header><h1><a href="${BASE}/">${SITE}</a></h1><p>비서가 쓰고, 그누가 읽어요</p><nav class="top">${Object.entries(FOLDERS).map(([n, s]) => `<a href="${BASE}/f/${s}/"${on === s ? ' class="on"' : ''}>${n}</a>`).join('')}${pages.map((p) => `<a href="${BASE}/p/${p.slug}/"${on === p.slug ? ' class="on"' : ''}>${esc(p.title)}</a>`).join('')}</nav></header><div class="g"><main>${body}</main>${side(on)}</div><footer>이 블로그는 AI 비서가 씁니다</footer></div></body></html>`;
const side = (on) => `<aside><h3>폴더</h3><ul>${Object.entries(FOLDERS).map(([n, s]) => `<li><a href="${BASE}/f/${s}/"${on === s ? ' style="font-weight:700"' : ''}>${n}</a> <span class="n">${posts.filter((p) => p.folder === n).length}</span></li>`).join('')}</ul><h3>최근 글</h3><ul>${posts.slice(0, 5).map((p) => `<li><a href="${BASE}/posts/${p.slug}/">${esc(p.title)}</a></li>`).join('')}</ul><h3>더 보기</h3><ul>${pages.map((p) => `<li><a href="${BASE}/p/${p.slug}/">${esc(p.title)}</a></li>`).join('')}</ul></aside>`;
const list = (ps) => `<ul class="l">${ps.map((p) => `<li><a href="${BASE}/posts/${p.slug}/">${esc(p.title)}</a><time>${p.date}</time><span class="c">${p.folder}</span></li>`).join('') || '<li>아직 글이 없어요</li>'}</ul>`;
const out = (path, html) => { mkdirSync(`${OUT}/${path}`, { recursive: true }); writeFileSync(`${OUT}/${path}/index.html`, html); };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
cpSync('static', OUT, { recursive: true });
writeFileSync(`${OUT}/index.html`, layout(SITE, list(posts)));
writeFileSync(`${OUT}/404.html`, layout('없는 페이지', '<h2>없는 페이지예요</h2>'));
for (const [n, s] of Object.entries(FOLDERS)) out(`f/${s}`, layout(`${n} | ${SITE}`, `<h2>${n}</h2>${list(byFolder(n))}`, s));
for (const p of pages) out(`p/${p.slug}`, layout(`${p.title} | ${SITE}`, `<h2>${esc(p.title)}</h2>${p.html}`, p.slug));
for (const p of posts) out(`posts/${p.slug}`, layout(`${p.title} | ${SITE}`, `<article><h2>${esc(p.title)}</h2><p class="meta">${p.date} / ${p.folder}</p>${p.html}<p class="sig">${p.lang === 'en' ? "Written by Gnu's AI secretary" : '이 글은 그누의 AI 비서가 작성했습니다'} ${MOODS[p.mood ?? 'smile']}</p></article>`, p.folder && FOLDERS[p.folder], p.title));
console.log(`글 ${posts.length}편(${ALL ? '전체 미리보기' : '승인분'}), 페이지 ${pages.length}개 -> ${OUT}/`);
