# Stash — 개인 링크 보관함 기획서

## 1. 개요

| 항목 | 내용 |
|---|---|
| 서비스명 | Stash |
| 목적 | 웹/앱에서 본 링크를 안드로이드 "공유하기"로 바로 저장하고, 폴더·태그·검색으로 정리하는 개인용(1인) 링크 관리 도구 |
| 사용자 | 본인 1인 전용 (회원가입 없음, 비밀번호/PIN 단일 인증) |
| 도메인 | stash.kro.kr |
| 공개 범위 | 검색엔진 비노출(noindex, robots 차단), 비밀번호 없이는 접근 불가 |
| 플랫폼 | Android 전용 PWA (iOS 고려 안 함) |

---

## 2. 기술 스택 (무료 티어 기준)

- **프론트/백엔드**: Next.js (App Router, TypeScript) — Vercel 무료 배포
- **DB**: Supabase (Postgres) 무료 티어
- **인증**: 자체 구현 (회원 테이블 없음) — 비밀번호/PIN + JWT 세션 쿠키(httpOnly)
- **PWA**: Web App Manifest + Service Worker + Web Share Target API (Android)
- **메타데이터 크롤링**: 서버에서 fetch + HTML 파싱(cheerio 등)으로 OG 태그 추출

---

## 3. 핵심 기능 목록

### 3.1 링크 저장
- [ ] 안드로이드 공유하기 → Stash 선택 시 자동 저장 (Web Share Target)
- [ ] 앱 내 "링크 추가" 버튼으로 수동 추가
- [ ] URL 추가 시 OG 메타데이터(제목/설명/대표이미지/파비콘) 자동 크롤링
- [ ] 깨진 링크(404/타임아웃) 주기적 체크 → 목록에 표시

### 3.2 정리
- [ ] 폴더(중첩 가능)로 분류
- [ ] 태그 다중 부여 + 태그 필터
- [ ] 즐겨찾기(핀 고정)
- [ ] 읽음/안읽음 상태
- [ ] 개인 메모 필드
- [ ] 정렬: 최신순 / 이름순 / 즐겨찾기 우선

### 3.3 검색
- [ ] 제목/URL/메모/설명 통합 검색
- [ ] 폴더 + 태그 조합 필터

### 3.4 가져오기/내보내기 (선택, 후순위)
- [ ] 브라우저 북마크(HTML) 가져오기
- [ ] CSV/JSON 내보내기

### 3.5 인증 & 보안
- [ ] 로그인 페이지: 비밀번호/PIN 입력
- [ ] 성공 시 httpOnly 쿠키(JWT, 30일 만료) 발급
- [ ] 미들웨어에서 모든 페이지·API 요청에 쿠키 검증 (로그인/공유 저장 API 제외)
- [ ] robots.txt 전체 차단 + `<meta name="robots" content="noindex,nofollow">`

---

## 4. 화면 구성

1. **/login** — 비밀번호/PIN 입력 화면
2. **/** (메인) — 링크 목록
   - 상단: 검색창, 폴더/태그 필터, 정렬 옵션
   - 좌측(또는 드로어): 폴더 트리
   - 카드형 리스트: 썸네일(og:image) + 제목 + 도메인 + 태그 + 즐겨찾기 토글
   - 링크 클릭 시 새 탭으로 이동, 카드 내 메뉴에서 수정/삭제/폴더 이동
3. **/link/[id]** (선택) — 개별 링크 상세/메모 편집
4. 공유하기로 들어왔을 때는 별도 화면 없이 저장 후 메인으로 리다이렉트 + 토스트 알림("저장됨")

---

## 5. DB 스키마 (Supabase / Postgres)

```sql
create extension if not exists "pgcrypto";

create table folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table links (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text,
  description text,
  image text,
  favicon text,
  memo text,
  folder_id uuid references folders(id) on delete set null,
  is_favorite boolean not null default false,
  is_read boolean not null default false,
  is_broken boolean not null default false,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table link_tags (
  link_id uuid not null references links(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (link_id, tag_id)
);

create index idx_links_folder on links(folder_id);
create index idx_links_created on links(created_at desc);
create index idx_folders_parent on folders(parent_id);

-- 단일 사용자 앱: RLS는 켜두되 별도 정책 없이(anon 키로 접근 전부 차단),
-- 서버 API는 service_role 키로 RLS를 우회해서 접근한다.
alter table folders enable row level security;
alter table links enable row level security;
alter table tags enable row level security;
alter table link_tags enable row level security;
```

> 회원 테이블은 만들지 않는다 (1인 전용이므로 인증은 비밀번호 하나로 처리, DB에는 사용자 개념 자체가 없음).

---

## 6. 인증 흐름

```
[로그인 페이지]
  → 비밀번호/PIN 입력 → POST /api/auth/login
  → 서버: 환경변수 APP_PASSWORD와 상수시간 비교
  → 일치 시 JWT 서명(HS256, exp 30일) → httpOnly 쿠키(stash_session) 발급
  → SameSite=Lax, Secure(운영환경), path=/

[이후 모든 요청]
  → middleware.ts에서 쿠키 검증
  → 실패 시: API 요청 → 401 JSON / 페이지 요청 → /login 리다이렉트
  → /login, /api/auth/login, /api/share(GET, 공유용), manifest.json, robots.txt만 예외 허용
```

> 공유하기(Web Share Target)로 들어오는 요청은 브라우저가 세션 쿠키를 함께 보내므로,
> 앱을 미리 로그인해둔 상태여야 정상 저장된다. 로그인 안 된 상태로 공유하면 저장 실패 처리.

