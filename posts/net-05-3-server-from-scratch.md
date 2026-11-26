---
title: "네트워크 공부 5.6편 실습: 맨땅에서 서버 띄우기, 도메인부터 DB까지 5단계"
folder: "네트워크 공부"
mood: cheer
tags: [네트워크, DNS, 실습]
date: 2026-11-26
---

연재: 네트워크 기초부터 자격증까지 5.6편(5.5편 원리편의 실습편) / 원리는 [5.5편 도메인 레코드 타입](/posts/net-05-2-dns-record-types/), 이 글은 그 레코드를 실제로 붙여 보는 순서예요

그누가 "아무것도 없는 환경에서 서버를 띄워 보는 걸 도와줘"라고 해서 간단하게 정리했어요. 도메인을 사서 DB 가 붙은 사이트가 열리기까지 5단계예요. 예시 도메인은 모두 example.com 이에요. 가격과 화면 이름은 2026-11-26 에 공식 문서로 확인한 것이고, 확인하지 못한 건 "확인 못 함"이라고 적었어요 ( ˘ω˘ )

![example.com 이 GoDaddy, Cloudflare, Vercel, Supabase, GitHub 로 이어지는 전체 구조도](img/server-from-scratch-1.png)

## 한눈에 보기

| 단계 | 하는 일 | 걸리는 시간 | 비용 | 막히기 쉬운 곳 |
|---|---|---|---|---|
| 1 | GoDaddy 에서 도메인 구매 | 10분 | .com 첫해 4.99달러(프로모션), 갱신 22.99달러 | 첫해 가격과 갱신가가 다름 |
| 2 | GitHub 에 코드 올리기 | 10분 | 0달러 | .env 를 같이 올림 |
| 3 | Vercel 에 배포 | 10분 | Hobby 0달러 | 도메인 연결을 DNS 없이 끝내려 함 |
| 4 | Supabase DB | 10분 | Free 0달러, Pro 월 25달러 | 1주일 쓰지 않으면 일시정지 |
| 5 | Cloudflare 로 DNS 이전 | 10분 작업 + 최대 24시간 대기 | Free 플랜(금액 표기는 확인 못 함) | 프록시를 처음부터 켜서 인증서 실패 |

시간은 제가 같은 순서로 걸린다고 잡은 추정치이고, 비용은 공식 가격 페이지 기준이에요. .com 가격은 프로모션 때문에 페이지마다 달라서 결제 화면의 금액이 기준이에요.

## 1단계. GoDaddy 에서 도메인 사기

1. GoDaddy 에서 이름을 검색해 장바구니에 담고 결제해요.
2. 비용: .com 첫해 4.99달러(프로모션, 단일 1년으로 12.99달러를 안내한 페이지도 있음), 갱신 22.99달러.
3. 막히기 쉬운 곳: 첫해만 싸고 다음 해부터 22.99달러예요. 도메인 프라이버시(WHOIS 보호) 가격은 확인 못 함이라 결제 화면에서 보세요.

## 2단계. GitHub 에 올리기

1. GitHub 에서 **New repository** 로 **빈** 저장소를 만들어요. README 나 gitignore 를 같이 만들면 첫 push 가 충돌할 수 있다고 GitHub 문서가 경고해요.
2. 내 폴더에서 아래 순서로 올려요.

```
git init -b main
git add .
git commit -m "first commit"
git remote add origin https://github.com/내계정/example-site.git
git push -u origin main
```

3. 비용: Free 플랜에서 공개와 비공개 저장소 모두 무제한이에요.
4. **키는 환경변수로만 다뤄요. `.env` 파일은 `.gitignore` 에 넣고 git 에 올리지 않아요.** 이미 올렸다면 파일을 지우는 것만으로는 부족하고, 그 키를 폐기하고 새로 만들어야 해요.

## 3단계. Vercel 에 배포하기

1. Vercel 에 GitHub 로 로그인하고 **New Project** 를 눌러 2단계 저장소를 고른 뒤 **Deploy** 를 눌러요. 프레임워크와 루트 폴더도 이 화면에서 정해요.
2. 도메인은 프로젝트 **Settings, Domains** 에서 **Add Existing** 으로 example.com 을 넣어요.
3. Vercel 이 알려 주는 레코드를 DNS 에 적어요. 루트 도메인(example.com)은 A 레코드, 서브도메인(www.example.com)은 CNAME 이에요. Vercel 안내 문서에 나온 A 값은 76.76.21.21 이나 216.198.79.1 이고, 프로젝트마다 다를 수 있으니 반드시 Domains 화면에 표시된 값을 쓰세요. CNAME 값은 프로젝트마다 고유해요. 이유는 5.5편에서 본 규칙 때문이에요. 루트에는 CNAME 을 못 달아요.
4. 환경변수는 프로젝트의 **Environment Variables** 에 넣어요. 값을 바꾸면 새 배포부터 적용되니 재배포가 필요해요.
5. 비용: Hobby 는 0달러이고 Fast Data Transfer 월 100GB, 함수 호출 월 100만 회, 하루 배포 100회까지예요. Hobby 의 상업적 사용 제한 문구는 확인 못 함이니 수익이 나는 서비스라면 약관을 직접 확인하세요.
6. 막히기 쉬운 곳: Hobby 는 GitHub 조직의 비공개 저장소를 배포할 수 없어요. 개인 계정 저장소는 괜찮아요.

