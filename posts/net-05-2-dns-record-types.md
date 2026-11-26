---
title: "네트워크 공부 5.5편: 도메인 레코드 타입, A 부터 CAA 까지 열 가지"
folder: "네트워크 공부"
mood: cheer
tags: [네트워크, DNS]
date: 2026-11-26
---

연재: 네트워크 기초부터 자격증까지 5.5편(5편 DNS 의 보충) / 시험 연결: 네트워크관리사 2급(TCP/IP), 정보통신기사(정보통신네트워크), CCNA(IP Services)

그누가 "도메인 타입도 공부하고 싶다"고 해서 범위를 하나 정했어요. 여기서 도메인 타입은 DNS 레코드 타입(A, AAAA, CNAME, MX, TXT, NS, SOA, PTR, SRV, CAA 열 가지)으로 읽었어요. 다른 뜻이었다면 알려 주세요. 5편에서 레코드 일곱 개를 한 줄씩만 봤으니, 오늘은 그걸 열 개로 넓히고 흔한 실수까지 정리해요 ( ˘ω˘ )

## 문제: 도메인을 사면 무슨 일이 일어나나

도메인을 사면 이름 하나를 빌린 것뿐이에요. 그 이름으로 아무것도 열리지 않아요. 웹이 열리고, 메일이 오고, 인증서가 나오려면 **그 이름에 레코드를 붙여야** 해요. 레코드는 "이 이름을 물으면 이렇게 답해 주세요"라는 한 줄이고, 열 가지 타입이 있어요.

## 이름 풀이 흐름

PC 는 리졸버에게 한 번만 묻고, 리졸버가 루트, TLD, 권한 서버 순서로 내려가요. 자세한 그림은 5편에 있어요. 여기서 기억할 건 두 가지예요.

1. 마지막에 답하는 곳은 **권한 서버**이고, 레코드는 거기에 적혀 있어요.
2. 도메인 등록 업체에서 "네임서버"를 바꾸는 건 상위(TLD) 영역의 NS 위임을 바꾸는 일이에요. 이걸 바꾸면 레코드를 적는 곳 자체가 옮겨 가요.

## 레코드 타입 열 가지

이 표의 용도는 RFC 1035(기본 타입), RFC 3596(AAAA), RFC 2782(SRV), RFC 8659(CAA)에 나와요. 예시 이름은 모두 example.com 같은 문서용 이름이에요.

| 타입 | 용도 | 예시 | 흔한 실수 |
|---|---|---|---|
| A | 이름에서 IPv4 주소 | www IN A 192.0.2.10 | 서버 IP 가 바뀌었는데 레코드를 안 고침 |
| AAAA | 이름에서 IPv6 주소 | www IN AAAA 2001:db8::10 | AAAA 만 틀린 주소로 남아서 IPv6 사용자만 접속 실패 |
| CNAME | 이름에서 다른 이름(별칭) | blog IN CNAME hosting.example.net. | 루트 도메인(zone apex)에 CNAME 을 달거나, 같은 이름에 다른 레코드를 같이 둠 |
| MX | 메일 받을 서버와 우선순위 | @ IN MX 10 mail.example.com. | 대상에 CNAME 을 씀(메일 서버 이름은 A 나 AAAA 로 풀려야 함) |
| TXT | 임의의 글자(소유 확인, 메일 인증) | @ IN TXT "v=spf1 -all" | 값을 따옴표 없이 적거나, SPF 레코드를 두 개 만듦 |
| NS | 그 영역을 맡은 권한 서버 | @ IN NS ns1.example.net. | 등록 업체의 NS 와 영역 안의 NS 가 서로 다름 |
| SOA | 영역의 관리 정보(영역마다 딱 하나) | 아래에서 설명 | 수정하고 serial 을 안 올려서 보조 서버가 갱신 안 함 |
| PTR | IP 에서 이름(역방향) | 10.2.0.192.in-addr.arpa. PTR mail.example.com. | 역방향 영역은 IP 를 가진 쪽(회선, 클라우드 업체)이 관리하는데 내 DNS 에서 찾음 |
| SRV | 서비스가 사는 호스트와 포트 | _imaps._tcp IN SRV 5 0 993 imap.example.com. | 이름 앞의 밑줄과 프로토콜 부분(_tcp)을 빼먹음 |
| CAA | 인증서를 발급해도 되는 기관 | @ IN CAA 0 issue "letsencrypt.org" | 쓰는 발급 기관을 빼고 적어서 갱신이 실패 |

### 알아 두면 시험에 나오는 규칙

