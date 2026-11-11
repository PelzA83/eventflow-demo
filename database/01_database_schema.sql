-- 01_database_schema.sql
-- Структура базы данных EventFlow

CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    timezone TEXT DEFAULT 'Europe/Moscow',
    venue_name TEXT,
    venue_address TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.guest_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id)
        ON DELETE CASCADE,
    name TEXT NOT NULL,
    access_token TEXT NOT NULL UNIQUE
        DEFAULT (
            replace(gen_random_uuid()::text, '-', '') ||
            replace(gen_random_uuid()::text, '-', '')
        ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.guest_groups(id)
        ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('primary', 'member')),
    rsvp_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (rsvp_status IN ('pending', 'confirmed', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rsvp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES public.guests(id)
        ON DELETE CASCADE,
    attendance TEXT NOT NULL
        CHECK (attendance IN ('yes', 'no')),
    comment TEXT,
    responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (guest_id)
);

CREATE INDEX idx_guest_groups_event
    ON public.guest_groups(event_id);

CREATE INDEX idx_guests_group
    ON public.guests(group_id);

CREATE INDEX idx_rsvp_guest
    ON public.rsvp(guest_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp ENABLE ROW LEVEL SECURITY;

-- Дедлайн RSVP
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS rsvp_deadline DATE;
