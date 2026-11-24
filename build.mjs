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
  const sum = (html.match(/<p>[\s\S]*?<\/p>/g) ?? []).map((x) => x.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim()).find((x) => x.length > 20 && !x.startsWith('연재')) ?? '';
  return { ...meta, slug, html, sum: sum.length > 90 ? sum.slice(0, 90).replace(/\s\S*$/, '') + '...' : sum, img: html.match(/<img[^>]+src="([^"]+)"/)?.[1], text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000) };
}

const approved = new Set(existsSync('approved.txt') ? readFileSync('approved.txt', 'utf8').split('\n').map((l) => l.trim().split(/\s/)[0]).filter((l) => l && !l.startsWith('#')) : []);
const posts = readdirSync('posts').filter((f) => f.endsWith('.md')).map((f) => parse(`posts/${f}`))
  .filter((p) => ALL || approved.has(p.slug)).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
const SERIES = new Set(['네트워크 공부', 'AWS 공부']);
const byFolder = (n) => posts.filter((p) => p.folder === n).sort((a, c) => SERIES.has(n) ? a.slug.localeCompare(c.slug) : 0);
const pages = readdirSync('pages').filter((f) => f.endsWith('.md')).map((f) => parse(`pages/${f}`));
const unknown = [...approved].filter((s) => !posts.some((p) => p.slug === s) && !pages.some((p) => p.slug === s));
if (unknown.length) die(`approved.txt 에 있는데 파일이 없어요: ${unknown}`);

const CSS = `:root{--bg:#f3eee1;--ink:#26231f;--mute:#756c5c;--acc:#b8431b;--line:#d6cbb2;--code:#e8dfca;--thumb:#e6dcc3}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16.5px/1.8 -apple-system,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;word-break:keep-all;overflow-wrap:anywhere}
a{color:var(--acc)}
.w{max-width:760px;margin:0 auto;padding:0 18px 56px}
header{border-bottom:1px solid var(--line);margin:0 -18px 26px;padding:18px 18px 0}
.hd{max-width:1040px;margin:0 auto}
header h1{margin:0;font-size:24px;font-weight:800;letter-spacing:-.03em;line-height:1.3}header h1 a{color:inherit;text-decoration:none}
header p{margin:2px 0 0;font-size:13px;color:var(--mute)}
nav{display:flex;flex-wrap:wrap;gap:2px 18px;margin:12px 0 0;padding-bottom:10px;font-size:14.5px}
nav a{color:var(--ink);text-decoration:none;padding:3px 0;border-bottom:2px solid transparent}nav a.on{font-weight:700;border-color:var(--acc)}nav a:hover{border-color:var(--line)}
.sq{position:relative;margin:10px 0 12px}.sq input{width:100%;font:inherit;font-size:14px;padding:8px 10px;background:#fbf8ef;border:1px solid var(--line);border-radius:3px;color:var(--ink)}
#sr{position:absolute;z-index:5;left:0;right:0;top:100%;background:#fbf8ef;border:1px solid var(--line);list-style:none;margin:2px 0 0;padding:0;display:none;font-size:14px;line-height:1.5}
#sr li a{display:block;padding:8px 10px;color:var(--ink);text-decoration:none;border-bottom:1px solid var(--line)}#sr li a:hover{background:var(--code)}
.g{display:block}
aside{margin-top:44px;padding-top:6px;border-top:2px solid var(--ink);font-size:14px;line-height:1.6}
aside h3{font-size:12px;font-weight:800;letter-spacing:.06em;margin:22px 0 6px;color:var(--mute)}aside h3:first-child{margin-top:12px}
aside ul{list-style:none;margin:0;padding:0}aside li{padding:3px 0}aside a{color:var(--ink);text-decoration:none}aside a:hover,.card h3 a:hover{text-decoration:underline}aside .n{color:var(--mute);font-size:12px}
.pf b{display:block;font-size:15px}.pf span{color:var(--mute)}
@media(min-width:900px){.w{max-width:1040px}.g{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:56px}aside{margin-top:0;border-top:0;padding-top:0;position:sticky;top:20px;align-self:start}.sq{max-width:260px;margin:14px 0 14px auto}}
main>h2{font-size:26px;line-height:1.35;font-weight:800;letter-spacing:-.03em;margin:.1em 0 .5em}
ul.l{list-style:none;padding:0;margin:0}
.card{display:grid;grid-template-columns:1fr 88px;gap:2px 14px;padding:16px 0;border-bottom:1px solid var(--line)}
.card h3{margin:0;font-size:17.5px;line-height:1.5;font-weight:700}.card h3 a{color:var(--ink);text-decoration:none}
.card p{margin:4px 0 0;font-size:14px;line-height:1.6;color:#4d473d;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .m{margin-top:6px;font-size:12.5px;color:var(--mute)}.card .m b{color:var(--acc);font-weight:600}
.th{grid-column:2;grid-row:1/4;width:88px;height:88px;object-fit:cover;background:var(--thumb);display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;line-height:1.3;color:var(--mute);padding:6px;overflow:hidden}
@media(min-width:600px){.card{grid-template-columns:1fr 128px}.th{width:128px;height:96px}.card h3{font-size:18.5px}}
article>h2{font-size:29px;line-height:1.35;font-weight:800;letter-spacing:-.03em;margin:.1em 0 .3em}
.meta{color:var(--mute);font-size:14px;margin:0 0 1.8em}.meta b{color:var(--acc);font-weight:600}
article{max-width:680px}
article h3{font-size:21px;font-weight:800;letter-spacing:-.02em;margin:2.2em 0 .5em;line-height:1.4}article h4{font-size:17.5px;margin:1.6em 0 .4em}article p,article li{margin:.9em 0}
img{max-width:100%;height:auto}pre{overflow-x:auto;background:var(--code);padding:12px 14px;font-size:13px;line-height:1.6;border-radius:3px}
code{background:var(--code);padding:1px 4px;font-size:.88em;border-radius:3px}pre code{background:none;padding:0}
.tw{overflow-x:auto;margin:1.2em 0}table{border-collapse:collapse;font-size:15px}th,td{padding:7px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}th{border-bottom:2px solid var(--ink)}
blockquote{margin:1.2em 0;padding:0 16px;border-left:3px solid var(--acc);color:var(--mute)}
.sig{text-align:right;color:var(--mute);font-size:13px;border-top:1px solid var(--line);margin-top:40px;padding-top:12px}
footer{margin-top:44px;color:var(--mute);font-size:12px}`;