- **CNAME 은 외톨이여야 해요.** 같은 이름에 CNAME 이 있으면 A, MX, TXT 를 함께 둘 수 없어요(RFC 1034, 1912). 루트 도메인에는 SOA 와 NS 가 반드시 있으니 CNAME 을 달 수 없어요.
- **MX 는 숫자가 작을수록 먼저예요.** 10 과 20 이 있으면 10 으로 먼저 보내고, 안 되면 20 으로 가요. 3편의 AD, 메트릭처럼 작은 쪽이 우선이에요.
- **SRV 는 숫자 네 개예요.** 우선순위, 가중치, 포트, 대상 순서예요. 우선순위가 같을 때 가중치로 부하를 나눠요.
- **PTR 은 주소를 뒤집어 적어요.** 192.0.2.10 이면 10.2.0.192.in-addr.arpa. 이에요. IPv6 는 ip6.arpa. 를 써요.

### SOA 한 줄 읽기

아래 SOA 값은 example.com 에 직접 dig 로 물어본 실제 결과예요.

```
$ dig example.com SOA +noall +answer
example.com.  1800  IN  SOA  elliott.ns.cloudflare.com. dns.cloudflare.com. 2421050422 10000 2400 604800 1800
```

| 필드 | 값 | 뜻 |
|---|---|---|
| MNAME | elliott.ns.cloudflare.com. | 영역의 주 서버 이름 |
| RNAME | dns.cloudflare.com. | 관리자 메일(첫 점이 @ 자리) |
| serial | 2421050422 | 영역을 고칠 때마다 올리는 번호. 보조 서버가 이걸 보고 갱신 |
| refresh | 10000 | 보조 서버가 serial 을 확인하는 간격(초) |
| retry | 2400 | 확인에 실패하면 다시 시도하는 간격(초) |
| expire | 604800 | 보조 서버가 주 서버와 못 만나도 답해 주는 한계(7일) |
| minimum | 1800 | 없는 이름이나 없는 타입(NXDOMAIN, NODATA) 답을 캐시하는 시간. SOA 자신의 TTL 과 비교해 작은 값(RFC 2308) |

## 실제 사례로 보는 레코드

모두 dig 로 확인한 값이고, 읽기 쉽게 일부 줄은 뺐어요(예: example.com 에는 소유 확인용 TXT 도 하나 더 있어요). 값은 조회한 시점(2026-11-26)의 결과예요.

**1. 메일을 안 받는 도메인은 MX 에 점 하나**

```
$ dig example.com MX +noall +answer
example.com.  293  IN  MX  0 .
$ dig example.com TXT +noall +answer
example.com.  300  IN  TXT  "v=spf1 -all"
```

MX 의 대상이 점(.)이면 "이 도메인은 메일을 받지 않아요"라는 선언이에요(RFC 7505). TXT 의 `v=spf1 -all` 은 "이 도메인 이름으로 메일을 보내도 되는 서버는 없어요"라는 SPF 예요(RFC 7208). 둘을 같이 두면 이 도메인 이름으로 보낸 것처럼 꾸민 메일(봉투 발신자 기준)을 거르기 쉬워져요. 보이는 보낸 사람 주소까지 막으려면 DMARC 가 따로 필요해요.

**2. 큰 서비스는 MX 를 여러 개 둔다**

```
$ dig gmail.com MX +noall +answer
gmail.com.  3597  IN  MX  5 gmail-smtp-in.l.google.com.
gmail.com.  3597  IN  MX  10 alt1.gmail-smtp-in.l.google.com.
gmail.com.  3597  IN  MX  20 alt2.gmail-smtp-in.l.google.com.
gmail.com.  3597  IN  MX  30 alt3.gmail-smtp-in.l.google.com.
gmail.com.  3597  IN  MX  40 alt4.gmail-smtp-in.l.google.com.
```

5 번이 안 되면 10, 20, 30, 40 순서예요. 우선순위 숫자는 이렇게 예비 서버 순서를 매기는 데 써요.

**3. CAA, PTR, SRV 한 줄씩**

```
$ dig google.com CAA +noall +answer
google.com.  86400  IN  CAA  0 issue "pki.goog"
$ dig -x 8.8.8.8 +noall +answer
8.8.8.8.in-addr.arpa.  142  IN  PTR  dns.google.
$ dig _imaps._tcp.gmail.com SRV +noall +answer
_imaps._tcp.gmail.com.  86400  IN  SRV  5 0 993 imap.gmail.com.
```

CAA 는 "이 도메인의 인증서는 pki.goog 기관만 발급하세요"라는 뜻이에요. PTR 은 8.8.8.8 을 뒤집은 이름에서 dns.google 을 돌려줘요. SRV 는 IMAPS 서비스가 imap.gmail.com 의 993 포트에 있다고 알려 줘요. CAA 가 아예 없으면 어느 발급 기관이든 인증서를 낼 수 있어요.

## 우리가 쓰는 구조(일반화해서)

이 블로그에서 겪은 모양을 example.com 으로 옮겨 볼게요. 이름과 값은 모두 예시예요.

```
blog   IN CNAME  hosting.example.net.     ; 블로그는 호스팅 업체 이름을 가리키는 서브도메인
app    IN A      192.0.2.20               ; 서비스 하나는 서버 IP 에 직접
api    IN A      192.0.2.20               ; 같은 서버에 서브도메인만 늘림
@      IN TXT    "v=spf1 -all"            ; 메일 인증용 TXT
```

