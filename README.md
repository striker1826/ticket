# Lucky Ticket Application (1-100)

이 프로젝트는 React와 Supabase를 사용하여 1부터 100까지 중복 없는 무작위 번호표를 각 기기(단말기)별로 발급해 주는 간단한 웹 애플리케이션입니다.

## Supabase 설정 방법

1. [Supabase](https://supabase.com/)에서 새 프로젝트를 생성합니다.
2. Supabase 대시보드 내 **SQL Editor**로 이동하여 아래 SQL 스크립트를 실행합니다.

```sql
-- 1. 티켓 저장용 테이블 생성
create table public.device_tickets (
  id uuid default gen_random_uuid() primary key,
  device_id text not null unique,
  ticket_number integer not null unique check (ticket_number >= 1),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Row Level Security (RLS) 활성화
alter table public.device_tickets enable row level security;

-- 3. 익명 사용자(Public) 조회 정책 생성 (조회 권한만 부여)
create policy "Allow read access to anyone" on public.device_tickets for select using (true);

-- 4. 원자적(Atomic) 순차 번호 할당 및 중복 방지를 위한 Postgres RPC 함수 생성
create or replace function assign_ticket(client_device_id text)
returns integer
language plpgsql
security definer
as $$
declare
  assigned_number integer;
begin
  -- 이미 발급된 번호표가 있는지 확인
  select ticket_number into assigned_number
  from public.device_tickets
  where device_id = client_device_id;
  
  if assigned_number is not null then
    return assigned_number;
  end if;
  
  -- 1부터 순서대로 번호 부여 (가장 마지막 발급된 번호 + 1)
  select coalesce(max(ticket_number), 0) + 1 into assigned_number
  from public.device_tickets;

  insert into public.device_tickets (device_id, ticket_number)
  values (client_device_id, assigned_number)
  returning ticket_number into assigned_number;
  
  return assigned_number;
exception
  when unique_violation then
    -- 동시 트랜잭션 충돌 시 재시도 (재귀 호출)
    return assign_ticket(client_device_id);
end;
$$;
```

## 환경 변수 설정

프로젝트 루트 폴더(`ticket-app/`)에 `.env` 파일을 생성하고 아래 내용을 입력해 주세요:

```env
VITE_SUPABASE_URL=여기에_자신의_Supabase_프로젝트_URL_입력
VITE_SUPABASE_ANON_KEY=여기에_자신의_Supabase_API_키(Anon_Key)_입력
```

## 프로젝트 실행 방법

```bash
# 의존성 설치 (이미 실행되었다면 건너뛰셔도 됩니다)
npm install

# 로컬 개발 서버 구동
npm run dev
```