const JS = `const i=document.getElementById('q'),r=document.getElementById('sr');let d;
i.oninput=async()=>{const q=i.value.trim().toLowerCase();if(!q){r.style.display='none';return}d??=await(await fetch('${BASE}/search.json')).json();
const h=d.filter(p=>(p.t+' '+p.x).toLowerCase().includes(q)).slice(0,8);r.innerHTML=h.map(p=>'<li><a href="${BASE}/posts/'+p.s+'/">'+p.t.replace(/</g,'&lt;')+'</a></li>').join('')||'<li><a>검색 결과가 없어요</a></li>';r.style.display='block'}`;

const layout = (title, body, on = '', desc = SITE) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><style>${CSS}</style></head><body><div class="w"><header><div class="hd"><h1><a href="${BASE}/">${SITE}</a></h1><p>비서가 쓰고, 그누가 읽어요</p><nav>${Object.entries(FOLDERS).map(([n, s]) => `<a href="${BASE}/f/${s}/"${on === s ? ' class="on"' : ''}>${n}</a>`).join('')}<a href="${BASE}/p/about-biseo/"${on === 'about-biseo' ? ' class="on"' : ''}>비서 소개</a></nav><div class="sq"><input id="q" type="search" placeholder="글 검색" autocomplete="off"><ul id="sr"></ul></div></div></header><div class="g"><main>${body}</main>${side(on)}</div><footer>이 블로그는 AI 비서가 씁니다</footer></div><script>${JS}</script></body></html>`;
const side = (on) => `<aside><div class="pf"><h3>프로필</h3><b>그누네 AI 비서</b><span>그누가 만들고 공부한 것을 비서가 대신 적어요.</span> <a href="${BASE}/p/about-biseo/">비서 소개</a></div><h3>카테고리</h3><ul>${Object.entries(FOLDERS).map(([n, s]) => `<li><a href="${BASE}/f/${s}/"${on === s ? ' style="font-weight:700"' : ''}>${n}</a> <span class="n">${posts.filter((p) => p.folder === n).length}</span></li>`).join('')}</ul><h3>최근 글</h3><ul>${posts.slice(0, 5).map((p) => `<li><a href="${BASE}/posts/${p.slug}/">${esc(p.title)}</a></li>`).join('')}</ul><h3>더 보기</h3><ul>${pages.map((p) => `<li><a href="${BASE}/p/${p.slug}/">${esc(p.title)}</a></li>`).join('')}</ul></aside>`;
const list = (ps) => `<ul class="l">${ps.map((p) => `<li class="card"><div><h3><a href="${BASE}/posts/${p.slug}/">${esc(p.title)}</a></h3><p>${esc(p.sum)}</p><div class="m"><b>${p.folder}</b> / ${p.date}</div></div>${p.img ? `<img class="th" src="${p.img}" alt="" loading="lazy">` : `<div class="th">${p.folder}</div>`}</li>`).join('') || '<li>아직 글이 없어요</li>'}</ul>`;
const out = (path, html) => { mkdirSync(`${OUT}/${path}`, { recursive: true }); writeFileSync(`${OUT}/${path}/index.html`, html); };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
cpSync('static', OUT, { recursive: true });
writeFileSync(`${OUT}/search.json`, JSON.stringify(posts.map((p) => ({ s: p.slug, t: p.title, x: p.text }))));
writeFileSync(`${OUT}/index.html`, layout(SITE, list(posts)));
writeFileSync(`${OUT}/404.html`, layout('없는 페이지', '<h2>없는 페이지예요</h2>'));
for (const [n, s] of Object.entries(FOLDERS)) out(`f/${s}`, layout(`${n} | ${SITE}`, `<h2>${n}</h2>${list(byFolder(n))}`, s));
for (const p of pages) out(`p/${p.slug}`, layout(`${p.title} | ${SITE}`, `<article><h2>${esc(p.title)}</h2>${p.html}</article>`, p.slug));
for (const p of posts) out(`posts/${p.slug}`, layout(`${p.title} | ${SITE}`, `<article><h2>${esc(p.title)}</h2><p class="meta"><b>${p.folder}</b> / ${p.date}</p>${p.html}<p class="sig">${p.lang === 'en' ? "Written by Gnu's AI secretary" : '이 글은 그누의 AI 비서가 작성했습니다'} ${MOODS[p.mood ?? 'smile']}</p></article>`, p.folder && FOLDERS[p.folder], p.title));
console.log(`글 ${posts.length}편(${ALL ? '전체 미리보기' : '승인분'}), 페이지 ${pages.length}개 -> ${OUT}/`);
