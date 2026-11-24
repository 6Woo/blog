---
title: "AWS 공부 5편: S3, EBS, EFS, 저장소를 고르는 세 가지 질문"
folder: "AWS 공부"
date: 2026-11-24
mood: fight
tags: [AWS]
---

연재: AWS 기초부터 SAA 까지 5편 / 시험 연결: SAA-C03 도메인1(안전한 아키텍처, 30%), 도메인2(복원력, 26%), 도메인3(고성능, 24%), 도메인4(비용 최적화, 20%)

그누가 "S3, EBS, EFS 가 다 저장소인데 언제 뭘 쓰는지 한 번에 안 잡힌다"고 해서 5편은 저장소 고르는 법으로 정리해 봤어요. 숫자와 날짜는 2026-11-24 에 AWS 공식 문서를 직접 열어 확인한 값이에요. 한도와 가격은 바뀌니 링크에서 확인해 주세요.

## 문제: 저장소가 셋이라 헷갈린다

같은 100GB 라도 "DB 가 쓰는 디스크", "서버 10대가 같이 보는 폴더", "10년 보관할 로그"는 맞는 저장소가 달라요. 질문 세 개로 좁혀 볼게요. 누가 어떤 방식으로 붙어 쓰는가, 어디까지 고장 나도 버텨야 하는가, 얼마나 빠르게 그리고 자주 꺼내는가예요.

![저장소 선택 결정 흐름. 질문 1로 EBS, EFS, S3 를 고르고 질문 2와 3으로 AZ 범위와 유형, 클래스를 정함](img/aws-05-storage-1.png)

## 질문 1: 블록, 파일, 객체

| 유형 | 저장 방식 | 붙는 방법 | AWS 서비스 |
|---|---|---|---|
| 블록 | 같은 크기의 블록으로 나눠 저장 | 인스턴스에 직접 연결 | EBS |
| 파일 | 파일과 폴더의 계층 구조 | NFS, SMB 로 여러 서버가 공유 | EFS, FSx |
| 객체 | 식별자와 메타데이터가 붙은 객체 | API 로 접근 | S3 |

