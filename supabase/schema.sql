create extension if not exists "pgcrypto";

-- 폴더 (중첩 가능)
create table folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  parent_id  uuid references folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 링크
create table links (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  url         text not null,
  title       text,
  description text,
  image       text,
  favicon     text,
  memo        text,
  folder_id   uuid references folders(id) on delete set null,
  is_favorite boolean not null default false,
  is_read     boolean not null default false,
  is_broken   boolean not null default false,
  click_count integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 태그 (유저별로 관리)
create table tags (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name    text not null,
  unique (user_id, name)
);

-- 링크-태그 관계
create table link_tags (
  link_id uuid not null references links(id) on delete cascade,
  tag_id  uuid not null references tags(id) on delete cascade,
  primary key (link_id, tag_id)
);

-- 인덱스
create index idx_links_folder   on links(folder_id);
create index idx_links_created  on links(created_at desc);
create index idx_links_user     on links(user_id);
create index idx_folders_parent on folders(parent_id);
create index idx_folders_user   on folders(user_id);
create index idx_tags_user      on tags(user_id);

-- updated_at 자동 갱신 트리거
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_links_updated_at
  before update on links
  for each row execute procedure set_updated_at();

-- RLS 활성화
alter table folders   enable row level security;
alter table links     enable row level security;
alter table tags      enable row level security;
alter table link_tags enable row level security;

-- RLS 정책: 본인 데이터만 접근
create policy "folders_owner" on folders for all
  using (auth.uid() = user_id);

create policy "links_owner" on links for all
  using (auth.uid() = user_id);

create policy "tags_owner" on tags for all
  using (auth.uid() = user_id);

-- link_tags: 링크 소유자만 접근
create policy "link_tags_owner" on link_tags for all
  using (
    exists (
      select 1 from links
      where links.id = link_id and links.user_id = auth.uid()
    )
  );
