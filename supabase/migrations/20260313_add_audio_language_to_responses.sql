-- Store selected spoken language for better Deepgram transcription
alter table responses
  add column if not exists audio_language text not null default 'en';
