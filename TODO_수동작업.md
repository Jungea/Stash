# Stash — 직접 해야 할 수동 작업 목록

## 1. Supabase 설정

- [x] 프로젝트 생성 완료
- [ ] SQL Editor에서 기존 테이블이 있으면 전부 삭제 후 `supabase/schema.sql` 실행
- [ ] Authentication > Providers > Email 활성화 확인 (기본값으로 켜져 있음)
- [ ] Authentication > Users > "Add user" 로 계정 생성
  - 개인 계정 (예: personal@gmail.com)
  - 회사 계정 (예: work@company.com)
- [ ] Settings > API에서 아래 두 값 복사
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - anon (public) 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. 로컬 환경변수 설정

- [ ] `.env.local.example` 복사해서 `.env.local` 생성
  ```bash
  cp .env.local.example .env.local
  ```
- [ ] `.env.local` 에 위에서 복사한 값 채우기:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  ```
- [ ] `npm run dev` 로 로컬 테스트

---

## 3. 아이콘 파일 준비

- [ ] `public/icons/icon-192.png` (192×192) 직접 준비
- [ ] `public/icons/icon-512.png` (512×512) 직접 준비

---

## 4. GitHub + Vercel 배포

- [ ] GitHub 새 레포 생성 (private 권장)
- [ ] 로컬에서 푸시:
  ```bash
  git init
  git add .
  git commit -m "init: Stash 초기 설정"
  git remote add origin https://github.com/유저명/레포명.git
  git push -u origin main
  ```
- [ ] [vercel.com](https://vercel.com) 에서 해당 레포 Import
- [ ] Vercel > Settings > Environment Variables 에 아래 2개 등록:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] 등록 후 Deployments > Redeploy

---

## 5. 도메인 연결

- [ ] Vercel > Settings > Domains > `stash.kro.kr` 추가
- [ ] kro.kr 관리 페이지에서 DNS 등록:
  - CNAME `stash` → `cname.vercel-dns.com`
  - (CNAME 불가 시 A레코드로 Vercel IP 등록)
- [ ] SSL 자동 발급 확인 (수 분 소요)

---

## 6. Android PWA 설치

- [ ] Android Chrome에서 `stash.kro.kr` 접속 후 로그인
- [ ] 브라우저 메뉴(⋮) > "홈 화면에 추가"
- [ ] 설치 후 다른 앱에서 공유하기 시 Stash가 목록에 뜨는지 확인