---

## 7. API 명세 (Next.js Route Handlers)

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | /api/auth/login | 비밀번호 검증, 세션 쿠키 발급 | 불필요 |
| POST | /api/auth/logout | 세션 쿠키 삭제 | 필요 |
| GET | /api/share | Android 공유하기 진입점 (url/text 파라미터 파싱 → 저장 → 리다이렉트) | 필요(쿠키) |
| POST | /api/share | 앱 내 수동 URL 추가 | 필요 |
| GET | /api/links | 목록 조회 (쿼리: q, folderId, favorite) | 필요 |
| PATCH | /api/links/:id | 제목/메모/폴더/즐겨찾기/읽음 상태 수정 | 필요 |
| DELETE | /api/links/:id | 링크 삭제 | 필요 |
| GET | /api/folders | 폴더 목록 | 필요 |
| POST | /api/folders | 폴더 생성 | 필요 |
| PATCH | /api/folders/:id | 폴더명/부모 변경 | 필요 |
| DELETE | /api/folders/:id | 폴더 삭제 | 필요 |
| GET/POST | /api/tags | 태그 목록/생성 | 필요 |

---

## 8. PWA / Android 공유하기 설정

**manifest.json 핵심 부분**
```json
{
  "name": "Stash",
  "short_name": "Stash",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "share_target": {
    "action": "/api/share",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

- 사용자가 홈 화면에 **PWA 설치**를 해야만 안드로이드 공유 시트 목록에 Stash가 표시됨 (최초 1회 안내 필요)
- 공유 앱마다 `url`이 아니라 `text`에만 링크를 넣는 경우가 있으므로, 서버에서 `text`/`title`에서도 URL 정규식 추출 필요

---

## 9. 도메인 & 노출 차단

- Vercel 프로젝트에 커스텀 도메인 `stash.kro.kr` 연결 (CNAME → `cname.vercel-dns.com`, kro.kr이 CNAME 미지원 시 A레코드로 대체)
- `app/robots.ts`로 전체 크롤링 차단 (`Disallow: /`)
- 모든 페이지 metadata에 `robots: { index: false, follow: false }` 적용
- SSL은 Vercel 자동 발급(Let's Encrypt)

---

## 10. 환경변수

| 변수명 | 설명 | 비고 |
|---|---|---|
| SUPABASE_URL | Supabase 프로젝트 URL | 서버 전용 |
| SUPABASE_SERVICE_ROLE_KEY | Supabase 서비스 롤 키 | 서버 전용, 절대 노출 금지 (NEXT_PUBLIC_ 접두사 사용 안 함) |
| SESSION_SECRET | JWT 서명용 랜덤 시크릿 (32바이트 이상) | 서버 전용 |
| APP_PASSWORD | 로그인용 비밀번호/PIN | 서버 전용 |

---

## 11. 폴더 구조 (제안)

```
stash/
├─ app/
│  ├─ layout.tsx              # metadata(noindex), manifest 연결
│  ├─ robots.ts                # robots.txt 동적 생성
│  ├─ page.tsx                 # 메인 링크 목록 화면
│  ├─ login/page.tsx           # 로그인 화면
│  └─ api/
│     ├─ auth/login/route.ts
│     ├─ auth/logout/route.ts
│     ├─ share/route.ts        # GET(공유수신)/POST(수동추가)
│     ├─ links/route.ts        # GET(목록)
│     ├─ links/[id]/route.ts   # PATCH/DELETE
│     ├─ folders/route.ts      # GET/POST
│     ├─ folders/[id]/route.ts # PATCH/DELETE
│     └─ tags/route.ts
├─ lib/
│  ├─ supabase.ts              # service role 클라이언트
│  ├─ auth.ts                  # JWT 발급/검증, 비밀번호 비교
│  └─ metadata.ts              # OG 메타데이터 크롤링
├─ middleware.ts                # 인증 가드
├─ public/
│  ├─ manifest.json
│  └─ icons/
└─ supabase/schema.sql
```

---

## 12. 개발 순서 (Claude Code 작업 순서 제안)

1. Next.js 프로젝트 초기화 + Tailwind + Supabase/jose/cheerio 설치
2. Supabase 프로젝트 생성 → `supabase/schema.sql` 실행
3. `lib/auth.ts`, `lib/supabase.ts` 작성
4. `middleware.ts` 인증 가드 작성
5. `/login` 페이지 + `/api/auth/login`, `/api/auth/logout` 구현
6. `/api/share` (GET/POST) + `lib/metadata.ts` OG 크롤링 구현
7. `/api/links`, `/api/folders`, `/api/tags` CRUD 구현
8. 메인 페이지(`/`) UI: 링크 카드 목록, 검색, 폴더 사이드바, 태그 필터
9. `manifest.json` + 아이콘 + Service Worker 등록 (PWA 설치 가능하게)
10. `robots.ts` + metadata noindex 적용
11. Vercel 배포 + 환경변수 등록 + `stash.kro.kr` 도메인 연결
12. 실기기(Android)에서 PWA 설치 → 공유하기 테스트
13. (선택) 북마크 가져오기/내보내기, 깨진 링크 체크 크론 추가

---

## 13. 후순위 아이디어 (여유 있으면)

- 클릭 수 카운트 후 대시보드(가장 많이 본 링크 등)
- 다크모드 토글 (기본 다크로 시작하면 우선순위 낮음)
- 링크 열람 시 "읽음" 자동 처리
- Vercel Cron으로 주기적 깨진 링크 체크
