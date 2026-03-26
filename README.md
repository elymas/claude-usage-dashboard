# Claude Usage Dashboard

팀원들의 Claude Code 토큰 사용량을 수집하고 시각화하는 대시보드.

각 팀원의 로컬 머신에서 Claude Code JSONL 로그를 파싱하여 Supabase에 일별 집계 데이터를 업로드하고, Next.js 대시보드에서 팀 전체 사용 현황을 확인할 수 있습니다.

## Architecture

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Collector    │────▶│  Supabase           │◀────│  Dashboard       │
│  (각 팀원 PC) │     │  Edge Function + DB │     │  (Next.js/Vercel)│
└──────────────┘     └─────────────────────┘     └──────────────────┘
  JSONL 파싱            daily_usage 저장           차트, 테이블, CSV
  일별 집계             API Key 인증               Magic Link 로그인
  자동 재시도           Upsert + RLS               기간별 필터
```

## Monorepo Structure

```
usage-dashboard/
├── collector/     # CLI — JSONL 파싱, 집계, Supabase 업로드
├── dashboard/     # Next.js 14 — 사용량 시각화 대시보드
├── shared/        # 공유 TypeScript 타입
├── supabase/      # DB 마이그레이션 + Edge Function
└── e2e/           # E2E 테스트 (예정)
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Supabase 프로젝트

### 1. 설치

```bash
git clone https://github.com/elymas/claude-usage-dashboard.git
cd claude-usage-dashboard
pnpm install
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 마이그레이션 실행:

```sql
-- supabase/migrations/001_initial.sql 내용 실행
```

3. Edge Function 배포:

```bash
supabase functions deploy upload
```

4. `profiles` 테이블에 팀원 추가 (Supabase Auth 사용자 생성 후 프로필 연결)

### 3. Dashboard 실행

```bash
cp .env.example dashboard/.env.local
# dashboard/.env.local 파일에 Supabase URL과 Anon Key 입력

pnpm --filter @usage-dashboard/dashboard dev
```

`http://localhost:3000`에서 대시보드 확인. Magic Link 이메일로 로그인합니다.

### 4. Collector 설치 (각 팀원 머신)

```bash
cd collector
./install.sh
```

설치 스크립트가 다음을 수행합니다:
- `~/.claude-collector/config.json` 생성 (User ID, API Key, Supabase URL)
- 의존성 설치
- macOS launchd 에이전트 등록 (매일 오전 9시 자동 실행)

수동 실행:

```bash
pnpm --filter @usage-dashboard/collector start
```

## Dashboard Features

| 기능 | 설명 |
|------|------|
| **Summary Cards** | 총 토큰, 활성 사용자, 주요 모델, 일평균 사용량 |
| **Usage Chart** | 사용자별 스택 바 차트 (일별 토큰 추이) |
| **Team Table** | 팀원별 토큰, 세션, 동기화 상태 (정렬 가능) |
| **Period Filter** | 오늘 / 7일 / 30일 / 전체 기간 필터 |
| **CSV Export** | 기간 데이터를 CSV 파일로 내보내기 |
| **Status Bar** | 데이터 신선도 및 동기화 이상 경고 |

## Collector Pipeline

```
~/.claude/projects/**/JSONL
  → Parser (assistant 레코드 추출, 토큰 집계)
  → Aggregator (KST 일별 그룹핑, 모델별 분류)
  → Sync (Supabase Edge Function 업로드)
  → Retry Queue (실패 시 pending/ 저장, 다음 실행 시 재시도)
```

증분 동기화: `lastSyncTimestamp`를 기록하여 수정된 파일만 처리합니다.

## Database Schema

**`profiles`** — 팀원 정보 + API Key

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Supabase Auth user ID |
| name | text | 이름 |
| api_key | text | Collector 인증용 (자동 생성) |

**`daily_usage`** — 일별 사용량 (UNIQUE: user_id + date + source)

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | FK → profiles |
| date | date | KST 기준 날짜 |
| total_tokens | bigint | 총 토큰 |
| input_tokens | bigint | 입력 토큰 |
| output_tokens | bigint | 출력 토큰 |
| cache_read_tokens | bigint | 캐시 읽기 토큰 |
| cache_creation_tokens | bigint | 캐시 생성 토큰 |
| model_breakdown | jsonb | 모델별 토큰 분류 |
| sessions | integer | 세션 수 |

## Testing

```bash
# Collector 테스트 (16 tests)
pnpm --filter @usage-dashboard/collector test
```

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`)가 CI/CD를 처리합니다:

1. `main` 브랜치 push/PR 시 Collector 테스트 실행
2. 테스트 통과 후 Vercel에 Dashboard 자동 배포

필요한 GitHub Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Environment Variables

```bash
# Dashboard (dashboard/.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Edge Function (Supabase dashboard에서 설정)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## License

Private — Internal use only.
