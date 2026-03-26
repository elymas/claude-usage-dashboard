# TODOS

## Future Work

### 1. 다중 머신 지원
- **What:** 한 사용자가 여러 머신에서 Claude Code를 사용할 때 machine_id로 구분하여 중복 카운트 방지
- **Why:** 현재는 "1 사용자 = 1 머신" 가정. 사용자가 데스크톱 + 랩톱에서 사용하면 토큰이 중복 집계될 수 있음
- **How:** daily_usage 테이블에 machine_id 컬럼 추가, UNIQUE 키를 (user_id, date, source, machine_id)로 변경, collector config에 machine_id 자동 생성
- **Priority:** Low — 현재 4명이 각 1대씩 사용
- **Depends on:** 초기 버전 배포 후

### 2. 파서 버전 관리
- **What:** Claude Code JSONL 포맷 변경 감지 및 대응
- **Why:** JSONL 로그는 비공식 포맷으로, Claude Code CLI 업데이트 시 예고 없이 변경 가능. 파서가 깨지면 데이터 수집이 중단됨
- **How:** 파싱 성공/실패 카운트 로그. 실패율이 임계치(예: 20%) 초과 시 대시보드에 경고 표시. 향후: 포맷 버전별 파서 분기
- **Priority:** Medium — 포맷 변경은 불가피하나 시기 예측 불가
- **Depends on:** 초기 버전 배포 후