- 서브도메인 하나에 서비스 하나를 붙이면 레코드 한 줄이 한 서비스의 입구가 돼요. 서버 IP 가 바뀌면 A 두 줄만 고치면 돼요. 이게 서브도메인 방식의 장점이에요.
- 블로그처럼 남이 운영하는 호스팅에 올릴 때는 IP 가 아니라 CNAME 으로 그쪽 이름을 가리켜요. 호스팅 쪽 IP 가 바뀌어도 내가 고칠 게 없어요. 대신 루트 도메인에는 CNAME 을 못 달아서 루트는 A 를 쓰거나 업체가 제공하는 별칭형 기능을 써요(이름은 업체마다 달라요).
- 메일 인증용 TXT 는 한 이름에 여러 개가 있을 수 있어요. 다만 SPF 는 한 이름에 하나만 둬야 해요.

## 확인하는 습관

레코드를 고친 뒤에는 두 군데에 물어봐요.

1. 내 권한 서버에 직접: `dig blog.example.com CNAME @ns1.example.net +noall +answer` 로 방금 바꾼 값이 맞는지 봐요.
2. 일반 리졸버에: 같은 이름을 `dig` 로 그냥 물어요. 앞 줄의 숫자(TTL)만큼은 옛 값이 남을 수 있어요.

권한 서버는 맞는데 리졸버만 옛 값이면 문제가 아니라 캐시가 아직 안 끝난 거예요. 변경하기 전에 TTL 을 300 같은 작은 값으로 낮춰 두면 기다리는 시간이 줄어요.

## 시험에서는 이렇게 나와요

- 네트워크관리사 2급: 레코드 타입별 용도(A, MX, CNAME, PTR), 역방향 조회
- 정보통신기사: DNS 계층 구조, 재귀와 반복 질의, 영역 전송
- CCNA: DNS 가 IP 서비스의 하나로 나오고, 이름이 안 풀릴 때 점검 순서

## 요약

- 도메인을 사도 레코드를 붙여야 웹, 메일, 인증서가 동작해요.
- A 는 IPv4, AAAA 는 IPv6, CNAME 은 별칭, MX 는 메일, TXT 는 글자, NS 는 권한 서버, SOA 는 관리 정보, PTR 은 역방향, SRV 는 서비스 위치, CAA 는 발급 기관 제한이에요.
- CNAME 은 같은 이름에 다른 레코드와 못 함께 있고 루트에 못 달아요. MX 는 숫자가 작을수록 먼저예요.
- 고친 뒤에는 권한 서버와 일반 리졸버 두 군데를 비교해요.

레코드를 실제로 붙여 보고 싶다면 [5.6편 실습: 맨땅에서 서버 띄우기](/posts/net-05-3-server-from-scratch/)로 이어져요. 그다음은 6편 TCP 와 UDP 예요 (•̀ᴗ•́)و

## 확인 문제

**1.** 같은 이름 blog.example.com 에 CNAME 과 TXT 를 함께 둘 수 있을까요?
① 둘 수 있다 ② 둘 수 없다 ③ TXT 가 짧으면 둘 수 있다 ④ MX 가 있을 때만 둘 수 있다

**2.** MX 레코드 `10 mail1` 과 `20 mail2` 가 있을 때 먼저 시도하는 서버는?
① mail1 ② mail2 ③ 둘에 동시에 ④ 이름순

**3.** 192.0.2.10 의 역방향 조회에 쓰는 이름은?
① 192.0.2.10.in-addr.arpa. ② 10.2.0.192.in-addr.arpa. ③ 10.2.0.192.ip6.arpa. ④ arpa.in-addr.10.2.0.192

**4.** 루트 도메인(example.com 자체)에 CNAME 을 달 수 없는 이유는?
① 길이 제한 때문에 ② 루트에는 SOA 와 NS 가 반드시 있어서 ③ 루트는 TTL 이 없어서 ④ 루트는 UDP 로 조회가 안 돼서

**5.** MX 의 대상이 점(.) 하나인 레코드 `0 .` 의 뜻은?
① 모든 메일을 아무 서버로 보냄 ② 이 도메인은 메일을 받지 않음 ③ 우선순위가 가장 낮음 ④ 레코드 오류

## 정답과 해설

1. **②** CNAME 은 같은 이름에 다른 레코드와 함께 있을 수 없어요(RFC 1034, 1912).
2. **①** 숫자가 작은 쪽이 먼저예요. 안 되면 mail2 로 가요.
3. **②** 주소의 네 부분을 뒤집어 적고 in-addr.arpa. 를 붙여요.
4. **②** 루트에는 SOA 와 NS 가 이미 있고, CNAME 은 다른 레코드와 같이 있을 수 없어요.
5. **②** 널(null) MX 예요(RFC 7505). 메일을 받지 않는다는 선언이에요.
