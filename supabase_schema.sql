-- Create the boards table
create table public.bingo_boards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create the items table
create table public.bingo_items (
  id uuid default gen_random_uuid() primary key,
  board_id uuid references public.bingo_boards(id) on delete cascade not null,
  text text not null
);

-- Row Level Security (RLS) Policies

-- Enable RLS
alter table public.bingo_boards enable row level security;
alter table public.bingo_items enable row level security;

-- Policies for boards
create policy "Users can view their own boards"
on public.bingo_boards for select
using (auth.uid() = user_id);

create policy "Users can insert their own boards"
on public.bingo_boards for insert
with check (auth.uid() = user_id);

create policy "Users can update their own boards"
on public.bingo_boards for update
using (auth.uid() = user_id);

create policy "Users can delete their own boards"
on public.bingo_boards for delete
using (auth.uid() = user_id);

-- Policies for items (users can access items if they own the board)
create policy "Users can view items of their boards"
on public.bingo_items for select
using (
  exists (
    select 1 from public.bingo_boards
    where public.bingo_boards.id = public.bingo_items.board_id
    and public.bingo_boards.user_id = auth.uid()
  )
);

create policy "Users can insert items to their boards"
on public.bingo_items for insert
with check (
  exists (
    select 1 from public.bingo_boards
    where public.bingo_boards.id = public.bingo_items.board_id
    and public.bingo_boards.user_id = auth.uid()
  )
);

create policy "Users can update items on their boards"
on public.bingo_items for update
using (
  exists (
    select 1 from public.bingo_boards
    where public.bingo_boards.id = public.bingo_items.board_id
    and public.bingo_boards.user_id = auth.uid()
  )
);

create policy "Users can delete items from their boards"
on public.bingo_items for delete
using (
  exists (
    select 1 from public.bingo_boards
    where public.bingo_boards.id = public.bingo_items.board_id
    and public.bingo_boards.user_id = auth.uid()
  )
);

-- Allow public read access to boards and items (for sharing)?
-- If users want to share boards, we need a policy for that.
-- For now, let's allow anyone to view a board if they have the ID (UUIDs are unguessable-ish, but real public access is better)
-- OR, we restrict it to "Users can view ALL boards" or "Specific shared boards".
-- The requirement is "shareable bingo cards".
-- Let's add a public read policy for everyone for now, so sharing works easily.

create policy "Public read access to boards"
on public.bingo_boards for select
using (true);

create policy "Public read access to items"
on public.bingo_items for select
using (true);

-- Note: The specific policies above for "own boards" might conflict or be redundant if we have specific Select policies.
-- Postgres RLS is permissive (OR). So if "Public read" is true, then auth is not needed for SELECT.
-- But for INSERT/UPDATE/DELETE, the auth policies are needed.