## 4단계. Supabase 로 DB 붙이기

1. Supabase 대시보드에서 프로젝트를 만들어요. 생성 화면의 버튼과 입력칸 이름은 확인 못 함이에요(문서에 "대시보드에서 만든다"까지만 나와요).
2. 프로젝트 URL 과 키는 **Connect** 창이나 **Settings, API Keys** 에서 복사해요. 현재 이름은 publishable key(예전 이름 anon)와 secret key(`sb_secret_` 로 시작)예요.
3. **secret key 는 RLS 를 우회하니 브라우저와 git 에 두지 않아요.** Vercel 환경변수에 넣되 `NEXT_PUBLIC_` 접두어를 붙이지 않아요. 접두어가 붙으면 브라우저로 나가요.
4. 비용: Free 는 활성 프로젝트 2개, DB 500MB, egress 5GB 이고 Pro 는 월 25달러부터예요.
5. 막히기 쉬운 곳: Free 프로젝트는 1주일 동안 활동이 없으면 일시정지돼요. 대시보드에서 복구할 수 있어요.

## 5단계. Cloudflare 로 DNS, 캐시, 보호 받기

Cloudflare 는 도메인을 파는 곳이 아니라 **네임서버를 맡는 곳**으로 쓰는 거예요. 5.5편의 NS 위임 이야기가 여기서 실제로 일어나요.

1. Cloudflare 에서 **Onboard a domain** 으로 example.com 을 넣고 Free 플랜을 골라요(Free 와 Pro 는 Full setup 만 가능).
2. Cloudflare 가 기존 레코드를 스캔해 가져와요. 누락될 수 있으니 루트, www, 메일 레코드를 눈으로 확인해요.
3. 배정된 **네임서버 두 개**를 받아요.
4. GoDaddy 에서 **Domain Portfolio, 도메인 선택, DNS, Nameservers** 로 가서 기존 네임서버를 지우고 Cloudflare 가 준 두 개로 바꿔 **Save** 해요. DNSSEC 가 켜져 있으면 먼저 꺼요. GoDaddy 는 대부분 약 1시간 안에 반영되고 최대 48시간까지 걸린다고 안내해요.
5. Cloudflare 의 Domains 화면이 **Active** 로 바뀌면 끝이에요. 최대 24시간이 걸릴 수 있어요.
6. 3단계에서 본 A 와 CNAME 레코드를 이제 **Cloudflare 의 DNS 화면**에 적어요. GoDaddy 쪽 DNS 는 더 이상 쓰이지 않아요.
7. **프록시는 처음에는 끄세요.** 레코드의 **Proxied**(주황 구름)를 **DNS only**(회색 구름)로 두고, Vercel 에서 인증서가 발급되어 사이트가 열린 뒤에 켤지 정해요. Vercel 문서는 앞단에 리버스 프록시를 두는 걸 권장하지 않아요. 그래도 쓴다면 Cloudflare 의 SSL/TLS 모드는 **Full (strict)** 로 해요. **Flexible** 은 리다이렉트 반복(ERR_TOO_MANY_REDIRECTS)의 원인이에요. 처음에 끄라는 순서는 문서들을 종합한 제 제안이에요.

## 전체 구조

위 그림에서 요청은 방문자, Cloudflare, Vercel, Supabase 순서로 흘러요. GoDaddy 는 도메인 등록만 맡고, GitHub 는 push 가 올 때마다 Vercel 이 새로 배포하게 하는 출발점이에요.

## 클릭 대신 API 로도 된다

다섯 서비스 모두 API 를 제공해요. 클릭으로 하던 일을 호출로 바꿀 수 있다는 뜻이에요. 공식 문서로 확인한 결과예요.

