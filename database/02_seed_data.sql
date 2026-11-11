-- 02_seed_data.sql
-- Тестовое мероприятие и гости EventFlow
-- ВНИМАНИЕ: повторный запуск создаст дубликаты данных.

DO $$
DECLARE
    v_event_id UUID;
    v_group_id UUID;
BEGIN
    INSERT INTO public.events (
        title,
        event_date,
        event_time,
        timezone,
        status,
        rsvp_deadline
    )
    VALUES (
        'Свадьба Александра и Марии',
        '2027-06-12',
        '16:00',
        'Europe/Moscow',
        'active',
        '2027-05-29'
    )
    RETURNING id INTO v_event_id;

    INSERT INTO public.guest_groups (
        event_id,
        name
    )
    VALUES (
        v_event_id,
        'Семья Ивановых'
    )
    RETURNING id INTO v_group_id;

    INSERT INTO public.guests (
        group_id,
        first_name,
        last_name,
        role
    )
    VALUES
        (v_group_id, 'Александр', 'Иванов', 'primary'),
        (v_group_id, 'Мария', 'Иванова', 'member'),
        (v_group_id, 'Максим', 'Иванов', 'member');
END $$;
