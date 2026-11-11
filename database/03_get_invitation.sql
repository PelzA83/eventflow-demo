-- 03_get_invitation.sql
-- Получение данных приглашения по персональному токену

CREATE OR REPLACE FUNCTION public.get_invitation(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'event', jsonb_build_object(
            'title', e.title,
            'date', e.event_date,
            'time', e.event_time,
            'timezone', e.timezone,
            'venue_name', e.venue_name,
            'venue_address', e.venue_address,
            'rsvp_deadline', e.rsvp_deadline
        ),
        'group', jsonb_build_object(
            'name', gg.name
        ),
        'guests', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', g.id,
                    'first_name', g.first_name,
                    'last_name', g.last_name,
                    'rsvp_status', g.rsvp_status
                )
                ORDER BY g.created_at
            )
            FROM public.guests g
            WHERE g.group_id = gg.id
        )
    )
    FROM public.guest_groups gg
    JOIN public.events e ON e.id = gg.event_id
    WHERE gg.access_token = p_token
      AND e.status = 'active';
$$;

-- Права на вызов функции
REVOKE ALL ON FUNCTION public.get_invitation(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_invitation(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invitation(text) TO authenticated;