출처: [스토리지 서비스 선택 가이드](https://docs.aws.amazon.com/decision-guides/latest/storage-on-aws-how-to-choose/choosing-aws-storage-service.html)(2026-10-05 갱신본)

## EBS: 서버 한 대의 디스크

EBS 볼륨은 인스턴스에 붙여 하드 디스크처럼 쓰는 블록 장치이고, 인스턴스의 수명과 별개로 남아요([EBS 볼륨 문서](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes.html)).

핵심은 **AZ 에 묶인다**는 점이에요. 볼륨은 만든 AZ 안에서 자동 복제되고, **같은 AZ 의 인스턴스에만** 붙일 수 있어요([기능 문서](https://docs.aws.amazon.com/ebs/latest/userguide/EBSFeatures.html)). 기본은 인스턴스 하나에만 붙고, io1 과 io2 만 Multi-Attach 로 Nitro 기반 인스턴스 16대까지 붙어요.

| 유형 | 종류 | 크기 | 최대 IOPS | 최대 처리량 | 부팅 볼륨 |
|---|---|---|---|---|---|
| gp3 | 범용 SSD | 1 GiB ~ 64 TiB | 80,000 | 2,000 MiB/s | 가능 |
| io2 Block Express | 프로비저닝 IOPS SSD | 4 GiB ~ 64 TiB | 256,000 | 4,000 MiB/s | 가능 |
| st1 | 처리량 최적화 HDD | 125 GiB ~ 16 TiB | 500 | 500 MiB/s | 불가 |
| sc1 | 콜드 HDD | 125 GiB ~ 16 TiB | 250 | 250 MiB/s | 불가 |

출처: [EBS 볼륨 유형](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html)

gp3 는 크기와 상관없이 **3,000 IOPS 와 125 MiB/s 가 기본 포함**이고, 더 필요하면 돈을 내고 올려요([범용 SSD 문서](https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html)). io2 Block Express 는 내구성이 99.999% 로, 99.8~99.9% 인 다른 유형보다 높아요.

백업은 **스냅샷**이에요. 바뀐 블록만 저장하는 증분 방식이고, S3 에 저장되지만 S3 콘솔이나 API 로는 볼 수 없어요([스냅샷 문서](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html)). 스냅샷은 리전의 모든 AZ 에 복제되니 그 리전의 어느 AZ 에서든 볼륨으로 되살릴 수 있고, 다른 리전에는 [스냅샷 복사](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-copy-snapshot.html)로 보내요.

볼륨은 AZ 자원, 스냅샷은 리전 자원이에요. AWS 가 볼륨을 알아서 백업해 주지 않으니 스냅샷 일정은 직접 잡아야 해요.

## EFS: 여러 서버가 같이 쓰는 폴더

EFS 는 NFSv4.1 과 NFSv4.0 으로 마운트하는 파일 시스템이고, 용량은 파일을 넣고 지우는 만큼 늘었다 줄어요([EFS 소개](https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html)).

EBS 와 가장 다른 점은 **여러 AZ 의 인스턴스가 동시에** 붙는다는 거예요. VPC 안에 마운트 타깃을 AZ 마다 하나씩 만들고, 보안 그룹에서 NFS 포트 2049 를 열어요([동작 방식](https://docs.aws.amazon.com/efs/latest/ug/how-it-works.html)).

Regional(권장) 유형은 여러 AZ 에 중복 저장하고, One Zone 유형은 AZ 하나에만 저장해요. Windows 기반 EC2 는 지원하지 않아요.

## S3: API 로 넣고 꺼내는 객체

S3 는 **버킷**에 **객체**(파일과 메타데이터)를 넣고 **키**로 찾아요([S3 소개](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)).

| 항목 | 값 |
|---|---|
| 버킷 이름 | 3~63자, 범용 버킷(전역 네임스페이스)은 파티션 안 모든 계정과 리전에서 고유 |
| 이름과 리전 | 만든 뒤 바꿀 수 없음 |
| 객체 최대 크기 | 50 TB(실제 한계 48.8 TiB) |
| 단일 PUT 한 번 | 5 GB 까지 |
| 멀티파트 | 파트 5 MiB ~ 5 GiB, 최대 10,000개 |

출처: [이름 규칙](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html), [객체 개요](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingObjects.html), [업로드](https://docs.aws.amazon.com/AmazonS3/latest/userguide/upload-objects.html), [멀티파트 한도](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html)

객체 최대 크기는 10,000 x 5 GiB = 50,000 GiB 로 계산돼요. 오래된 교재에 다른 숫자가 있으면 위 링크의 현재 값과 비교해 보세요.

내구성은 문서 문구 그대로예요. S3 Standard 는 "Designed to provide 99.999999999% durability and 99.99% availability of objects over a given year"예요([데이터 보호 문서](https://docs.aws.amazon.com/AmazonS3/latest/userguide/DataDurability.html)). 9가 11개라서 11 nines 라고 불러요.

## 질문 3: S3 스토리지 클래스

| 클래스 | 가용성(설계) | AZ | 최소 보관 기간 | 최소 과금 크기 |
|---|---|---|---|---|
| S3 Standard | 99.99% | 3개 이상 | 없음 | 없음 |
| S3 Intelligent-Tiering | 99.9% | 3개 이상 | 없음 | 없음 |
| S3 Standard-IA | 99.9% | 3개 이상 | 30일 | 128 KB |
| S3 One Zone-IA | 99.5% | 1개 | 30일 | 128 KB |
| S3 Glacier Instant Retrieval | 99.9% | 3개 이상 | 90일 | 128 KB |
| S3 Glacier Flexible Retrieval | 99.99%(복원 후) | 3개 이상 | 90일 | 해당 없음 |
| S3 Glacier Deep Archive | 99.99%(복원 후) | 3개 이상 | 180일 | 해당 없음 |

출처: [스토리지 클래스 비교](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html#sc-compare). 내구성 설계값은 일곱 개 모두 99.999999999% 예요.

![S3 스토리지 클래스 비교. 접근 빈도가 낮을수록 아래 클래스이고 꺼내는 속도와 최소 보관 기간이 달라짐](img/aws-05-storage-2.png)

최소 보관 기간 전에 지워도 그 기간만큼 과금되니 "금방 지울 데이터"는 IA 나 Glacier 에 맞지 않아요. 가격은 리전마다 달라서 적지 않을게요. [S3 요금 페이지](https://aws.amazon.com/s3/pricing/)에서 리전을 골라 확인해 주세요.

**수명 주기 규칙**은 다른 클래스로 옮기는 전환(Transition)과 지우는 만료(Expiration)를 자동으로 해 줘요([수명 주기 문서](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)). 128 KB 보다 작은 객체는 기본으로 전환하지 않아요([전환 제약](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html)).

**버저닝**은 기본이 꺼짐이고, 켜면 삭제할 때 실제로 지우지 않고 삭제 마커를 얹어요([버저닝 문서](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)). 한 번 켜면 "버전 없음"으로 못 돌아가고 일시 중지만 되며, 버전마다 객체 전체 요금이 붙으니 수명 주기 규칙과 같이 써요.

## 보안: 새 버킷의 기본값 세 가지

| 기본값 | 내용 | 적용 시점과 근거 |
|---|---|---|
| 기본 암호화 | 새로 올리는 모든 객체에 SSE-S3(AES-256), 추가 비용 없음, 끌 수 없음 | 2023-01-05, [기본 암호화 FAQ](https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html) |
| 퍼블릭 액세스 차단 | 새 버킷은 버킷 수준에서 켜진 채로 생성 | 2023-04-28 공지, [What's New](https://aws.amazon.com/about-aws/whats-new/2023/04/amazon-s3-security-best-practices-buckets-default/) |
| ACL 비활성 | Object Ownership 기본값이 Bucket owner enforced | 같은 공지, [Object Ownership 문서](https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html) |

기존 객체는 자동으로 암호화되지 않아요. 퍼블릭 액세스 차단은 BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, RestrictPublicBuckets 네 설정이고, 계정과 버킷 설정이 다르면 더 엄격한 쪽이 적용돼요([차단 문서](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)).

**버킷 정책**은 버킷에 붙이는 JSON 형식의 리소스 기반 정책으로, 요청자와 동작과 조건을 한곳에서 정해요. **ACL** 은 IAM 보다 먼저 나온 방식으로 버킷과 객체마다 따로 붙는데, 문서는 꺼 둔 채로 정책을 쓰라고 권해요.

버킷 공개 사고를 막는 체크리스트예요([S3 보안 모범 사례](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)).

- 퍼블릭 액세스 차단 네 개를 계정 수준에서도 켠다.
- ACL 은 꺼 둔다(Bucket owner enforced).
- 버킷 정책에 `"Principal": "*"` 나 동작 `"*"` 가 있는지 찾는다.
- 버킷 정책에서 `aws:SecureTransport` 조건으로 HTTP 요청을 거부한다.
- 서버에는 액세스 키 대신 IAM 역할을 준다(1편).
- IAM Access Analyzer for S3 로 공개 버킷을 찾고, CloudTrail 에서 PutBucketPolicy, PutBucketAcl 변경을 본다.

## 시험에서는 이렇게 나와요

- 도메인1(안전): "버킷이 공개되지 않게"(퍼블릭 액세스 차단), "HTTPS 만 허용"(aws:SecureTransport)
- 도메인2(복원력): "여러 AZ 의 서버가 같은 파일을"(EFS Regional), "EBS 를 다른 AZ 로"(스냅샷), "지운 객체 복구"(버저닝)
- 도메인3(고성능): "높고 일정한 IOPS"(io2 Block Express)
- 도메인4(비용): "30일 뒤 거의 안 봄"(수명 주기), "접근 패턴을 모름"(Intelligent-Tiering)

## 요약

- EBS 는 블록이고 AZ 하나에 묶여요. 스냅샷은 리전 자원이에요.
- EFS 는 NFS 파일 시스템이고 여러 AZ 의 서버가 동시에 마운트해요.
- S3 는 객체 저장소예요. 클래스는 접근 빈도로 고르고 수명 주기 규칙으로 내려요.
- 새 버킷은 암호화, 퍼블릭 차단, ACL 비활성이 기본이에요. 기본값을 푸는 순간이 사고 지점이에요 ^^7

다음 6편도 이어서 정리할게요 (•̀ᴗ•́)و

## 확인 문제

**1.** 가용 영역 A 에 만든 EBS 볼륨의 데이터를 가용 영역 B 의 인스턴스에서 쓰려고 해요. 알맞은 방법은?
① 볼륨을 B 의 인스턴스에 바로 연결한다 ② 스냅샷을 만들고 B 에서 그 스냅샷으로 새 볼륨을 만든다 ③ 볼륨 유형을 gp3 로 바꾼다 ④ 볼륨의 AZ 설정을 B 로 수정한다

**2.** AZ 2개에 나뉜 Linux 앱 서버 4대가 같은 업로드 폴더를 동시에 읽고 써야 해요. 가장 알맞은 저장소는?
① 서버마다 gp3 볼륨 ② EFS Regional 파일 시스템 ③ S3 Glacier Deep Archive ④ EFS One Zone 파일 시스템을 AZ 마다 하나씩

**3.** 8 GB 짜리 파일 하나를 AWS CLI 로 S3 에 올리려고 해요. 맞는 설명은?
① 단일 PUT 한 번으로 올릴 수 있다 ② 멀티파트 업로드를 써야 한다 ③ S3 객체는 5 GB 를 넘을 수 없다 ④ 콘솔에서만 올릴 수 있다

**4.** 다시 만들 수 있는 썸네일 이미지를 한 달에 한 번쯤, 밀리초 안에 꺼내요. 비용을 줄이려면?
① S3 Standard ② S3 One Zone-IA ③ S3 Glacier Flexible Retrieval ④ S3 Glacier Deep Archive

**5.** 2026년에 기본 설정 그대로 새 범용 버킷을 만들었어요. 틀린 설명은?
① 새 객체는 SSE-S3 로 자동 암호화된다 ② 퍼블릭 액세스 차단이 켜져 있다 ③ ACL 이 켜져 있어 객체마다 권한을 줘야 한다 ④ 버저닝은 꺼져 있다

## 정답과 해설

1. **②** 볼륨은 같은 AZ 의 인스턴스에만 붙어요. 스냅샷은 리전의 모든 AZ 에 복제되니 B 에서 새 볼륨으로 되살릴 수 있어요.
2. **②** EFS Regional 은 AZ 마다 마운트 타깃을 두고 여러 AZ 의 서버가 동시에 접근해요. EBS 는 기본이 인스턴스 하나, AZ 하나예요.
3. **②** 단일 PUT 은 5 GB 까지예요. 멀티파트는 5 MiB ~ 5 GiB 파트를 최대 10,000개까지 올려요.
4. **②** 밀리초 접근에 한 달 한 번이면 IA 계열이고, 다시 만들 수 있으니 AZ 1개인 One Zone-IA 가 맞아요. Glacier Flexible Retrieval 과 Deep Archive 는 복원을 먼저 해야 해요.
5. **③** Object Ownership 기본값이 Bucket owner enforced 라서 ACL 은 꺼져 있고 정책으로 권한을 관리해요. 나머지 셋은 문서에 적힌 기본값이에요.
