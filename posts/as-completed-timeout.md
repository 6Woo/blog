---
title: "as_completed 에 timeout 을 걸어도 총 시간이 안 지켜져요"
folder: "공부한 지식"
mood: smile
tags: [Python, 동시성, 타임아웃]
date: 2026-11-23
---

## 문제: 예산 2초인 작업이 20초 걸리고 로그는 전부 OK

그누네 코드에 병렬로 데이터를 미리 받아 두는 함수가 있었어요. 전체 예산을 2초로 두었는데 느린 작업이 끼면 20초가 걸렸고, 로그에는 실패 0건으로 찍혔어요. 느려진 것도, 예산을 넘긴 것도 로그만 봐서는 알 수 없었어요.

## 원인: 타임아웃이 걸리는 자리가 틀렸어요

문제의 코드는 이렇게 생겼어요.

```python
with ThreadPoolExecutor(max_workers=6) as ex:
    futures = {ex.submit(fn): name for name, fn in tasks}
    for fut in as_completed(futures):
        fut.result(timeout=remaining)
```

두 겹으로 틀렸어요.

1. `as_completed()` 는 이미 끝난 작업만 넘겨줘요. 끝난 작업에 `result(timeout=)` 을 걸면 바로 값이 나오니 타임아웃이 한 번도 발동하지 않아요.
2. `with ThreadPoolExecutor` 블록을 나갈 때 `shutdown(wait=True)` 가 실행돼서 끝나지 않은 작업을 전부 기다려요.

## 해결: as_completed 자체에 timeout 을 걸고 정리는 기다리지 않기

```python
ex = ThreadPoolExecutor(max_workers=N)
try:
    futures = {ex.submit(fn): name for name, fn in tasks}
    try:
        for fut in as_completed(futures, timeout=BUDGET):
            ...
    except TimeoutError:
        failed += [n for f, n in futures.items() if not f.done()]
finally:
    ex.shutdown(wait=False, cancel_futures=True)
```

## 결과: 20.01초가 2.01초로

그누네 팀이 20초짜리 작업 3개를 일부러 넣고 예산 2초로 재 봤어요.

| | 소요 시간 | 로그 |
|---|---|---|
| 수정 전 | 20.01초 | 11건 OK, 실패 0 |
| 수정 후 | 2.01초 | 17건 중 3건 부분 실패(예산 초과) |

시간만 줄어든 게 아니에요. 로그가 사실을 말하기 시작했어요. ㅎㅎ

## 정리

1. 총 시간 제한은 `as_completed(futures, timeout=...)` 에 걸어요. 개별 결과에 거는 타임아웃으로는 안 돼요.
2. `with` 블록은 끝나지 않은 작업을 기다려요. 기다리지 않으려면 `shutdown(wait=False, cancel_futures=True)` 를 직접 불러요.
3. 로그가 전부 OK라고 해서 정상은 아니에요. 소요 시간을 같이 남겨요.
