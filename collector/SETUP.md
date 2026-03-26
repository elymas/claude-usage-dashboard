# Collector 설치 가이드

Claude Code 사용량을 자동으로 수집하여 팀 대시보드에 업로드하는 Collector 설치 방법입니다.

## 사전 준비

- Node.js 18+ 설치
- pnpm 9+ 설치
- 관리자에게 전달받은 정보:
  - **User ID** (UUID)
  - **API Key** (UUID)
  - **Supabase URL** (예: `https://xxx.supabase.co`)

> 위 정보가 없으면 관리자에게 요청하세요. 관리자는 [관리자 가이드](#관리자-팀원-등록-방법)를 참고합니다.

## 설치

### 1. 레포지토리 클론

```bash
git clone https://github.com/elymas/claude-usage-dashboard.git
cd claude-usage-dashboard
pnpm install
```

### 2. 설치 스크립트 실행

```bash
cd collector
./install.sh
```

프롬프트에 관리자에게 전달받은 정보를 입력합니다:

```
Your User ID (UUID from Supabase): <전달받은 User ID>
Your API Key (from Supabase profile): <전달받은 API Key>
Supabase Project URL: <전달받은 Supabase URL>
```

### 3. 설치 결과

설치 스크립트가 자동으로 처리하는 내용:

| 항목 | 설명 |
|------|------|
| `~/.claude-collector/config.json` | 인증 설정 파일 생성 |
| `~/.claude-collector/pending/` | 업로드 실패 시 재시도 큐 디렉토리 |
| `~/Library/LaunchAgents/com.usage-dashboard.collector.plist` | macOS 자동 실행 에이전트 (매일 오전 9시) |

## 동작 확인

### 수동 실행

```bash
cd claude-usage-dashboard
pnpm --filter @usage-dashboard/collector start
```

정상 출력 예시:

```
[collector] Starting Claude Usage Collector...
[collector] First run - processing all files
[collector] Found 123 file(s) to process
[sync] Successfully uploaded 7 record(s)
[collector] Sync complete:
  Files processed: 123
  Records parsed:  5432
  Total tokens:    234,567,890
  Days covered:    7
```

### 대시보드에서 확인

https://elymas.github.io/claude-usage-dashboard/ 에 접속하여 본인 데이터가 표시되는지 확인합니다.

## 수집 대상

Collector는 `~/.claude/projects/` 디렉토리의 모든 Claude Code JSONL 로그를 스캔합니다.

```
~/.claude/projects/**/*.jsonl
  → 파서: assistant 레코드에서 토큰 사용량 추출
  → 집계: KST 기준 일별 그룹핑, 모델별 분류
  → 업로드: Supabase Edge Function으로 전송
```

증분 동기화: 마지막 동기화 이후 수정된 파일만 처리합니다.

## 자동 실행 관리

```bash
# 상태 확인
launchctl list | grep usage-dashboard

# 일시 중지
launchctl unload ~/Library/LaunchAgents/com.usage-dashboard.collector.plist

# 재개
launchctl load ~/Library/LaunchAgents/com.usage-dashboard.collector.plist

# 완전 제거
launchctl unload ~/Library/LaunchAgents/com.usage-dashboard.collector.plist
rm ~/Library/LaunchAgents/com.usage-dashboard.collector.plist
rm -rf ~/.claude-collector
```

## 로그 확인

```bash
# 실행 로그
cat ~/.claude-collector/collector.log

# 에러 로그
cat ~/.claude-collector/collector.error.log
```

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| `Failed to load config` | config.json이 없거나 잘못됨 | `./install.sh` 다시 실행 |
| `HTTP 401: Unauthorized` | API Key가 잘못됨 | `./install.sh --reauth`로 키 재입력 |
| `No new files to process` | 이미 동기화 완료 | 정상 — 새 사용 기록 생성 후 재시도 |
| `All retries failed` | 네트워크 오류 | `~/.claude-collector/pending/`에 저장됨, 다음 실행 시 자동 재시도 |

---

## 관리자: 팀원 등록 방법

새 팀원을 추가하려면 다음 순서로 진행합니다.

### 사전 준비: Supabase CLI 설치 및 로그인

Supabase CLI가 설치되어 있지 않다면 먼저 설치합니다.

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# 로그인 (브라우저에서 Supabase 계정 인증)
supabase login

# 프로젝트 연결 (usage-dashboard 레포 루트에서 실행)
cd claude-usage-dashboard
supabase link --project-ref iflsleexexdgakvicqij
```

`supabase link`는 최초 1회만 실행하면 됩니다. 이후에는 `--linked` 플래그로 원격 DB에 쿼리할 수 있습니다.

### 1. Supabase Auth에 사용자 생성

아래 두 가지 방법 중 하나를 선택합니다.

**방법 A: 팀원이 직접 가입 (권장)**

팀원에게 대시보드 URL을 공유하면 됩니다:

```
https://elymas.github.io/claude-usage-dashboard/
```

팀원이 이메일을 입력하고 Magic Link로 로그인하면 `auth.users`에 자동으로 등록됩니다.

**방법 B: 관리자가 CLI로 직접 생성**

팀원이 직접 접속하기 어려운 경우 CLI로 사용자를 생성할 수 있습니다:

```bash
supabase auth admin create-user \
  --email "팀원이메일@example.com" \
  --email-confirm
```

> `--email-confirm` 플래그는 이메일 인증을 자동으로 완료 처리합니다.

### 2. 사용자 등록 확인

Auth에 사용자가 생성되었는지 확인합니다:

```bash
supabase db query --linked \
  "SELECT id, email, created_at FROM auth.users WHERE email = '팀원이메일@example.com';"
```

출력 예시:

```json
{
  "rows": [
    {
      "id": "a1b2c3d4-...",
      "email": "팀원이메일@example.com",
      "created_at": "2026-03-26T..."
    }
  ]
}
```

### 3. profiles 테이블에 프로필 등록

Auth 사용자의 ID를 profiles 테이블에 등록합니다. API Key가 자동 생성됩니다:

```bash
supabase db query --linked \
  "INSERT INTO public.profiles (id, name)
   SELECT id, '팀원이름'
   FROM auth.users
   WHERE email = '팀원이메일@example.com'
   RETURNING id, name, api_key;"
```

출력 예시:

```json
{
  "rows": [
    {
      "id": "a1b2c3d4-...",
      "name": "홍길동",
      "api_key": "f5e6d7c8-..."
    }
  ]
}
```

### 4. 팀원에게 전달할 정보

위 결과에서 아래 3가지를 팀원에게 공유합니다:

| 항목 | 값 | 용도 |
|------|-----|------|
| **User ID** | `id` 값 (예: `a1b2c3d4-...`) | Collector 식별용 |
| **API Key** | `api_key` 값 (예: `f5e6d7c8-...`) | Collector → Edge Function 인증 |
| **Supabase URL** | `https://iflsleexexdgakvicqij.supabase.co` | API 엔드포인트 |

팀원은 이 정보로 본 가이드의 [설치](#설치) 섹션을 따라 진행하면 됩니다.

### 5. 등록된 팀원 목록 확인

전체 등록 현황을 확인하려면:

```bash
supabase db query --linked \
  "SELECT p.name, u.email, p.created_at
   FROM public.profiles p
   JOIN auth.users u ON p.id = u.id
   ORDER BY p.created_at;"
```
