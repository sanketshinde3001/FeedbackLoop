-- Add edited video support to responses
alter table responses
  add column if not exists edited_video_url text,
  add column if not exists caption_vtt_url text,
  add column if not exists wall_video_source text not null default 'raw';

alter table responses
  drop constraint if exists responses_wall_video_source_check;

alter table responses
  add constraint responses_wall_video_source_check
  check (wall_video_source in ('raw', 'edited'));
