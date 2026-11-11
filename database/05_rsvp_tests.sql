-- 05_rsvp_tests.sql
-- Проверки RSVP и состояния базы EventFlow

-- 1. Просмотр мероприятия и срока RSVP
SELECT
    title,
    event_date,
    rsvp_deadline,
    timezone,
    status
FROM public.events
WHERE title = 'Свадьба Александра и Марии';


-- 2. Просмотр гостей и их ответов
SELECT
    g.first_name,
    g.last_name,
    g.role,
    g.rsvp_status,
    r.attendance,
    r.comment,
    r.responded_at
FROM public.guests g
JOIN public.guest_groups gg ON gg.id = g.group_id
LEFT JOIN public.rsvp r ON r.guest_id = g.id
WHERE gg.name = 'Семья Ивановых'
ORDER BY g.created_at;


-- 3. Проверка общего количества ответов
SELECT
    COUNT(*) AS total_guests,
    COUNT(r.id) AS total_rsvp_records,
    COUNT(*) FILTER (
        WHERE r.attendance = 'yes'
    ) AS confirmed_count,
    COUNT(*) FILTER (
        WHERE r.attendance = 'no'
    ) AS declined_count,
    COUNT(*) FILTER (
        WHERE r.id IS NULL
    ) AS pending_count
FROM public.guests g
JOIN public.guest_groups gg ON gg.id = g.group_id
LEFT JOIN public.rsvp r ON r.guest_id = g.id
WHERE gg.name = 'Семья Ивановых';
