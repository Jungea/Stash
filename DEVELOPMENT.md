# Stash 개발 문서

개발자를 위한 문서입니다. 서비스 소개와 사용 방법은 [README.md](./README.md)를 참고하세요.

## 주요 기능

- **링크 저장**
  - 안드로이드 공유하기(Web Share Target) → `/save` 화면에서 이름·설명·폴더 선택 후 저장
  - 앱 내 "링크 추가" 모달로 수동 추가
  - URL 입력 시 OG 메타데이터(제목/설명/대표 이미지/파비콘) 자동 수집
  - `text`/`title`에만 링크가 담겨 오는 공유도 URL 정규식으로 추출
- **정리**
  - 중첩 폴더 (색상 지정, 드래그로 순서 변경, 이름 변경/삭제)
  - 태그, 즐겨찾기, 읽음 상태, 개인 메모
  - 링크 수정 및 폴더 이동
- **검색/필터/정렬**
  - 제목·URL·메모·설명 통합 검색
  - 폴더 / 태그 / 즐겨찾기 필터
  - 정렬: 최신순 / 이름순, 즐겨찾기 우선 고정 옵션
- **UI/UX**
  - 카드형 목록(썸네일 + 제목 + 도메인), 무한 스크롤, 스켈레톤 로딩, 토스트 알림
  - 항상 다크 테마, 모바일 바텀시트 모달
- **PWA**
  - 홈 화면 설치, 서비스 워커(배포마다 캐시 버전 자동 갱신 후 새로고침)
- **인증**
  - Supabase Auth(이메일/비밀번호), 계정별 데이터 분리(RLS)
- **노출 차단**
  - noindex + robots 전체 차단

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript |
| 스타일 | Tailwind CSS 4, lucide-react |
| DB / 인증 | Supabase (Postgres, Auth, RLS), `@supabase/ssr` |
| 크롤링 | cheerio (서버에서 fetch 후 OG 태그 파싱) |
| 배포 | Vercel |

## 화면

| 경로 | 설명 |
|---|---|
| `/login` | 이메일/비밀번호 로그인 |
| `/` | 링크 목록 (검색, 필터, 정렬, 폴더 사이드바) |
| `/save` | 공유하기로 들어온 URL의 저장 화면 (폴더/이름/설명 선택) |
| `/folders` | 폴더 관리 (생성, 색상, 이름 변경, 삭제, 드래그 정렬) |

## API

모든 API는 로그인 세션이 필요합니다. 예외는 `/api/health`입니다.
검증은 `proxy.ts`에서 처리하며, 미인증 시 API는 401, 페이지는 `/login`으로 리다이렉트됩니다.

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/share` | 공유하기 진입점. URL을 추출해 `/save`로 리다이렉트 |
| POST | `/api/share` | 링크 저장 (url, title, description, folderId) |
| GET | `/api/metadata` | URL의 OG 메타데이터 조회 |
| GET | `/api/links` | 목록 (`q`, `folderId`, `tagId`, `favorite`, `sort`, `pinFavorites`, `page`, `limit`, `count`) |
| PATCH / DELETE | `/api/links/:id` | 링크 수정(태그 포함) / 삭제 |
| GET / POST | `/api/folders` | 폴더 목록 / 생성 |
| PATCH / DELETE | `/api/folders/:id` | 폴더 수정 / 삭제 |
| POST | `/api/folders/reorder` | 폴더 순서·부모 변경 |
| GET / POST | `/api/tags` | 태그 목록(링크 수 포함) / 생성 |
| GET / PATCH | `/api/settings` | 사용자 설정 조회 / 병합 저장 |
| GET | `/api/sw` | 서비스 워커 (`/sw.js`로 rewrite, 커밋 SHA로 캐시 키 갱신) |
| GET | `/api/health` | 헬스 체크 |

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. Supabase 준비

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/schema.sql`을 실행합니다. (기존 테이블이 있으면 먼저 삭제)
3. Authentication > Users에서 사용할 계정을 직접 추가합니다. (회원가입 화면은 없습니다)
4. Settings > API에서 Project URL과 anon 키를 확인합니다.

> **주의**: `/api/settings`는 `user_settings` 테이블(`user_id`, `preferences`, `updated_at`)을 사용하지만, 현재 `supabase/schema.sql`에는 정의되어 있지 않습니다. 설정 기능을 쓰려면 해당 테이블을 별도로 만들어야 합니다.

### 3. 환경변수

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) 키 |

### 4. 실행

```bash
npm run dev     # 개발 서버 (http://localhost:3000)
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 실행
npm run lint    # ESLint
```

## 배포

1. GitHub 레포를 Vercel에 Import합니다.
2. Vercel > Settings > Environment Variables에 위 두 환경변수를 등록하고 Redeploy합니다.
3. Settings > Domains에 `stash.kro.kr`을 추가하고, kro.kr DNS에 CNAME `stash` → `cname.vercel-dns.com`을 등록합니다. (CNAME이 안 되면 A레코드)
4. SSL은 Vercel이 자동 발급합니다.

## Android 설치 및 공유하기 테스트

1. Android Chrome에서 사이트에 접속해 로그인합니다.
2. 메뉴(⋮) > "홈 화면에 추가"로 PWA를 설치합니다. (설치해야 공유 시트에 Stash가 표시됩니다)
3. 다른 앱에서 링크 공유 → Stash 선택 → 폴더/이름 확인 후 저장합니다.

> 로그인이 풀린 상태로 공유하면 저장할 수 없습니다.

## 아이콘 생성

`scripts/`의 스크립트로 `public/icons/`의 PWA 아이콘(192/512)을 생성합니다. (`jimp` 사용)

```bash
node scripts/generate-icons.mjs
```

## 프로젝트 구조

```
├─ app/
│  ├─ layout.tsx            # 메타데이터(noindex), manifest, 서비스 워커 등록
│  ├─ page.tsx              # 메인 링크 목록
│  ├─ login/                # 로그인
│  ├─ save/                 # 공유 저장 화면
│  ├─ folders/              # 폴더 관리
│  ├─ robots.ts             # 전체 크롤링 차단
│  ├─ icon.tsx              # 앱 아이콘
│  └─ api/                  # share, links, folders, tags, metadata, settings, sw, health
├─ components/              # MainView, LinkCard, FolderSidebar, AddLinkModal, EditLinkModal,
│                           # FolderPickerModal, SortModal, CustomSelect, Toast 등
├─ lib/
│  ├─ metadata.ts           # OG 메타데이터 크롤링, URL 추출
│  └─ supabase/             # 서버/클라이언트 Supabase 클라이언트
├─ types/index.ts           # 공용 타입
├─ proxy.ts                 # 인증 가드 (Next.js 16 proxy)
├─ public/                  # manifest.json, icons, sw.js
├─ supabase/schema.sql      # DB 스키마 + RLS 정책
├─ scripts/                 # 아이콘 생성 스크립트
└─ logs/                    # 세션 작업 로그
```

## 예정 / 미구현

- 깨진 링크 주기 체크 (Vercel Cron)
- 브라우저 북마크 가져오기, CSV/JSON 내보내기
- 링크 열람 시 읽음 자동 처리, 클릭 수 대시보드

## 관련 문서

- [`Stash_기획서.md`](./Stash_기획서.md): 초기 기획서 (일부 내용은 현재 구현과 다름)
- [`TODO_수동작업.md`](./TODO_수동작업.md): 직접 해야 하는 설정 작업 목록
- [LICENSE](./LICENSE)
