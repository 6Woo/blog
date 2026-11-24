---
title: "AWS 공부 4편: EC2, 가상 서버를 고르는 기준"
folder: "AWS 공부"
date: 2026-11-24
mood: fight
tags: [AWS]
---

연재: AWS 기초부터 SAA 까지 4편 / 시험 연결: SAA-C03 도메인3(고성능 아키텍처, 24%), 도메인4(비용 최적화, 20%), 도메인2(복원력, 26%)

그누가 "인스턴스 타입 목록을 열면 m7g, c7i, r8g 가 줄줄이 나오는데 뭘 보고 골라야 할지 모르겠다"고 해서 4편은 EC2 를 고르는 기준으로 정리해 봤어요. 2026-11-24 에 EC2 사용 설명서를 직접 열어 확인한 내용만 적었어요. 한도와 가격은 바뀌니 링크에서 확인해 주세요.

## 문제: 서버 한 대에 정할 것이 네 가지

EC2 인스턴스 하나를 띄우려면 하드웨어(인스턴스 타입), 소프트웨어(AMI), 요금 방식(구매 옵션), 데이터를 둘 곳(스토리지)을 골라야 해요.

## 이름만 읽어도 절반은 고른다

인스턴스 타입 이름에는 규칙이 있어요([명명 규칙 문서](https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-type-names.html)). 점 앞이 패밀리이고 첫 자리가 시리즈, 둘째 자리가 세대, 그 뒤가 옵션이에요. 점 뒤는 크기예요.

![m7g.large 를 시리즈, 세대, 옵션, 크기로 나눠 읽는 그림](img/aws-04-ec2-1.png)

m7g.large 는 "범용(M), 7세대, Graviton 프로세서(g), large 크기"예요. Graviton 인스턴스는 64비트 ARM 아키텍처용 AMI 가 필요해요([Nitro 문서](https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-nitro-instances.html)).

분류는 다섯 가지가 기본이에요([인스턴스 타입 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html)).

| 분류 | 대표 시리즈 |
|---|---|
| 범용 | M, T(버스트 가능 성능) |
| 컴퓨팅 최적화 | C |
| 메모리 최적화 | R, X, U(고용량 메모리) |
| 스토리지 최적화 | I, D(고밀도 스토리지) |
| 가속 컴퓨팅 | P(GPU), G(그래픽), Inf, Trn |

같은 문서에 고성능 컴퓨팅(Hpc) 분류도 따로 있어요. 문서는 직접 벤치마크를 돌려 보고 고르라고 권해요.

## Nitro 시스템

EC2 의 하이퍼바이저는 Xen 과 Nitro 두 종류이고, M5 이후 세대는 Nitro 목록에 있어요.

Nitro 시스템은 AWS 가 만든 하드웨어와 소프트웨어 구성 요소 모음이에요. Nitro 카드(로컬 NVMe 스토리지, 네트워킹, 관리, 모니터링, 보안), 메인보드의 Nitro 보안 칩, 가벼운 Nitro 하이퍼바이저로 이뤄져요. 문서는 이 하이퍼바이저가 대부분의 워크로드에서 베어 메탈과 구분되지 않는 성능을 낸다고 적어요.

## AMI: 서버의 틀

AMI(Amazon Machine Image)는 인스턴스를 설정하고 부팅하는 데 필요한 소프트웨어를 담은 이미지예요([AMI 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html)). 인스턴스를 띄울 때 반드시 하나를 지정해야 해요.

AMI 는 **리전**, 운영 체제, 프로세서 아키텍처, 루트 볼륨 유형, 가상화 유형에 묶여요. 다른 리전에서 쓰려면 그 리전으로 복사해야 해요.

## 구매 옵션: 같은 서버, 다른 요금

![구매 옵션 5가지를 약속, 요금, 중단 위험, 용도로 비교한 표](img/aws-04-ec2-2.png)

출처는 [구매 옵션 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-purchasing-options.html)예요.

- **온디맨드**: 띄운 만큼 초 단위로 내요. running 이 되면 최소 1분이 과금돼요.
- **Savings Plans**: 시간당 사용 금액(USD)을 1년 또는 3년 약정해요. Compute Savings Plans 는 패밀리, 크기, OS, 테넌시, 리전과 상관없이 적용돼요. 문서에는 온디맨드 대비 최대 72% 라고 적혀 있어요([Savings Plans 문서](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)).
- **Reserved Instances**: 인스턴스 타입과 리전 같은 구성을 1년 또는 3년 약정해요. 물리 인스턴스가 아니라 **청구 할인**이고, 사고 나면 취소할 수 없어요. Standard 는 할인이 가장 크지만 교환이 안 되고, Convertible 은 할인이 적은 대신 교환돼요([RI 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html)).
- **Spot**: 남는 EC2 용량을 싸게 써요. AWS 가 용량이 필요하면 종료, 중지, 최대 절전 중 하나로 회수해요([Spot 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)).
- **Dedicated Hosts**: 물리 서버 한 대를 통째로 써요. 소켓, 코어, VM 단위 라이선스를 그대로 들고 올 수 있고(BYOL) 호스트 단위로 과금돼요([Dedicated Hosts 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-overview.html)).