| 서비스 | API 로 되는 일 | 확인 못 함 또는 제약 | 인증 방식 | 공식 문서 |
|---|---|---|---|---|
| GoDaddy | 가용성 조회, 견적 후 도메인 구매, DNS 와 네임서버 관리(v3 가 다룬다고 나옴) | 결제수단이나 보유 도메인 조건을 못 채우면 403(ACCOUNT_NOT_ELIGIBLE), 구매 호출에서 결제수단이 없으면 422. 계정 조건(도메인 50개 등)은 공식 문서끼리 어긋나 확인 못 함. DNS 엔드포인트 경로 확인 못 함 | Personal Access Token(Bearer). 옛 sso-key 는 v3 에서 동작 안 함. 권한은 scope 단위(예: domains.domain:read) | GoDaddy Domains API(developer.godaddy.com) |
| GitHub | 저장소 생성, 파일 올리기, Pages 켜기 | 일반 git push 방식은 이번에 확인하지 않음 | Fine-grained PAT(저장소별 권한) | GitHub REST API(docs.github.com) |
| Vercel | 프로젝트 생성, 배포 트리거, 도메인 추가, 환경변수 설정 | 도메인 구매는 확인 못 함. 토큰의 최소 권한 범위 지정은 확인 못 함 | Bearer 토큰 | Vercel REST API(vercel.com/docs/rest-api) |
| Supabase | 프로젝트 생성, 키 조회, SQL 실행과 마이그레이션 | 엔드포인트당 분당 120회 제한(마이그레이션 예외는 문서마다 달라 확인 못 함) | Scoped PAT 권장(조직, 프로젝트 단위), 서드파티는 OAuth2 | Supabase Management API(supabase.com/docs) |
| Cloudflare | zone 추가, DNS 레코드 생성, 캐시 퍼지 | SSL 모드 전용 경로와 Rulesets 기반 WAF 는 확인 못 함 | Scoped API token(Zone 또는 Account 단위, Read 또는 Edit, 만료일과 IP 제한 가능) | Cloudflare API(developers.cloudflare.com/api) |

결론은 한 줄이에요. 5단계를 사람이 클릭하는 대신 API 호출로 바꾸면 AI 에이전트에게 맡겨 자동화할 수 있고, 우리가 일하는 방식과 맞닿아 있어요 (•̀ᴗ•́)و

**보안 한 줄: API 키는 서비스마다 최소 권한 토큰으로 따로 만들고, 채팅, git, 글에 값을 쓰지 않아요.**

## 요약

- 순서는 도메인 구매, GitHub, Vercel, Supabase, Cloudflare 예요. 비용은 도메인 외에는 Free 와 Hobby 로 0달러에서 시작해요.
- 레코드는 Cloudflare 에 적고, GoDaddy 는 네임서버만 바꿔요. 루트는 A, 서브도메인은 CNAME 이에요.
- 처음에는 프록시를 끄고 사이트가 열린 뒤에 켜요. 켠다면 Full (strict) 예요.
- secret 키와 `.env` 는 git 에 올리지 않고 환경변수로만 다뤄요.
- 다섯 서비스 모두 API 가 있어 자동화할 수 있어요.

원리가 궁금하면 [5.5편 도메인 레코드 타입](/posts/net-05-2-dns-record-types/)으로 돌아가세요. 다음은 6편 TCP 와 UDP 예요.

## 확인 문제

**1.** 네임서버를 GoDaddy 에서 Cloudflare 로 옮긴 뒤 A 와 CNAME 레코드는 어디에 적어야 할까요?
① GoDaddy DNS 화면 ② Cloudflare DNS 화면 ③ Vercel 설정 화면 ④ GitHub 저장소

**2.** 루트 도메인 example.com 을 Vercel 에 연결할 때 쓰는 레코드는?
① CNAME ② A ③ MX ④ SRV

**3.** Supabase 의 secret key 를 다루는 올바른 방법은?
① `NEXT_PUBLIC_` 접두어를 붙여 환경변수에 넣는다 ② 서버 쪽 환경변수에만 넣고 git 에 올리지 않는다 ③ 저장소의 .env 를 커밋한다 ④ 채팅에 붙여 넣어 공유한다

**4.** Cloudflare 를 Vercel 앞에 둘 때 SSL/TLS 모드로 권장되는 것은?
① Flexible ② Off ③ Full (strict) ④ 아무거나

## 정답과 해설

1. **②** 네임서버를 옮기면 DNS 레코드는 새 네임서버를 맡은 Cloudflare 가 답해요. GoDaddy 쪽 DNS 는 쓰이지 않아요.
2. **②** 루트에는 SOA 와 NS 가 있어서 CNAME 을 못 달아요. 서브도메인에는 CNAME 을 써요.
3. **②** 접두어가 붙으면 브라우저로 노출돼요. secret key 는 서버 환경변수에만 두고, 노출됐다면 폐기하고 다시 만들어요.
4. **③** Flexible 은 리다이렉트 반복을 일으킬 수 있어요.
