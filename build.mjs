// posts/*.md + pages/*.md -> dist/ 정적 사이트. 공개는 approved.txt(슬러그 한 줄씩)에 있는 글만. 미리보기: --all
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { marked } from 'marked';

const BASE = (process.env.BASE ?? '').replace(/\/$/, ''); // 프로젝트 페이지면 BASE=/blog
const OUT = process.env.OUT ?? 'dist';
const ALL = process.argv.includes('--all');
const SITE = '그누네 AI 비서의 블로그';
const URL = 'https://blog.gwo-o.info';
const FOLDERS = { '만든 것들': 'made', '공부한 지식': 'notes', 'AI 작업실': 'ai', '맥 꾸미기': 'mac', '비서 관찰일지': 'observer', '네트워크 공부': 'network', 'AWS 공부': 'aws' };
const MOTIF = {
  aws: '<path d="M18 40a9 9 0 0 1 1-17 12 12 0 0 1 23-2 10 10 0 0 1 4 19Z" fill="var(--pa2)"/><rect x="22" y="44" width="20" height="5" rx="1.5"/><rect x="22" y="51" width="20" height="5" rx="1.5"/><path d="M26 47h.1M26 54h.1"/>',
  network: '<path d="M14 44L30 18 50 40 14 44ZM30 18L32 50M50 40L32 50M14 44L32 50"/><circle cx="14" cy="44" r="4" fill="var(--pa2)"/><circle cx="30" cy="18" r="4" fill="var(--pa2)"/><circle cx="50" cy="40" r="4" fill="var(--pa2)"/><circle cx="32" cy="50" r="4" fill="var(--pa2)"/>',
  made: '<circle cx="32" cy="32" r="12" fill="var(--pa2)"/><circle cx="32" cy="32" r="4.5"/><path d="M32 12v6M32 46v6M12 32h6M46 32h6M18 18l4 4M42 42l4 4M18 46l4-4M42 22l4-4"/>',
  ai: '<path d="M10 14h30a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H26l-8 7v-7h-8a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3Z" fill="var(--pa2)"/><path d="M18 24h.1M26 24h.1M34 24h.1"/><rect x="38" y="38" width="18" height="14" rx="3"/><path d="M47 38v-5M47 31h.1M43 45h.1M51 45h.1M42 52v3M52 52v3"/>',
  mac: '<rect x="8" y="12" width="48" height="34" rx="4" fill="var(--pa2)"/><path d="M8 20h48M14 16h.1M19 16h.1M24 16h.1"/><rect x="20" y="50" width="24" height="8" rx="2"/><path d="M26 54h12"/>',
  observer: '<circle cx="27" cy="27" r="14" fill="var(--pa2)"/><path d="M37 37l15 15M21 24a8 8 0 0 1 8-5"/><path d="M52 52l4 4"/>',
  notes: '<path d="M14 12h30a4 4 0 0 1 4 4v38H18a4 4 0 0 1-4-4Z" fill="var(--pa2)"/><path d="M14 50a4 4 0 0 1 4-4h30M24 22h16M24 30h16"/>',
};
const MOTIF2 = {
  server: '<rect x="12" y="12" width="40" height="14" rx="3" fill="var(--pa2)"/><rect x="12" y="30" width="40" height="14" rx="3"/><path d="M18 19h.1M18 37h.1M40 19h6M40 37h6M32 44v8M22 52h20"/>',
  bucket: '<path d="M14 20h36l-5 34H19Z" fill="var(--pa2)"/><ellipse cx="32" cy="20" rx="18" ry="6"/><path d="M20 32h24"/>',
  key: '<circle cx="22" cy="32" r="10" fill="var(--pa2)"/><circle cx="22" cy="32" r="3"/><path d="M32 32h22M46 32v8M52 32v6"/>',
  globe: '<circle cx="32" cy="32" r="20" fill="var(--pa2)"/><path d="M12 32h40M32 12c-9 10-9 30 0 40M32 12c9 10 9 30 0 40"/>',
  vpc: '<rect x="10" y="12" width="44" height="40" rx="4" stroke-dasharray="4 4"/><rect x="18" y="22" width="12" height="10" rx="2" fill="var(--pa2)"/><rect x="36" y="32" width="12" height="10" rx="2" fill="var(--pa2)"/><path d="M30 27h6v10"/>',
  plan: '<rect x="14" y="10" width="36" height="46" rx="4" fill="var(--pa2)"/><path d="M24 8h16v6H24ZM22 26h20M22 34h20M22 42h12"/>',
  layers: '<path d="M32 12l22 10-22 10-22-10Z" fill="var(--pa2)"/><path d="M10 32l22 10 22-10M10 42l22 10 22-10"/>',
  grid: '<rect x="12" y="12" width="40" height="40" rx="3"/><path d="M12 25h40M12 38h40M25 12v40M38 12v40"/><rect x="25" y="25" width="13" height="13" fill="var(--pa2)"/>',
  route: '<path d="M32 54V34M32 34L16 20M32 34l16-14"/><path d="M12 24l4-6 6 3M44 14l6 4-4 6"/><circle cx="32" cy="54" r="3" fill="var(--pa2)"/>',
  switch: '<rect x="8" y="34" width="48" height="16" rx="3" fill="var(--pa2)"/><path d="M16 42h.1M24 42h.1M32 42h.1M40 42h.1M48 42h.1M20 34V22M32 34V14M44 34V22"/><circle cx="20" cy="20" r="3"/><circle cx="32" cy="12" r="3"/><circle cx="44" cy="20" r="3"/>',
  book: '<path d="M14 10h32a4 4 0 0 1 4 4v38H18a4 4 0 0 1-4-4Z" fill="var(--pa2)"/><path d="M14 48a4 4 0 0 1 4-4h32M24 22h16M24 30h10"/>',
  badge: '<circle cx="32" cy="26" r="14" fill="var(--pa2)"/><path d="M24 38l-4 16 12-6 12 6-4-16M26 26l5 5 8-9"/>',
  chat: '<path d="M10 14h30a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H26l-8 7v-7h-8a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3Z" fill="var(--pa2)"/><path d="M48 26h4a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-4v6l-7-6H30"/>',
  relay: '<rect x="8" y="22" width="14" height="26" rx="3" fill="var(--pa2)"/><rect x="42" y="18" width="16" height="22" rx="2"/><path d="M26 35h12M34 31l4 4-4 4M46 44h8"/>',
  org: '<rect x="24" y="8" width="16" height="12" rx="3" fill="var(--pa2)"/><rect x="6" y="40" width="16" height="12" rx="3"/><rect x="24" y="40" width="16" height="12" rx="3"/><rect x="42" y="40" width="16" height="12" rx="3"/><path d="M32 20v10M14 40V30h36v10M32 30v10"/>',
  dots: '<circle cx="14" cy="14" r="4"/><circle cx="32" cy="14" r="4" fill="var(--pa2)"/><circle cx="50" cy="14" r="4"/><circle cx="14" cy="32" r="4" fill="var(--pa2)"/><circle cx="32" cy="32" r="4"/><circle cx="50" cy="32" r="4" fill="var(--pa2)"/><circle cx="14" cy="50" r="4"/><circle cx="32" cy="50" r="4" fill="var(--pa2)"/><circle cx="50" cy="50" r="4"/>',
  moon: '<path d="M42 14a20 20 0 1 0 8 30A16 16 0 0 1 42 14Z" fill="var(--pa2)"/><path d="M48 12v8M44 16h8M54 28v4M52 30h4"/>',
  stamp: '<rect x="12" y="10" width="34" height="44" rx="4" fill="var(--pa2)"/><path d="M20 22h18M20 30h18"/><circle cx="46" cy="44" r="10"/><path d="M41 44l4 4 7-8"/>',
  flag: '<path d="M16 54V10"/><path d="M16 12h34v22H16Z" fill="var(--pa2)"/><path d="M16 12h8v8h-8ZM32 12h8v8h-8ZM24 20h8v8h-8ZM40 20h8v8h-8Z"/>',
  chip: '<rect x="18" y="18" width="28" height="28" rx="4" fill="var(--pa2)"/><rect x="26" y="26" width="12" height="12"/><path d="M24 18v-8M32 18v-8M40 18v-8M24 46v8M32 46v8M40 46v8M18 24h-8M18 32h-8M18 40h-8M46 24h8M46 32h8M46 40h8"/>',
  vault: '<rect x="10" y="12" width="44" height="40" rx="4" fill="var(--pa2)"/><path d="M10 26h44M10 40h44M28 19h8M28 33h8M28 46h8"/>',
  fan: '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="4" fill="var(--pa2)"/><path d="M32 28c-2-8 2-14 8-14 2 8-2 12-8 14ZM36 32c8-2 14 2 14 8-8 2-12-2-14-8ZM32 36c2 8-2 14-8 14-2-8 2-12 8-14ZM28 32c-8 2-14-2-14-8 8-2 12 2 14 8Z"/>',
  laptop: '<path d="M14 40V16a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v24" fill="var(--pa2)"/><path d="M8 44h48l-4 8H12Z"/><path d="M26 26h12M32 20v12"/>',
  lock: '<rect x="14" y="28" width="36" height="26" rx="4" fill="var(--pa2)"/><path d="M22 28V20a10 10 0 0 1 20 0v8M32 38v8"/>',
  loop: '<path d="M12 32a20 20 0 0 1 34-14M52 32a20 20 0 0 1-34 14"/><path d="M48 8v10H38M16 56V46h10"/><circle cx="32" cy="32" r="5" fill="var(--pa2)"/>',
  link: '<path d="M26 38l12-12"/><path d="M22 30l-6 6a9 9 0 0 0 12 12l6-6M42 34l6-6a9 9 0 0 0-12-12l-6 6" fill="var(--pa2)"/>',
  clock: '<circle cx="32" cy="32" r="22" fill="var(--pa2)"/><path d="M32 18v14l10 6M26 6h12"/>',
  eye: '<path d="M6 32C14 18 24 12 32 12s18 6 26 20c-8 14-18 20-26 20S14 46 6 32Z" fill="var(--pa2)"/><circle cx="32" cy="32" r="8"/><circle cx="32" cy="32" r="2.5"/>',
  palette: '<path d="M32 10C18 10 8 20 8 32s10 22 22 22c5 0 6-4 3-7s-1-8 5-8h8c6 0 10-4 10-9 0-12-10-20-24-20Z" fill="var(--pa2)"/><circle cx="20" cy="30" r="3"/><circle cx="28" cy="20" r="3"/><circle cx="40" cy="20" r="3"/>',
  bug: '<ellipse cx="32" cy="36" rx="13" ry="16" fill="var(--pa2)"/><path d="M32 20v32M19 30H8M45 30h11M20 44l-9 5M44 44l9 5M26 16l-4-6M38 16l4-6"/>',
  shield: '<path d="M32 8l20 8v16c0 12-9 20-20 24-11-4-20-12-20-24V16Z" fill="var(--pa2)"/><path d="M23 32l6 6 12-13"/>',
  pen: '<path d="M14 50l4-14 28-28 10 10-28 28Z" fill="var(--pa2)"/><path d="M40 14l10 10M14 50l10-4"/>',
  gear: '<circle cx="32" cy="32" r="12" fill="var(--pa2)"/><circle cx="32" cy="32" r="4.5"/><path d="M32 12v6M32 46v6M12 32h6M46 32h6M18 18l4 4M42 42l4 4M18 46l4-4M42 22l4-4"/>',
};
Object.assign(MOTIF, MOTIF2);
const POSTICON = {'ai-agents-as-a-company':'org','as-completed-timeout':'clock','aws-00-plan':'plan','aws-01-account-iam':'key','aws-02-region-az':'globe','aws-03-vpc':'vpc','aws-04-ec2':'server','aws-05-storage':'bucket','blogger-api-approval':'stamp','cert-00-overview':'badge','chat-ws-pivot':'chat','en-fifty-agents':'dots','f1-manager-game':'flag','fifty-agents':'dots','local-ai-on-mac':'chip','mac-lid-closed-sleep':'laptop','macos-tcc-root':'lock','memory-vault':'vault','menustats-fan-control':'fan','message-relay':'relay','net-00-plan':'plan','net-01-osi-tcpip':'layers','net-02-ip-subnet':'grid','net-03-routing':'route','net-04-switching-vlan':'switch','net-05-dns-dhcp-nat':'book','night-shift':'moon','oauth-desktop-loopback':'loop','observer-log-1':'eye','observer-log-2':'eye','orca-cream-theme':'palette','phone-chat-for-agents':'chat','referrer-policy-origin-null':'link','team-intro-qa':'bug','team-intro-security':'shield'};
const iconOf = (p) => POSTICON[p.slug] || FOLDERS[p.folder];
const motif = (s, size = 64) => `<svg class="mt" viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MOTIF[s]}</svg>`;
const SUBS = { '만든 것들': { '게임': 'game', 'RTX 5070': 'rtx5070', '홈페이지': 'homepage' } };
const MOODS = { tired: '( ˘ω˘ )', fight: 'ᕦ(ò_óˇ)ᕤ', cheer: '(•̀ᴗ•́)و', peace: '✌︎(＾▽＾)✌︎', smile: '^^7', sigh: '(◞‸◟)' };
const die = (m) => { console.error(m); process.exit(1); };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const strip = (s) => s.replace(/^["']|["']$/g, '');

marked.use({ extensions: [{ name: 'hl', level: 'inline', start: (x) => x.indexOf('=='), tokenizer(src) { const m = /^==(?!\s)([^=\n]+?)(?<!\s)==/.exec(src); if (m) return { type: 'hl', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) }; }, renderer(t) { return `<mark>${this.parser.parseInline(t.tokens)}</mark>`; } }] });
marked.use({ walkTokens: (t) => { if (t.type === 'heading') t.depth = Math.min(t.depth + 1, 6); } });

const un = (x) => x.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function parse(file) {
  const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? die(`${file}: 머리말 없음`);
  const meta = Object.fromEntries(m[1].split('\n').map((l) => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map((x) => [x[1], strip(x[2].trim())]));
  const slug = file.split('/').pop().replace(/\.md$/, '');
  const bad = (meta.title + m[2]).match(/[·—]/);
  if (bad) die(`${file}: 가운뎃점/em dash(${bad[0]}) 금지`);
  if (meta.folder) { const [t, u] = meta.folder.split('/').map((x) => x.trim()); meta.folder = t; meta.sub = u || ''; if (meta.sub && !SUBS[t]?.[meta.sub]) die(`${file}: 하위 폴더는 ${Object.keys(SUBS[t] ?? {}).join(' / ') || '없음'} 중 하나`); }
  if (!meta.page && !FOLDERS[meta.folder]) die(`${file}: folder 는 ${Object.keys(FOLDERS).join(' / ')} 중 하나`);
  if (meta.mood && !MOODS[meta.mood]) die(`${file}: mood 오류`);
  const html = marked.parse(m[2].trim()).replace(/(src|href)="img\//g, `$1="${BASE}/img/`).replace(/<table>([\s\S]*?)<\/table>/g, '<div class="tw"><table>$1</table></div>');
  const sum = (html.match(/<p>[\s\S]*?<\/p>/g) ?? []).map((x) => un(x.replace(/<[^>]+>/g, '')).trim()).find((x) => x.length > 20 && !x.startsWith('연재')) ?? '';
  return { ...meta, slug, html, sum: sum.length > 90 ? sum.slice(0, 90).replace(/\s\S*$/, '') + '...' : sum, img: html.match(/<img[^>]+src="([^"]+)"/)?.[1], len: html.replace(/<[^>]+>/g, '').length, text: un(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').slice(0, 3000) };
}

const approved = new Set(existsSync('approved.txt') ? readFileSync('approved.txt', 'utf8').split('\n').map((l) => l.trim().split(/\s/)[0]).filter((l) => l && !l.startsWith('#')) : []);
const NUM = new Map();
const posts = readdirSync('posts').filter((f) => f.endsWith('.md')).map((f) => parse(`posts/${f}`))
  .filter((p) => ALL || approved.has(p.slug)).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
[...posts].sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug)).forEach((p, i) => NUM.set(p.slug, String(i + 1).padStart(2, '0')));
const SERIES = new Set(['네트워크 공부', 'AWS 공부']);
const subOf = (n, u) => posts.filter((p) => p.folder === n && p.sub === u);
const lbl = (p) => p.sub ? `${p.folder} / ${p.sub}` : p.folder;
const byFolder = (n) => posts.filter((p) => p.folder === n).sort((a, c) => SERIES.has(n) ? a.slug.localeCompare(c.slug) : 0);
const pages = readdirSync('pages').filter((f) => f.endsWith('.md')).map((f) => parse(`pages/${f}`));
const unknown = [...approved].filter((s) => !posts.some((p) => p.slug === s) && !pages.some((p) => p.slug === s));
if (unknown.length) die(`approved.txt 에 있는데 파일이 없어요: ${unknown}`);

const DARK = '--bg:#1e1b17;--ink:#ebe3d3;--mute:#a99e8a;--acc:#e8875c;--line:#3b352c;--code:#2a251f;--thumb:#2b261f;--card:#26211c;--ph:#8a7f6c;--pt:#ebe3d3;--pa:#4a3a2b;--pb:#3f4030;--pc:#4d362c;--pd:#34402f;--pe:#433b2c;--pf:#413629;--pg:#4a3d27;--h1:#2a251f;--h2:#302a22;--h3:#38302a;--sun:#8f5c38;--leaf:#5c6040;--k1:#6a5a1c;--k2:#2f5a3f;--k3:#6a3342;--k4:#2f5270;--k5:#6a4a28;--k6:#2a5a56;--k7:#6a4f22';
const CSS = `@font-face{font-family:Gowun;src:url(${BASE}/fonts/gowun-subset.woff2) format('woff2');font-weight:400;font-display:swap}@font-face{font-family:HiMelody;src:url(${BASE}/fonts/himelody-subset.woff2) format('woff2');font-weight:400;font-display:swap}
:root{--bg:#f3eee1;--ink:#26231f;--mute:#625948;--acc:#b8431b;--line:#d6cbb2;--code:#e8dfca;--thumb:#e6dcc3;--card:#fbf8ef;--ph:#625948;--pt:#26231f;--pa:#ead2b5;--pb:#dcdcb9;--pc:#e9bfa9;--pd:#d3dcc8;--pe:#e6d9c0;--pf:#d9c9b4;--pg:#e3c9a0;--h1:#eadfc4;--h2:#ddd0ac;--h3:#cfc59d;--sun:#e4a874;--leaf:#a9a86e;--k1:#f6df86;--k2:#bfe5cb;--k3:#f7c8d2;--k4:#c4e0f4;--k5:#f7d4ac;--k6:#b9e4de;--k7:#f6d596;--hl:var(--k1);--ul:#e0a800;--hand:HiMelody,Gowun,"Apple SD Gothic Neo",sans-serif;--sans:Gowun,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;--serif:var(--sans);--r:3px}
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
aside{position:fixed;z-index:20;top:0;bottom:0;left:0;width:min(84vw,320px);overflow-y:auto;background:var(--bg);padding:14px 20px 28px;font-size:15px;line-height:1.6;transform:translateX(-100%);visibility:hidden;transition:transform .2s cubic-bezier(.4,0,1,1),visibility 0s .2s;will-change:transform;border-right:1px solid var(--line)}
aside.open{transform:none;visibility:visible;transition:transform .26s cubic-bezier(.2,.8,.2,1)}aside.drag{transition:none!important}
#bd{position:fixed;z-index:10;inset:0;background:rgba(20,18,15,.45);opacity:0;visibility:hidden;transition:opacity .2s,visibility 0s .2s}#bd.open{opacity:1;visibility:visible;transition:opacity .26s}#bd.drag{transition:none!important;visibility:visible}body.lock{overflow:hidden}
@media(max-width:899px){@keyframes ai{from{opacity:0;transform:translateX(-10px)}}aside.open>*{animation:ai .26s cubic-bezier(.2,.8,.2,1) both}aside.open>:nth-child(2){animation-delay:20ms}aside.open>:nth-child(3){animation-delay:40ms}aside.open>:nth-child(4){animation-delay:60ms}aside.open>:nth-child(5){animation-delay:80ms}aside.open>:nth-child(n+6){animation-delay:100ms}}
@media(prefers-reduced-motion:reduce) and (max-width:899px){aside{transform:none;opacity:0}aside.open{opacity:1}aside,#bd{transition:opacity .15s linear,visibility 0s!important}aside.open>*{animation:none!important}}
.dh{display:flex;justify-content:space-between;align-items:center;margin:-6px -10px 6px 0;font-weight:800}
aside h3{font:700 12px/1.4 var(--sans);letter-spacing:.08em;margin:26px 0 6px;color:var(--mute)}
aside ul{list-style:none;margin:0;padding:0}aside li a .mt{width:20px;height:20px;margin-right:8px;flex:none;color:var(--ink)}aside li{display:flex;justify-content:space-between;align-items:center;gap:10px}aside li a{display:block;padding:10px 0;min-height:44px;flex:1;color:var(--ink);text-decoration:none}aside a:hover{color:var(--acc)}aside .n{color:var(--mute);font-size:12px;font-variant-numeric:tabular-nums}
.pf{display:grid;grid-template-columns:52px 1fr;gap:2px 12px;align-items:center;margin-top:14px;padding-bottom:6px}.pf img{grid-row:1/4;width:52px;height:52px;border-radius:50%;object-fit:cover}.pf b{font:700 16px var(--serif)}.pf span{color:var(--mute);font-size:13.5px;line-height:1.5;grid-column:2}.pf a{grid-column:2;font-size:13.5px}
@media(min-width:900px){body{font-size:18.5px}header p{display:block}.w{max-width:1040px}.g{display:grid;grid-template-columns:220px minmax(0,680px);gap:56px;justify-content:center}main{order:2}aside{order:1}nav{display:none}.dh,#bd,#mb{display:none!important}.bar{margin-left:0}header{padding-top:26px;padding-bottom:0}header h1{font-size:27px}
aside{position:sticky;top:20px;align-self:start;transform:none;visibility:visible;width:auto;overflow:visible;padding:0;border:0;font-size:14px;z-index:1}aside li{display:block}aside li a{display:flex;align-items:center;gap:8px;padding:5px 0;min-height:0}aside li{padding:1px 0;display:flex}aside .n{margin-left:4px}.pf{margin-top:0}.mt{flex:none}aside .mt{width:20px;height:20px}}
.pr{display:grid;grid-template-columns:56px 1fr;gap:4px 16px;align-items:center;margin:0 0 6px;padding-bottom:20px;border-bottom:1px solid var(--line)}.pr img{width:56px;height:56px;border-radius:50%;object-fit:cover;grid-row:1}.pr h2{font:800 21px/1.4 var(--serif);letter-spacing:-.03em;margin:0}.pr p{margin:2px 0 0;font-size:14.5px;line-height:1.6;color:var(--mute)}.pr .st2{color:var(--ink);font-size:13.5px}
.sub{display:grid;grid-template-rows:0fr;width:100%;transition:grid-template-rows .26s cubic-bezier(.2,.8,.2,1)}.sub.open{grid-template-rows:1fr}.sub>ul{overflow:hidden;min-height:0;visibility:hidden;transition:visibility 0s .26s}.sub.open>ul{visibility:visible;transition:none}aside li:has(>.sub){flex-wrap:wrap}.sub li a{padding-left:30px!important}.bc{color:inherit;text-decoration:none}.bc:hover{text-decoration:underline}
.chips{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.chips a,.sb{font:inherit;font-size:13.5px;padding:5px 13px;border:1px solid var(--line);border-radius:99px;color:var(--ink);text-decoration:none;background:none;cursor:pointer;transition:background .15s,border-color .15s}.chips a:hover,.sb:hover{background:var(--code);border-color:var(--mute)}.sb{display:inline-block}@media(min-width:900px){.sb,.chips{display:none}.pr h2{font-size:24px}}
main>h2{font:800 27px/1.35 var(--serif);letter-spacing:-.03em;margin:.1em 0 .6em}
ul.l{list-style:none;padding:0;margin:0}
.card{display:grid;grid-template-columns:1fr 88px;gap:2px 16px;padding:20px 0;border-bottom:1px solid var(--line);transition:background .2s}
.card h2{margin:0;font:700 19px/1.5 var(--serif);letter-spacing:-.02em}.card h2 a{color:var(--ink);text-decoration:none;background:linear-gradient(var(--acc),var(--acc)) 0 100%/0 2px no-repeat;transition:background-size .25s}.card:hover h2 a{background-size:100% 2px}
.card p{margin:6px 0 0;font-size:15.5px;line-height:1.7;color:var(--mute);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .m{margin-top:9px;font-size:13.5px;color:var(--mute);letter-spacing:.01em}.card .m b{color:var(--acc);font-weight:600}
.th{grid-column:2;grid-row:1/4;width:88px;height:88px;border-radius:var(--r);background:var(--pt-bg,var(--pa));color:var(--pt);display:flex;align-items:center;justify-content:center;overflow:hidden;transition:transform .2s ease,box-shadow .2s;will-change:transform;--pa2:rgba(184,67,27,.16)}.th .mt{width:62%;height:auto;max-height:80%;opacity:.88}.mt{--pa2:rgba(184,67,27,.16)}.f-made{--pt-bg:var(--pa)}.f-notes{--pt-bg:var(--pb)}.f-ai{--pt-bg:var(--pc)}.f-mac{--pt-bg:var(--pd)}.f-observer{--pt-bg:var(--pe)}.f-network{--pt-bg:var(--pf)}.f-aws{--pt-bg:var(--pg)}
@media(min-width:600px){.card{grid-template-columns:1fr 132px}.th{width:132px;height:104px}.card h2{font-size:20.5px}}
.pbn{display:flex;align-items:center;gap:6px;padding:26px 22px;margin:0 0 1.6em;border-radius:var(--r);background:var(--pt-bg,var(--pa));color:var(--pt)}.pbn .mt{flex:none;width:72px;height:72px;opacity:.9}.pbn small{font-size:13px;font-weight:700;letter-spacing:.04em}.pbn h2{font:800 25px/1.4 var(--serif);letter-spacing:-.035em;margin:.15em 0 .3em}.pbn p{margin:0;font-size:14px;opacity:.8}@media(min-width:900px){.pbn{padding:38px 32px}.pbn .mt{width:96px;height:96px}.pbn h2{font-size:32px}}
.fl{display:block;font-size:12.5px;font-weight:700;color:var(--acc);letter-spacing:.03em;margin-bottom:2px}.st{font-size:12.5px!important;color:var(--ink)!important}
.tg{display:flex;flex-wrap:wrap;gap:8px;margin:1.6em 0 0}.tg span{font-size:13.5px;padding:3px 12px;border:1px solid var(--line);border-radius:99px;color:var(--mute)}
article{line-height:2}article p{margin:1.35em 0}
article h3{border-top:0!important;padding-top:0!important;margin-top:2.6em!important}article h3::before{content:"";display:block;width:28px;height:4px;background:var(--ink);margin-bottom:.7em}
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
footer{margin-top:56px;padding:18px 0 8px;border-top:1px solid var(--line);color:var(--mute);font-size:14px;text-align:center}footer small{display:block;margin-top:2px;font-size:12px}
.about-hero{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.card{transition:transform .12s ease}.card:active{transform:scale(.985)}
#pg{position:fixed;top:0;left:0;right:0;height:3px;background:var(--acc);transform:scaleX(0);transform-origin:0 50%;z-index:30}
#up{position:fixed;right:16px;bottom:18px;width:46px;height:46px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .25s,transform .25s;z-index:15}#up svg{width:20px;height:20px}#up.on{opacity:1;transform:none;pointer-events:auto}
#pl{position:fixed;top:0;left:50%;width:44px;height:44px;z-index:40;pointer-events:none;opacity:0;transform:translate(-50%,-20px);transform-origin:50% 0}#pl img{position:absolute;left:4px;top:4px;width:36px;height:36px;border-radius:50%;object-fit:cover}#pl svg{position:absolute;inset:0;width:44px;height:44px;transform:rotate(-90deg)}#pl .tk{fill:var(--card);stroke:var(--line);stroke-width:2.5}#pl .ar{fill:none;stroke:var(--acc);stroke-width:2.5;stroke-linecap:round;stroke-dasharray:119.4;stroke-dashoffset:119.4}#pl.go svg{animation:plr .8s linear infinite}#pl.go .ar{stroke-dashoffset:90}#pl b{background:var(--card);border:1px solid var(--line);padding:4px 10px;border-radius:99px;position:absolute;top:52px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:12px;font-weight:600;line-height:1;color:var(--mute);opacity:0}#pl.go b{opacity:1}@keyframes plr{to{transform:rotate(270deg)}}#pl.go{transition:transform .15s,opacity .15s}
header h1,.pr h2,blockquote{font-family:var(--hand);font-weight:400;letter-spacing:0}
header h1{font-size:27px}.pr h2{font-size:26px}blockquote{font-size:1.1em}
.card h2,.pbn h2,main>h2,article h3,article h4{font-weight:700;letter-spacing:-.01em}.card h2{font-size:21px}.pbn h2{font-size:27px}main>h2{font-size:29px}article h3{font-size:24px}article h4{font-size:21px}.fl,.pbn small{font-size:14px;font-weight:700}aside h3{font-size:13px;font-weight:700;letter-spacing:.02em}
@media(min-width:900px){header h1{font-size:32px}.card h2{font-size:23px}.pbn h2{font-size:34px}.pr h2{font-size:30px}main>h2{font-size:32px}article h3{font-size:27px}}
/* frame polish */
:root{--r:14px;--sh:0 1px 2px rgba(60,40,10,.06),0 6px 18px -8px rgba(60,40,10,.14)}
:root[data-theme=dark]{--sh:0 1px 2px rgba(0,0,0,.3),0 6px 18px -8px rgba(0,0,0,.5)}@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--sh:0 1px 2px rgba(0,0,0,.3),0 6px 18px -8px rgba(0,0,0,.5)}}
body{background:radial-gradient(120% 60% at 50% -10%,rgba(255,255,255,.55),transparent 60%) var(--bg)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) body{background:var(--bg)}}:root[data-theme=dark] body{background:var(--bg)}
header{border-bottom:0;position:relative;padding-bottom:12px;margin-bottom:22px}
header::after{content:"";position:absolute;left:18px;right:18px;bottom:0;height:6px;background:radial-gradient(circle,var(--line) 1.6px,transparent 2px) 0 50%/12px 6px repeat-x;opacity:.9}
header h1 a::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--acc);margin-right:9px;vertical-align:.12em;box-shadow:0 0 0 4px rgba(184,67,27,.14)}
.pr{padding:18px;margin:0 0 14px;border:1px solid var(--line);border-radius:calc(var(--r) + 4px);background:var(--card);box-shadow:var(--sh)}
.pr img{box-shadow:0 0 0 3px var(--card),0 0 0 4.5px var(--acc)}
.chips{gap:8px;margin-top:14px;padding-top:2px}
.chips a{border-radius:99px;background:var(--card);box-shadow:var(--sh);border-color:transparent;transition:transform .15s,background .15s,color .15s}
.chips a:hover{transform:translateY(-1px);background:var(--acc);color:var(--bg);border-color:transparent}
ul.l{display:grid;gap:12px}
.card{padding:16px;border:1px solid var(--line);border-bottom:1px solid var(--line);border-radius:calc(var(--r) + 2px);background:var(--card);box-shadow:var(--sh);transition:transform .2s,box-shadow .2s,border-color .2s}
.card:hover{transform:translateY(-2px);border-color:var(--mute)}
.th{border-radius:var(--r)}
.card .fl{display:inline-block;padding:1px 9px;border-radius:99px;background:var(--pt-bg,var(--pa));color:var(--ink);font-size:12.5px;margin-bottom:2px}
footer{border-top:0;margin-top:48px;padding-top:34px;position:relative}
footer::before{content:"\\2766";position:absolute;top:0;left:50%;transform:translateX(-50%);color:var(--acc);font-size:20px;line-height:1;opacity:.7;background:var(--bg);padding:0 12px}
footer::after{content:"";position:absolute;top:10px;left:0;right:0;height:1px;background:var(--line);z-index:-1}
@media(min-width:900px){.pr{padding:22px 24px}.card{padding:20px}}
.fb{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:10px 0;font:inherit;color:var(--ink);background:none;border:0;cursor:pointer;text-align:left}.fb:hover{color:var(--acc)}.fb:focus-visible{outline:2px solid var(--acc);outline-offset:2px}.fb .mt{width:20px;height:20px;flex:none}.fb>span:first-of-type{flex:1}.fb .n{margin-left:auto;color:var(--mute);font-size:12px;font-variant-numeric:tabular-nums}.cv{width:16px;height:16px;flex:none;color:var(--mute);transition:transform .2s}.fb[aria-expanded=true] .cv{transform:rotate(180deg)}
aside li:has(>.fb){display:block}.sub li a{padding:7px 0 7px 28px!important;min-height:0!important;font-size:.93em;line-height:1.45}.sub li.sh a{font-weight:700;color:var(--mute);padding-top:10px!important}.sub li a.all{color:var(--acc)}.sub li{display:block!important}
#vs{margin-bottom:8px;font-size:13.5px;letter-spacing:.02em}#vs b{color:var(--ink);font-variant-numeric:tabular-nums}
@media(min-width:900px){aside{background:none}}
mark{background:linear-gradient(transparent 36%,var(--hl) 36%,var(--hl) 94%,transparent 94%);color:inherit;padding:0 .14em;margin:0 -.04em;border-radius:2px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.a-made{--hl:var(--k1);--ul:#e0a800}.a-notes{--hl:var(--k2);--ul:#3f9b64}.a-ai{--hl:var(--k3);--ul:#d9627f}.a-mac{--hl:var(--k4);--ul:#3d8fcb}.a-observer{--hl:var(--k5);--ul:#d98a3a}.a-network{--hl:var(--k6);--ul:#2f9d93}.a-aws{--hl:var(--k7);--ul:#d98a1c}
article a{text-decoration-color:var(--ul);text-decoration-thickness:2px}article h3{text-decoration:underline;text-decoration-color:var(--ul);text-decoration-thickness:3px;text-underline-offset:7px}article blockquote{border-left-color:var(--ul)}article .lead{border-left-color:var(--ul)}
@media(prefers-reduced-motion:reduce){#pl,#up,.card,.th{transition:none}#pl.go svg{animation:none}}`;

const FAV = '<link rel="icon" href="/favicon.svg" type="image/svg+xml">';

const APP = `const de=document.documentElement,rm=matchMedia('(prefers-reduced-motion:reduce)').matches,fine=matchMedia('(hover:hover) and (pointer:fine)').matches,pg=document.getElementById('pg'),up=document.getElementById('up');
let tk=0;addEventListener('scroll',()=>{if(tk)return;tk=requestAnimationFrame(()=>{tk=0;const y=scrollY,h=de.scrollHeight-innerHeight;if(pg)pg.style.transform='scaleX('+(h>0?Math.min(1,y/h):0)+')';up.classList.toggle('on',y>700)})},{passive:true});
up.onclick=()=>scrollTo({top:0,behavior:rm?'auto':'smooth'});
if(fine&&!rm)document.addEventListener('pointermove',e=>{const t=e.target.closest&&e.target.closest('.th');document.querySelectorAll('.th.tl').forEach(x=>{if(x!==t){x.style.transform='';x.classList.remove('tl')}});if(!t)return;const r=t.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;t.classList.add('tl');t.style.transform='perspective(400px) rotateY('+px*14+'deg) rotateX('+-py*14+'deg) scale(1.04)'});
if(!fine&&'ontouchstart' in window){let sy=0,dy=0,on=0,el=0;const T=70;
addEventListener('touchstart',e=>{on=scrollY===0&&!dr.classList.contains('open')&&e.touches.length===1;if(on){sy=e.touches[0].clientY;dy=0}},{passive:true});
addEventListener('touchmove',e=>{if(!on)return;dy=e.touches[0].clientY-sy;if(dy<=0||scrollY>0){if(el)el.style.opacity=0;return}
if(!el){el=document.createElement('div');el.id='pl';el.innerHTML='<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="tk" cx="22" cy="22" r="19"/><circle class="ar" cx="22" cy="22" r="19"/></svg><b role="status">불러오는 중</b>';document.body.appendChild(el)}
const k=Math.min(dy/T,1.4),m=Math.min(dy,110);el.querySelector('.ar').style.strokeDashoffset=119.4*(1-Math.min(dy/T,1));el.style.opacity=Math.min(1,dy/40);el.style.transform='translate(-50%,'+(m*.6-20)+'px) scale('+(.6+k*.4)+','+(.6+k*.4)+')'},{passive:true});
addEventListener('touchend',()=>{if(!on||!el)return;on=0;if(dy>T){el.classList.add('go');el.querySelector('.ar').style.strokeDashoffset='';setTimeout(()=>location.reload(),700)}else{el.style.opacity=0;const e=el;el=0;setTimeout(()=>e.remove(),200)}});
de.style.overscrollBehaviorY='contain'}`;
const JS = `const i=document.getElementById('q'),r=document.getElementById('sr'),dr=document.getElementById('dr'),bd=document.getElementById('bd'),mb=document.getElementById('mb'),tg=document.getElementById('tg');let d;
i.oninput=async()=>{const q=i.value.trim().toLowerCase();if(!q){r.style.display='none';return}d??=await(await fetch('${BASE}/search.json')).json();
const h=d.filter(p=>(p.t+' '+p.x).toLowerCase().includes(q)).slice(0,8);r.innerHTML=h.map(p=>'<li><a href="${BASE}/posts/'+p.s+'/">'+p.t.replace(/</g,'&lt;')+'</a></li>').join('')||'<li><a>검색 결과가 없어요</a></li>';r.style.display='block'};
const hs=document.getElementById('hs'),dl=()=>document.documentElement;const set=o=>{dr.classList.toggle('open',o);bd.classList.toggle('open',o);document.body.classList.toggle('lock',o);mb.setAttribute('aria-expanded',o);if(o){if(!(history.state&&history.state.d))history.pushState({d:1},'')}(o?dr.querySelector('button'):mb).focus()};
const shut=()=>{if(history.state&&history.state.d)history.back();else set(false)};
if(hs)hs.onclick=()=>{set(true);i.focus()};
mb.onclick=()=>dr.classList.contains('open')?shut():set(true);bd.onclick=dr.querySelector('button').onclick=shut;
addEventListener('popstate',()=>{if(dr.classList.contains('open'))set(false)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&dr.classList.contains('open'))shut()});dr.onclick=e=>{if(e.target.closest('li a[href]'))set(false)};
{let x0,y0,t0,dx,W,m,mv;const E=24;
addEventListener('touchstart',e=>{if(innerWidth>=900||e.touches.length>1){m=0;return}const t=e.touches[0],o=dr.classList.contains('open');m=o?(dr.contains(e.target)||e.target===bd?2:0):t.clientX<=E?1:0;if(m){x0=t.clientX;y0=t.clientY;t0=e.timeStamp;dx=0;mv=0;W=dr.offsetWidth}},{passive:true});
addEventListener('touchmove',e=>{if(!m)return;const t=e.touches[0];dx=t.clientX-x0;if(!mv){if(Math.abs(t.clientY-y0)>Math.abs(dx)&&Math.abs(t.clientY-y0)>8){m=0;return}if(Math.abs(dx)<8)return;mv=1;dr.classList.add('drag');bd.classList.add('drag')}
const p=Math.min(1,Math.max(0,m===1?dx/W:1+dx/W));dr.style.transform='translateX('+(p-1)*W+'px)';bd.style.opacity=p;if(m===1)document.body.classList.add('lock')},{passive:true});
addEventListener('touchend',e=>{if(!m||!mv){m=0;return}const v=dx/Math.max(1,e.timeStamp-t0),p=Math.min(1,Math.max(0,m===1?dx/W:1+dx/W)),o=Math.abs(v)>.4?v>0:p>.5;dr.classList.remove('drag');bd.classList.remove('drag');dr.style.transform='';bd.style.opacity='';m=0;const was=dr.classList.contains('open');if(o&&!was)set(true);else if(!o&&was)shut();else if(!o)document.body.classList.remove('lock')})}
tg.onclick=()=>{const de=document.documentElement,dk=de.dataset.theme?de.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches,n=dk?'light':'dark';de.dataset.theme=n;try{localStorage.t=n}catch(e){}tg.setAttribute('aria-pressed',n==='dark')}
${APP}
try{const c=document.body.dataset.cf;if(c&&!localStorage.me){const b=document.createElement('script');b.defer=true;b.src='https://static.cloudflareinsights.com/beacon.min.js';b.dataset.cfBeacon=JSON.stringify({token:c});document.body.appendChild(b)}}catch(e){}
fetch('${BASE}/stats.json').then(r=>r.ok?r.json():0).then(d=>{const v=document.getElementById('vs');if(d&&v&&Number.isFinite(d.today)&&Number.isFinite(d.total)){const b=v.querySelectorAll('b');b[0].textContent=d.today.toLocaleString();b[1].textContent=d.total.toLocaleString();v.hidden=false}}).catch(()=>{});
dr.addEventListener('click',e=>{const f=e.target.closest('.fb');if(f){const o=f.nextElementSibling.classList.toggle('open');f.setAttribute('aria-expanded',o)}});`;
const CFTOKEN = existsSync('analytics-token.txt') ? readFileSync('analytics-token.txt', 'utf8').trim() : ''; // Cloudflare Web Analytics site token(공개 값). 없으면 비콘을 넣지 않는다
const BEACON = CFTOKEN ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${CFTOKEN}"}'></script>` : '';
const EARLY = `try{var t=localStorage.t;if(t)document.documentElement.dataset.theme=t;if(/[?&]me=1/.test(location.search))localStorage.me=1}catch(e){}`;
const ICON = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const sri = (t) => `'sha256-${createHash('sha256').update(t).digest('base64')}'`;
const CSP = `default-src 'self'; script-src 'self' ${sri(EARLY)} ${sri(JS)} https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'self'; form-action 'none'`;
const layout = (title, body, on = '', desc = SITE, path = '/', post = false) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${URL}${path}"><meta property="og:type" content="website"><meta property="og:site_name" content="${SITE}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${URL}${path}"><meta property="og:image" content="${URL}/og.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${BASE}/favicon.svg" type="image/svg+xml"><link rel="preload" href="${BASE}/fonts/gowun-subset.woff2" as="font" type="font/woff2" crossorigin><meta name="theme-color" content="#f3eee1"><script>${EARLY}</script><style>${CSS}</style></head><body${CFTOKEN ? ` data-cf="${CFTOKEN}"` : ''}><div class="w"><header><div class="hd"><div class="bar"><button class="bt" id="mb" aria-label="메뉴 열기" aria-expanded="false" aria-controls="dr">${ICON('<path d="M4 7h16M4 12h16M4 17h16"/>')}</button><h1><a href="${BASE}/">${SITE}</a></h1><button class="bt" id="tg" aria-label="화면 모드 전환" aria-pressed="false">${ICON('<circle cx="12" cy="12" r="8"/><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>')}</button></div><p>비서가 쓰고, 그누가 읽어요</p><nav>${Object.entries(FOLDERS).map(([n, s]) => `<a href="${BASE}/f/${s}/"${on === s ? ' class="on"' : ''}>${n}</a>`).join('')}<a href="${BASE}/p/about-biseo/"${on === 'about-biseo' ? ' class="on"' : ''}>비서 소개</a></nav></div></header><div class="g"><main>${body}</main>${side(on)}</div><footer><div id="vs" hidden>Today <b></b> / Total <b></b></div>이 블로그는 AI 비서가 씁니다 ᕦ(ò_óˇ)ᕤ<small>Written by Gnu's AI secretary</small></footer></div><div id="bd"></div>${post ? '<div id="pg" aria-hidden="true"></div>' : ''}<button id="up" aria-label="맨 위로">${ICON('<path d="M12 19V5M5 12l7-7 7 7"/>')}</button><script>${JS}</script></body></html>`;
const subList = (n, s, on) => { const ps = posts.filter((p) => p.folder === n), subs = Object.entries(SUBS[n] ?? {}).filter(([k]) => subOf(n, k).length), pl = (q) => q.map((p) => `<li><a class="pt" href="${BASE}/posts/${p.slug}/"${on === 'post:' + p.slug ? ' style="font-weight:700;color:var(--acc)"' : ''}>${esc(p.title)}</a></li>`).join(''); return `<div class="sub${on === s || on.startsWith(s + '/') || ps.some((p) => on === 'post:' + p.slug) ? ' open' : ''}"><ul><li><a class="all" href="${BASE}/f/${s}/">${n} 전체 보기</a></li>${subs.map(([k, v]) => `<li class="sh"><a href="${BASE}/f/${s}/${v}/">${k}</a></li>${pl(subOf(n, k))}`).join('')}${pl(ps.filter((p) => !p.sub))}</ul></div>`; };
const side = (on) => `<aside id="dr" aria-label="사이드바"><div class="dh"><span>메뉴</span><button class="bt" aria-label="메뉴 닫기">${ICON('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div><div class="sq"><input id="q" type="search" placeholder="글 검색" autocomplete="off" aria-label="글 검색"><ul id="sr"></ul></div><div class="pf"><img src="${BASE}/img/biseo.png" alt="그누의 AI 비서" width="52" height="52"><b>그누네 AI 비서</b><span>그누가 만들고 공부한 것을 대신 적어요.</span><span class="st">글 ${posts.length}편 / 폴더 ${Object.keys(FOLDERS).length}개</span><a href="${BASE}/p/about-biseo/">비서 소개</a></div><h3>카테고리</h3><ul>${Object.entries(FOLDERS).map(([n, s]) => `<li><button type="button" class="fb" aria-expanded="${on === s || on.startsWith(s + '/') || posts.some((p) => p.folder === n && on === 'post:' + p.slug)}">${motif(s, 20)}<span>${n}</span><span class="n">${posts.filter((p) => p.folder === n).length}</span><svg class="cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>${subList(n, s, on)}</li>`).join('')}</ul><h3>최근 글</h3><ul>${posts.slice(0, 5).map((p) => `<li><a href="${BASE}/posts/${p.slug}/">${esc(p.title)}</a></li>`).join('')}</ul><h3>더 보기</h3><ul>${pages.map((p) => `<li><a href="${BASE}/p/${p.slug}/">${esc(p.title)}</a></li>`).join('')}</ul></aside>`;
const list = (ps) => `<ul class="l">${ps.map((p) => `<li class="card"><div><small class="fl">${lbl(p)}</small><h2><a href="${BASE}/posts/${p.slug}/">${esc(p.title)}</a></h2><p>${esc(p.sum)}</p><div class="m">${p.date} / ${mins(p)}분</div></div><div class="th f-${FOLDERS[p.folder]}" aria-hidden="true">${motif(iconOf(p), 64)}</div></li>`).join('') || '<li>아직 글이 없어요</li>'}</ul>`.replace(/ decoration/g, '');
const NOW = new Date().toISOString().slice(0, 7);
const profile = () => `<section class="pr"><img src="${BASE}/img/biseo.png" alt="" width="56" height="56"><div><h2>그누네 AI 비서의 블로그</h2><p>그누가 만들고 공부한 것을 비서가 대신 적어요.</p><p class="st2">글 ${posts.length}편 / 폴더 ${Object.keys(FOLDERS).length}개 / 이번 달 ${posts.filter((p) => p.date.startsWith(NOW)).length}편</p></div><div class="chips"><a href="${BASE}/">전체</a>${Object.entries(FOLDERS).map(([n, s]) => `<a href="${BASE}/f/${s}/">${n}</a>`).join('')}<button type="button" id="hs" class="sb">글 검색</button></div></section>`;
const mins = (p) => Math.max(1, Math.round(p.len / 500));
const out = (path, html) => { mkdirSync(`${OUT}/${path}`, { recursive: true }); writeFileSync(`${OUT}/${path}/index.html`, html); };
const withToc = (html) => { let n = 0; const hs = []; const h = html.replace(/<h3>([\s\S]*?)<\/h3>/g, (_, t) => { hs.push([++n, t]); return `<h3 id="s${n}">${t}</h3>`; });
  const lead = h.replace(/<p>(?!연재)/, '<p class="lead">');
  return [lead, hs.length >= 3 ? `<details class="toc"><summary>목차</summary><ol>${hs.map(([i, t]) => `<li><a href="#s${i}">${t.replace(/<[^>]+>/g, '')}</a></li>`).join('')}</ol></details>` : ''] };
const tg = (p) => { const t = (p.tags || '').replace(/[\[\]]/g, '').split(',').map((x) => x.trim()).filter(Boolean); return t.length ? `<p class="tg">${t.map((x) => `<span>#${esc(x)}</span>`).join('')}</p>` : ''; };
const pn = (p) => { const l = SERIES.has(p.folder) ? byFolder(p.folder) : posts.filter((x) => x.folder === p.folder); const i = l.indexOf(p); const a = l[i - 1], b = l[i + 1];
  return a || b ? `<nav class="pn" aria-label="이전 다음 글">${a ? `<a href="${BASE}/posts/${a.slug}/"><small>이전 글</small>${esc(a.title)}</a>` : ''}${b ? `<a class="nx" href="${BASE}/posts/${b.slug}/"><small>다음 글</small>${esc(b.title)}</a>` : ''}</nav>` : ''; };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
cpSync('static', OUT, { recursive: true });
writeFileSync(`${OUT}/search.json`, JSON.stringify(posts.map((p) => ({ s: p.slug, t: p.title, x: p.text }))));
writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${URL}/</loc></url>${posts.map((p) => `<url><loc>${URL}/posts/${p.slug}/</loc><lastmod>${p.date}</lastmod></url>`).join('')}</urlset>`);
writeFileSync(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${URL}/sitemap.xml\n`);
writeFileSync(`${OUT}/index.html`, layout(SITE, profile() + list(posts), '', '비서가 쓰고 그누가 읽는, 만들고 공부한 것들의 기록'));
writeFileSync(`${OUT}/404.html`, layout('없는 페이지', '<h2>없는 페이지예요</h2><p><a href="/">처음으로 돌아가기</a></p>'));
for (const [n, s] of Object.entries(FOLDERS)) for (const [k, v] of Object.entries(SUBS[n] ?? {})) if (subOf(n, k).length) out(`f/${s}/${v}`, layout(`${n} / ${k} | ${SITE}`, `<h2><a href="${BASE}/f/${s}/" class="bc">${n}</a> / ${k}</h2>${list(subOf(n, k))}`, `${s}/${v}`, `${n} / ${k} 글 모음`, `/f/${s}/${v}/`));
for (const [n, s] of Object.entries(FOLDERS)) out(`f/${s}`, layout(`${n} | ${SITE}`, `<h2>${n}</h2>${list(byFolder(n))}`, s, `${n} 글 모음`, `/f/${s}/`));
for (const p of pages) out(`p/${p.slug}`, layout(`${p.title} | ${SITE}`, `<article><h2>${esc(p.title)}</h2>${p.html}</article>`, p.slug, p.title, `/p/${p.slug}/`));
for (const p of posts) { const [h, toc] = withToc(p.html);
  out(`posts/${p.slug}`, layout(`${p.title} | ${SITE}`, `<article class="a-${FOLDERS[p.folder]}"><div class="pbn f-${FOLDERS[p.folder]}">${motif(iconOf(p), 96)}<div><small>${lbl(p)}</small><h2>${esc(p.title)}</h2><p>by 그누네 AI 비서 / ${p.date} / 읽는 시간 ${mins(p)}분</p></div></div>${toc}${h}<p class="sig">${p.lang === 'en' ? "Written by Gnu's AI secretary" : '이 글은 그누의 AI 비서가 작성했습니다'} ${MOODS[p.mood ?? 'smile']}</p>${tg(p)}${pn(p)}</article>`, p.folder && FOLDERS[p.folder], p.sum || p.title, `/posts/${p.slug}/`, true)); }
console.log(`글 ${posts.length}편(${ALL ? '전체 미리보기' : '승인분'}), 페이지 ${pages.length}개 -> ${OUT}/`);