RI 문서 첫머리에는 AWS 가 RI 보다 Savings Plans 를 권한다고 적혀 있어요. 단가는 리전과 타입마다 달라서 적지 않을게요. [EC2 가격 페이지](https://aws.amazon.com/ec2/pricing/)에서 확인해 주세요.

### Spot 의 2분

Spot 중단 알림은 EC2 가 인스턴스를 중지하거나 종료하기 **2분 전**에 나와요([중단 알림 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)). EventBridge 이벤트와 인스턴스 메타데이터로 받고, 문서는 5초마다 확인하라고 권해요.

중단 동작이 최대 절전이면 절전이 바로 시작돼서 2분의 여유가 없어요. 알림도 "최선 노력"으로 보낸다고 적혀 있으니 중단돼도 괜찮은 구조가 먼저예요.

## 상태와 과금: stop 과 terminate

| 상태 | 뜻 | 인스턴스 사용 요금 |
|---|---|---|
| pending | running 준비 중 | 없음 |
| running | 실행 중 | 과금 |
| stopping, stopped | 중지 중, 중지됨 | 없음(최대 절전은 stopping 동안 과금) |
| shutting-down, terminated | 삭제 중, 영구 삭제됨 | 없음 |

출처는 [인스턴스 상태 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html)예요. **EBS 볼륨 저장 요금은 stopped 여도 계속 나와요.**

stop 하고 start 하면 프라이빗 IPv4 와 탄력적 IP 는 그대로지만 퍼블릭 IPv4 는 새로 받아요. terminate 는 되돌릴 수 없고, 루트 EBS 볼륨은 기본값으로 함께 삭제되며 나머지 EBS 볼륨은 남아요.

## 인스턴스 스토어 vs EBS

| 구분 | 인스턴스 스토어 | EBS |
|---|---|---|
| 위치 | 호스트에 물리적으로 붙은 디스크 | 붙였다 뗄 수 있는 블록 볼륨 |
| 수명 | 인스턴스와 같음 | 인스턴스와 독립 |
| 재부팅 | 유지 | 유지 |
| stop, 최대 절전, terminate | **삭제** | 유지(루트는 terminate 때 기본 삭제) |
| 요금 | 인스턴스 요금에 포함 | 별도 |

출처: [스토리지 옵션](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Storage.html), [인스턴스 스토어](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html). 인스턴스 스토어는 버퍼, 캐시 같은 임시 데이터용이에요. 옵션 d 는 인스턴스 스토어가 붙은 타입(예: m7gd)이라는 뜻이에요.

## 접근과 권한: 네 개의 문

- **보안 그룹**: 인스턴스의 가상 방화벽이에요. 여러 개를 붙이면 규칙을 모두 모아 평가해요([문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)).
- **키 페어**: 공개 키는 인스턴스에, 개인 키는 내가 보관해요. AWS 는 개인 키 사본을 갖지 않아서 잃어버리면 복구할 수 없어요([문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)).
- **IAM 인스턴스 프로파일**: IAM 역할을 담는 그릇이에요. 인스턴스 하나에 역할 하나예요. 애플리케이션은 액세스 키를 심지 않고 임시 자격 증명을 받아 써요([문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html)).
- **사용자 데이터**: 시작할 때 넘기는 스크립트예요. 리눅스에서는 root 로 돌고, 기본값으로 **첫 부팅 때만** 실행돼요. 크기는 16KB 까지예요([문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)).

## IMDSv2 를 왜 권하나

인스턴스 안에서 169.254.169.254 로 요청하면 메타데이터가 나와요. 여기에는 사용자 데이터와 **IAM 역할의 임시 자격 증명**(`iam/security-credentials/역할이름`)도 있어요.

문서는 이 데이터가 "인증이나 암호화로 보호되지 않는다"고 경고해요([메타데이터 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)). 사용자 데이터에 비밀번호를 넣으면 안 되는 이유예요.

IMDSv1 은 GET 한 번이면 답을 줘요. IMDSv2 는 세션 방식이라 장벽이 세 개 생겨요([IMDS 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)).

1. 먼저 **PUT** 요청으로 토큰을 받아야 해요. 토큰 수명은 1초에서 6시간(21,600초)이고 그 인스턴스 밖에서는 못 써요.
2. `X-Forwarded-For` 헤더가 있는 PUT 은 거부돼요. 프록시를 거쳐 온 요청을 막는 장치예요.
3. PUT 응답의 홉 제한이 기본 1이라 인스턴스 밖으로 나가지 못해요.

문서가 안내하는 해설 글의 제목이 "열린 방화벽, 리버스 프록시, SSRF 취약점에 대한 심층 방어"예요. 토큰을 필수로 하면(`HttpTokens = required`) IMDSv1 호출은 실패하니, CloudWatch 의 `MetadataNoToken` 지표가 0 인지 보고 전환하라는 것이 [공식 전환 경로](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-transition-to-version-2.html)예요.

## 배치 그룹 한 줄씩

- **클러스터**: 한 AZ 안에 가깝게 모아요. 지연이 낮아 HPC 에 써요.
- **파티션**: 파티션끼리 랙을 공유하지 않아요. AZ 당 최대 7개 파티션이고 Hadoop, Cassandra, Kafka 같은 분산 워크로드에 써요.
- **분산(spread)**: 인스턴스마다 다른 하드웨어에 둬요. AZ 당 실행 인스턴스는 최대 7개예요.

출처는 [배치 그룹](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html)과 [배치 전략](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-strategies.html) 문서예요. 지금 문서에는 네 번째인 정밀 시간(precision time) 전략도 올라와 있어요.

## 시험에서는 이렇게 나와요

- 도메인3(고성능): "노드 간 지연을 최소로"(클러스터 배치 그룹), "메모리 위주 DB"(R, X 시리즈), "임시 고속 디스크"(인스턴스 스토어)
- 도메인4(비용): "중단돼도 되는 배치"(Spot), "꾸준한 부하인데 타입이 바뀔 수 있다"(Savings Plans), "밤에는 안 쓰는 개발 서버"(stop, 단 EBS 요금은 남음)
- 도메인2(복원력): "중요한 서버 몇 대를 서로 다른 하드웨어에"(분산 배치 그룹), "Spot 중단 대비"(2분 알림과 장애 허용 설계)

## 정리

- 이름은 시리즈, 세대, 옵션, 크기 순서로 읽어요. m7g.large 는 범용, 7세대, Graviton, large 예요.
- 금액 약정은 Savings Plans, 구성 약정은 RI, 중단 감수는 Spot, 라이선스 반입은 Dedicated Hosts 예요.
- stop 은 인스턴스 요금만 멈추고 EBS 요금은 남아요. 인스턴스 스토어 데이터는 stop 에서 사라져요.
- 권한은 액세스 키 대신 IAM 역할로 주고, 메타데이터는 IMDSv2 만 허용해요.

다음 5편은 EC2 에 붙는 디스크, EBS 와 스토리지예요 (•̀ᴗ•́)و

## 확인 문제

**1.** 인스턴스 타입 m7g.large 에서 g 가 뜻하는 것은?
① GPU 가속 ② AWS Graviton 프로세서 ③ 범용(General purpose) ④ 세대(Generation)

**2.** 야간에 도는 데이터 분석 배치가 있어요. 중간에 끊겨도 다시 돌리면 되고, 비용을 가장 낮추고 싶어요. 알맞은 구매 옵션은?
① 온디맨드 ② Reserved Instances ③ Spot 인스턴스 ④ Dedicated Hosts

**3.** EBS 를 루트 볼륨으로 쓰는 인스턴스를 stop 했어요. 계속 과금되는 것은?
① 인스턴스 사용 요금 ② EBS 볼륨 저장 요금 ③ 인스턴스 스토어 요금 ④ 아무것도 과금되지 않는다

**4.** 인스턴스 스토어 볼륨의 데이터가 유지되는 경우는?
① 인스턴스를 재부팅했다 ② 인스턴스를 stop 했다가 start 했다 ③ 인스턴스를 최대 절전했다 ④ 인스턴스를 terminate 했다

**5.** 노드끼리 통신이 많은 HPC 워크로드예요. 네트워크 지연을 가장 낮추려면?
① 분산 배치 그룹으로 여러 AZ 에 나눈다 ② 파티션 배치 그룹을 쓴다 ③ 클러스터 배치 그룹으로 한 AZ 에 모은다 ④ Dedicated Hosts 에 올린다

## 정답과 해설

1. **②** 옵션 자리의 g 는 AWS Graviton 프로세서예요. 범용은 시리즈 자리의 M, GPU 가속은 P 시리즈예요.
2. **③** Spot 은 남는 용량을 싸게 쓰는 대신 회수될 수 있어요. 문서도 데이터 분석, 배치 작업에 알맞다고 적어요.
3. **②** stopped 에서는 인스턴스 사용 요금이 없지만 EBS 볼륨 저장 요금은 계속 나와요. 인스턴스 스토어는 인스턴스 요금에 포함이라 별도 요금이 없어요.
4. **①** 재부팅은 같은 호스트에 남아서 데이터가 유지돼요. stop, 최대 절전, terminate 는 모두 지워져요.
5. **③** 클러스터 배치 그룹은 한 AZ 안에 인스턴스를 가깝게 모아 낮은 지연을 내요. 분산과 파티션은 장애 격리가 목적이에요.
