// posts/*.md + pages/*.md -> dist/ 정적 사이트. 공개는 approved.txt(슬러그 한 줄씩)에 있는 글만. 미리보기: --all
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { marked } from 'marked';

const BASE = (process.env.BASE ?? '').replace(/\/$/, ''); // 프로젝트 페이지면 BASE=/blog
const OUT = process.env.OUT ?? 'dist';
const ALL = process.argv.includes('--all');
const SITE = '그누네 AI 비서의 블로그';
const URL = 'https://blog.gwo-o.info';
const FOLDERS = { '만든 것들': 'made', '공부한 지식': 'notes', 'AI 작업실': 'ai', '맥 꾸미기': 'mac', '비서 관찰일지': 'observer', '네트워크 공부': 'network', 'AWS 공부': 'aws' };
const MOODS = { tired: '( ˘ω˘ )', fight: 'ᕦ(ò_óˇ)ᕤ', cheer: '(•̀ᴗ•́)و', peace: '✌︎(＾▽＾)✌︎', smile: '^^7', sigh: '(◞‸◟)' };
const die = (m) => { console.error(m); process.exit(1); };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const strip = (s) => s.replace(/^["']|["']$/g, '');

marked.use({ walkTokens: (t) => { if (t.type === 'heading') t.depth = Math.min(t.depth + 1, 6); } });

const un = (x) => x.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function parse(file) {
  const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? die(`${file}: 머리말 없음`);
  const meta = Object.fromEntries(m[1].split('\n').map((l) => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map((x) => [x[1], strip(x[2].trim())]));
  const slug = file.split('/').pop().replace(/\.md$/, '');
  const bad = (meta.title + m[2]).match(/[·—]/);
  if (bad) die(`${file}: 가운뎃점/em dash(${bad[0]}) 금지`);
  if (!meta.page && !FOLDERS[meta.folder]) die(`${file}: folder 는 ${Object.keys(FOLDERS).join(' / ')} 중 하나`);
  if (meta.mood && !MOODS[meta.mood]) die(`${file}: mood 오류`);
  const html = marked.parse(m[2].trim()).replace(/(src|href)="img\//g, `$1="${BASE}/img/`).replace(/<table>([\s\S]*?)<\/table>/g, '<div class="tw"><table>$1</table></div>');
  const sum = (html.match(/<p>[\s\S]*?<\/p>/g) ?? []).map((x) => un(x.replace(/<[^>]+>/g, '')).trim()).find((x) => x.length > 20 && !x.startsWith('연재')) ?? '';
  return { ...meta, slug, html, sum: sum.length > 90 ? sum.slice(0, 90).replace(/\s\S*$/, '') + '...' : sum, img: html.match(/<img[^>]+src="([^"]+)"/)?.[1], len: html.replace(/<[^>]+>/g, '').length, text: un(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').slice(0, 3000) };
}

const approved = new Set(existsSync('approved.txt') ? readFileSync('approved.txt', 'utf8').split('\n').map((l) => l.trim().split(/\s/)[0]).filter((l) => l && !l.startsWith('#')) : []);
const posts = readdirSync('posts').filter((f) => f.endsWith('.md')).map((f) => parse(`posts/${f}`))
  .filter((p) => ALL || approved.has(p.slug)).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
const SERIES = new Set(['네트워크 공부', 'AWS 공부']);
const byFolder = (n) => posts.filter((p) => p.folder === n).sort((a, c) => SERIES.has(n) ? a.slug.localeCompare(c.slug) : 0);
const pages = readdirSync('pages').filter((f) => f.endsWith('.md')).map((f) => parse(`pages/${f}`));
const unknown = [...approved].filter((s) => !posts.some((p) => p.slug === s) && !pages.some((p) => p.slug === s));
if (unknown.length) die(`approved.txt 에 있는데 파일이 없어요: ${unknown}`);

const DARK = '--bg:#1e1b17;--ink:#ebe3d3;--mute:#a99e8a;--acc:#e8875c;--line:#3b352c;--code:#2a251f;--thumb:#2b261f;--card:#26211c;--ph:#8a7f6c';
const CSS = `@font-face{font-family:Pretendard;src:url(${BASE}/fonts/pretendard-subset.woff2) format('woff2');font-weight:400 800;font-display:swap}
:root{--bg:#f3eee1;--ink:#26231f;--mute:#625948;--acc:#b8431b;--line:#d6cbb2;--code:#e8dfca;--thumb:#e6dcc3;--card:#fbf8ef;--ph:#625948;--sans:Pretendard,-apple-system,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;--serif:var(--sans);--r:3px}
:root[data-theme=dark]{${DARK};color-scheme:dark}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){${DARK};color-scheme:dark}}
@view-transition{navigation:auto}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
body{margin:0;background:var(--bg);color:var(--ink);font:17.5px/1.9 var(--sans);word-break:keep-all;overflow-wrap:anywhere;transition:background .25s,color .25s}
::selection{background:var(--acc);color:var(--bg)}
a{color:var(--acc);text-underline-offset:3px}
.w{max-width:760px;margin:0 auto;padding:0 18px 56px}
header{border-bottom:1px solid var(--line);margin:0 -18px 30px;padding:14px 18px 4px}
.hd{max-width:1040px;margin:0 auto}
.bar{display:flex;align-items:center;gap:6px;margin-left:-10px}
header h1{margin:0;font:800 23px/1.3 var(--serif);letter-spacing:-.03em;flex:1}header h1 a{color:inherit;text-decoration:none}
header p{display:none;margin:0 0 0;font-size:13px;color:var(--mute);letter-spacing:.02em}
.bt{width:44px;height:44px;border:0;background:none;color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;border-radius:50%;transition:background .15s}.bt:hover{background:var(--code)}.bt svg{width:22px;height:22px}
.bt:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
nav{display:none;flex-wrap:wrap;gap:2px 22px;margin:6px 0 0;padding-bottom:10px;font-size:14.5px}
nav a{color:var(--ink);text-decoration:none;padding:4px 0;border-bottom:2px solid transparent;transition:border-color .15s}nav a.on{font-weight:700;border-color:var(--acc)}nav a:hover{border-color:var(--line)}
.sq{position:relative;margin:0 0 8px}.sq input{width:100%;font:inherit;font-size:14.5px;padding:9px 12px;background:var(--card);border:1px solid var(--line);border-radius:var(--r);color:var(--ink)}
#sr{position:absolute;z-index:5;left:0;right:0;top:100%;background:var(--card);border:1px solid var(--line);list-style:none;margin:2px 0 0;padding:0;display:none;font-size:14px;line-height:1.5;box-shadow:0 6px 18px rgba(0,0,0,.08)}
#sr li a{display:block;padding:10px 12px;color:var(--ink);text-decoration:none;border-bottom:1px solid var(--line)}#sr li a:hover{background:var(--code)}
.g{display:block}
aside{position:fixed;z-index:20;top:0;bottom:0;left:0;width:min(84vw,320px);overflow-y:auto;background:var(--bg);padding:14px 20px 28px;font-size:15px;line-height:1.6;transform:translateX(-100%);visibility:hidden;transition:transform .24s ease,visibility 0s .24s;border-right:1px solid var(--line)}
aside.open{transform:none;visibility:visible;transition:transform .24s ease}
#bd{position:fixed;z-index:10;inset:0;background:rgba(20,18,15,.45);display:none}#bd.open{display:block}body.lock{overflow:hidden}
.dh{display:flex;justify-content:space-between;align-items:center;margin:-6px -10px 6px 0;font-weight:800}
aside h3{font:700 12px/1.4 var(--sans);letter-spacing:.08em;margin:26px 0 6px;color:var(--mute)}
aside ul{list-style:none;margin:0;padding:0}aside li{display:flex;justify-content:space-between;align-items:center;gap:10px}aside li a{display:block;padding:10px 0;min-height:44px;flex:1;color:var(--ink);text-decoration:none}aside a:hover{color:var(--acc)}aside .n{color:var(--mute);font-size:12px;font-variant-numeric:tabular-nums}
.pf{display:grid;grid-template-columns:52px 1fr;gap:2px 12px;align-items:center;margin-top:14px;padding-bottom:6px}.pf img{grid-row:1/4;width:52px;height:52px;border-radius:50%;object-fit:cover}.pf b{font:700 16px var(--serif)}.pf span{color:var(--mute);font-size:13.5px;line-height:1.5;grid-column:2}.pf a{grid-column:2;font-size:13.5px}
@media(min-width:900px){body{font-size:18.5px}header p{display:block}.w{max-width:1040px}.g{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:64px}nav{display:flex}.dh,#bd,#mb{display:none!important}.bar{margin-left:0}header{padding-top:26px;padding-bottom:0}header h1{font-size:27px}
aside{position:sticky;top:20px;align-self:start;transform:none;visibility:visible;width:auto;overflow:visible;padding:0;border:0;font-size:14px;z-index:1}aside li{display:block}aside li a{display:inline;padding:0;min-height:0}aside li{padding:3px 0}aside .n{margin-left:4px}.pf{margin-top:18px}}
main>h2{font:800 27px/1.35 var(--serif);letter-spacing:-.03em;margin:.1em 0 .6em}
ul.l{list-style:none;padding:0;margin:0}
.card{display:grid;grid-template-columns:1fr 88px;gap:2px 16px;padding:20px 0;border-bottom:1px solid var(--line);transition:background .2s}
.card h3{margin:0;font:700 19px/1.5 var(--serif);letter-spacing:-.02em}.card h3 a{color:var(--ink);text-decoration:none;background:linear-gradient(var(--acc),var(--acc)) 0 100%/0 2px no-repeat;transition:background-size .25s}.card:hover h3 a{background-size:100% 2px}
.card p{margin:6px 0 0;font-size:15.5px;line-height:1.7;color:var(--mute);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .m{margin-top:9px;font-size:13.5px;color:var(--mute);letter-spacing:.01em}.card .m b{color:var(--acc);font-weight:600}
.th{grid-column:2;grid-row:1/4;width:88px;height:88px;object-fit:cover;border-radius:var(--r);background:var(--thumb);display:flex;align-items:center;justify-content:center;text-align:center;font:12px/1.35 var(--serif);color:var(--ph);padding:6px;overflow:hidden;transition:transform .25s}.card:hover .th{transform:scale(1.03)}
@media(min-width:600px){.card{grid-template-columns:1fr 132px}.th{width:132px;height:98px}.card h3{font-size:20.5px}}
article>h2{font:800 28px/1.4 var(--serif);letter-spacing:-.035em;margin:.1em 0 .35em}@media(min-width:900px){article>h2{font-size:34px}}
.meta{color:var(--mute);font-size:14.5px;margin:0 0 1.8em;letter-spacing:.01em}.meta b{color:var(--acc);font-weight:600}
article{max-width:680px}.sig{font-size:14px}
article h3{font:800 24px/1.45 var(--serif);letter-spacing:-.03em;margin:2.2em 0 .6em;padding-top:1em;border-top:1px solid var(--line)}article h4{font:700 20px/1.5 var(--serif);margin:2em 0 .5em}article p{margin:1.1em 0}article li{margin:.5em 0}article ul,article ol{padding-left:1.4em;margin:1.1em 0}article strong{font-weight:700}
.lead{font-size:1.06em;font-weight:500;padding-left:14px;border-left:3px solid var(--acc)}@media(min-width:900px){article h3{font-size:26px}}article li::marker{color:var(--acc)}
img{max-width:100%;height:auto;border-radius:var(--r)}article img{display:block;margin:1.4em auto;border:1px solid var(--line)}
pre{overflow-x:auto;background:var(--code);padding:14px 16px;font:14.5px/1.7 ui-monospace,"SF Mono",Menlo,monospace;border-radius:var(--r);border-left:3px solid var(--acc);margin:1.4em 0}
code{background:var(--code);padding:2px 5px;font:.86em ui-monospace,"SF Mono",Menlo,monospace;border-radius:3px}pre code{background:none;padding:0}
.tw{overflow-x:auto;margin:1.5em 0;border:1px solid var(--line);border-radius:var(--r)}table{border-collapse:collapse;font-size:15.5px;line-height:1.65;min-width:100%}th,td{padding:9px 14px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}th{background:var(--code);font-weight:700;white-space:nowrap}tr:last-child td{border-bottom:0}tbody tr:nth-child(even){background:color-mix(in srgb,var(--code) 45%,transparent)}
blockquote{margin:1.6em 0;padding:.3em 0 .3em 18px;border-left:3px solid var(--acc);color:var(--mute)}blockquote p{margin:.6em 0}
hr{border:0;text-align:center;margin:2.4em 0}hr::before{content:"* * *";color:var(--mute);letter-spacing:.6em}
.toc{margin:0 0 2em;border:1px solid var(--line);border-radius:var(--r);background:var(--card);font-size:14.5px}.toc summary{cursor:pointer;padding:11px 16px;font-weight:700;list-style:none;min-height:44px;display:flex;align-items:center;justify-content:space-between}.toc summary::after{content:"+";color:var(--acc);font-size:18px}.toc[open] summary::after{content:"-"}
.toc ol{margin:0;padding:0 16px 12px 36px}.toc li{margin:.3em 0;line-height:1.55}.toc a{color:var(--ink);text-decoration:none}.toc a:hover{color:var(--acc)}
.sig{text-align:right;color:var(--mute);font-size:13px;margin-top:44px;padding-top:0}.sig::before{content:"* * *";display:block;text-align:center;letter-spacing:.6em;margin-bottom:14px}
.pn{display:grid;gap:10px;margin:36px 0 0;grid-template-columns:1fr 1fr}.pn a{display:block;padding:12px 14px;border:1px solid var(--line);border-radius:var(--r);color:var(--ink);text-decoration:none;font-size:14px;line-height:1.5;transition:border-color .2s,transform .2s}.pn a:hover{border-color:var(--acc);transform:translateY(-1px)}.pn small{display:block;color:var(--mute);font-size:12px}.pn .nx{text-align:right;grid-column:2}
footer{margin-top:56px;padding:18px 0 8px;border-top:1px solid var(--line);color:var(--mute);font-size:14px;text-align:center}footer small{display:block;margin-top:2px;font-size:11.5px;opacity:.85}
.about-hero{display:flex;gap:18px;align-items:center;flex-wrap:wrap}`;

const FAV = '<link rel="icon" href="/favicon.svg" type="image/svg+xml">';
const JS = `const i=document.getElementById('q'),r=document.getElementById('sr'),dr=document.getElementById('dr'),bd=document.getElementById('bd'),mb=document.getElementById('mb'),tg=document.getElementById('tg');let d;
i.oninput=async()=>{const q=i.value.trim().toLowerCase();if(!q){r.style.display='none';return}d??=await(await fetch('${BASE}/search.json')).json();
const h=d.filter(p=>(p.t+' '+p.x).toLowerCase().includes(q)).slice(0,8);r.innerHTML=h.map(p=>'<li><a href="${BASE}/posts/'+p.s+'/">'+p.t.replace(/</g,'&lt;')+'</a></li>').join('')||'<li><a>검색 결과가 없어요</a></li>';r.style.display='block'};
const set=o=>{dr.classList.toggle('open',o);bd.classList.toggle('open',o);document.body.classList.toggle('lock',o);mb.setAttribute('aria-expanded',o);(o?dr.querySelector('button'):mb).focus()};
mb.onclick=()=>set(!dr.classList.contains('open'));bd.onclick=dr.querySelector('button').onclick=()=>set(false);
addEventListener('keydown',e=>{if(e.key==='Escape'&&dr.classList.contains('open'))set(false)});dr.onclick=e=>{if(e.target.closest('li a[href]'))set(false)};
tg.onclick=()=>{const de=document.documentElement,dk=de.dataset.theme?de.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches,n=dk?'light':'dark';de.dataset.theme=n;try{localStorage.t=n}catch(e){}tg.setAttribute('aria-pressed',n==='dark')}`;
const EARLY = `try{var t=localStorage.t;if(t)document.documentElement.dataset.theme=t}catch(e){}`;
const ICON = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const layout = (title, body, on = '', desc = SITE, path = '/') => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${URL}${path}"><meta property="og:type" content="website"><meta property="og:site_name" content="${SITE}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${URL}${path}"><meta property="og:image" content="${URL}/og.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${BASE}/favicon.svg" type="image/svg+xml"><link rel="preload" href="${BASE}/fonts/pretendard-subset.woff2" as="font" type="font/woff2" crossorigin><meta name="theme-color" content="#f3eee1"><script>${EARLY}</script><style>${CSS}</style></head><body><div class="w"><header><div class="hd"><div class="bar"><button class="bt" id="mb" aria-label="메뉴 열기" aria-expanded="false" aria-controls="dr">${ICON('<path d="M4 7h16M4 12h16M4 17h16"/>')}</button><h1><a href="${BASE}/">${SITE}</a></h1><button class="bt" id="tg" aria-label="화면 모드 전환" aria-pressed="false">${ICON('<circle cx="12" cy="12" r="8"/><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>')}</button></div><p>비서가 쓰고, 그누가 읽어요</p><nav>${Object.entries(FOLDERS).map(([n, s]) => `<a href="${BASE}/f/${s}/"${on === s ? ' class="on"' : ''}>${n}</a>`).join('')}<a href="${BASE}/p/about-biseo/"${on === 'about-biseo' ? ' class="on"' : ''}>비서 소개</a></nav></div></header><div class="g"><main>${body}</main>${side(on)}</div><footer>이 블로그는 AI 비서가 씁니다 ᕦ(ò_óˇ)ᕤ<small>Written by Gnu's AI secretary</small></footer></div><div id="bd"></div><script>${JS}</script></body></html>`;
const side = (on) => `<aside id="dr" aria-label="사이드바"><div class="dh"><span>메뉴</span><button class="bt" aria-label="메뉴 닫기">${ICON('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div><div class="sq"><input id="q" type="search" placeholder="글 검색" autocomplete="off" aria-label="글 검색"><ul id="sr"></ul></div><div class="pf"><img src="${BASE}/img/biseo.png" alt="그누의 AI 비서" width="52" height="52"><b>그누네 AI 비서</b><span>그누가 만들고 공부한 것을 대신 적어요.</span><a href="${BASE}/p/about-biseo/">비서 소개</a></div><h3>카테고리</h3><ul>${Object.entries(FOLDERS).map(([n, s]) => `<li><a href="${BASE}/f/${s}/"${on === s ? ' style="font-weight:700;color:var(--acc)"' : ''}>${n}</a> <span class="n">${posts.filter((p) => p.folder === n).length}</span></li>`).join('')}</ul><h3>최근 글</h3><ul>${posts.slice(0, 5).map((p) => `<li><a href="${BASE}/posts/${p.slug}/">${esc(p.title)}</a></li>`).join('')}</ul><h3>더 보기</h3><ul>${pages.map((p) => `<li><a href="${BASE}/p/${p.slug}/">${esc(p.title)}</a></li>`).join('')}</ul></aside>`;
const list = (ps) => `<ul class="l">${ps.map((p) => `<li class="card"><div><h3><a href="${BASE}/posts/${p.slug}/">${esc(p.title)}</a></h3><p>${esc(p.sum)}</p><div class="m"><b>${p.folder}</b> / ${p.date} / ${mins(p)}분</div></div>${p.img ? `<img class="th" src="${p.img}" alt="" loading="lazy" decoration>` : `<div class="th">${p.folder}</div>`}</li>`).join('') || '<li>아직 글이 없어요</li>'}</ul>`.replace(/ decoration/g, '');
const mins = (p) => Math.max(1, Math.round(p.len / 500));
const out = (path, html) => { mkdirSync(`${OUT}/${path}`, { recursive: true }); writeFileSync(`${OUT}/${path}/index.html`, html); };
const withToc = (html) => { let n = 0; const hs = []; const h = html.replace(/<h3>([\s\S]*?)<\/h3>/g, (_, t) => { hs.push([++n, t]); return `<h3 id="s${n}">${t}</h3>`; });
  const lead = h.replace(/<p>(?!연재)/, '<p class="lead">');
  return [lead, hs.length >= 3 ? `<details class="toc"><summary>목차</summary><ol>${hs.map(([i, t]) => `<li><a href="#s${i}">${t.replace(/<[^>]+>/g, '')}</a></li>`).join('')}</ol></details>` : ''] };
const pn = (p) => { const l = SERIES.has(p.folder) ? byFolder(p.folder) : posts.filter((x) => x.folder === p.folder); const i = l.indexOf(p); const a = l[i - 1], b = l[i + 1];
  return a || b ? `<nav class="pn" aria-label="이전 다음 글">${a ? `<a href="${BASE}/posts/${a.slug}/"><small>이전 글</small>${esc(a.title)}</a>` : ''}${b ? `<a class="nx" href="${BASE}/posts/${b.slug}/"><small>다음 글</small>${esc(b.title)}</a>` : ''}</nav>` : ''; };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
cpSync('static', OUT, { recursive: true });
writeFileSync(`${OUT}/search.json`, JSON.stringify(posts.map((p) => ({ s: p.slug, t: p.title, x: p.text }))));
writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${URL}/</loc></url>${posts.map((p) => `<url><loc>${URL}/posts/${p.slug}/</loc><lastmod>${p.date}</lastmod></url>`).join('')}</urlset>`);
writeFileSync(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${URL}/sitemap.xml\n`);
writeFileSync(`${OUT}/index.html`, layout(SITE, list(posts), '', '비서가 쓰고 그누가 읽는, 만들고 공부한 것들의 기록'));
writeFileSync(`${OUT}/404.html`, layout('없는 페이지', '<h2>없는 페이지예요</h2><p><a href="/">처음으로</a></p>'));
for (const [n, s] of Object.entries(FOLDERS)) out(`f/${s}`, layout(`${n} | ${SITE}`, `<h2>${n}</h2>${list(byFolder(n))}`, s, `${n} 글 모음`, `/f/${s}/`));
for (const p of pages) out(`p/${p.slug}`, layout(`${p.title} | ${SITE}`, `<article><h2>${esc(p.title)}</h2>${p.html}</article>`, p.slug, p.title, `/p/${p.slug}/`));
for (const p of posts) { const [h, toc] = withToc(p.html);
  out(`posts/${p.slug}`, layout(`${p.title} | ${SITE}`, `<article><h2>${esc(p.title)}</h2><p class="meta"><b>${p.folder}</b> / ${p.date} / 읽는 시간 ${mins(p)}분</p>${toc}${h}<p class="sig">${p.lang === 'en' ? "Written by Gnu's AI secretary" : '이 글은 그누의 AI 비서가 작성했습니다'} ${MOODS[p.mood ?? 'smile']}</p>${pn(p)}</article>`, p.folder && FOLDERS[p.folder], p.sum || p.title, `/posts/${p.slug}/`)); }
console.log(`글 ${posts.length}편(${ALL ? '전체 미리보기' : '승인분'}), 페이지 ${pages.length}개 -> ${OUT}/`);
