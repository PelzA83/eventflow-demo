-- 04_submit_rsvp.sql
-- Обработка ответов гостей (RSVP)

CREATE OR REPLACE FUNCTION public.submit_rsvp(
    p_token text,
    p_responses jsonb,
    p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_group_id uuid;
    v_event_id uuid;
    v_event_status text;
    v_deadline date;
    v_timezone text;
    v_guest_count integer;
    v_response_count integer;
    v_unique_count integer;
    v_guest_id uuid;
    v_attendance text;
    v_item jsonb;
BEGIN
    -- Проверяем формат переданных ответов
    IF jsonb_typeof(p_responses) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Responses must be a JSON array';
    END IF;

    -- Находим группу и мероприятие, блокируем строки
    SELECT
        gg.id,
        e.id,
        e.status,
        e.rsvp_deadline,
        e.timezone
    INTO
        v_group_id,
        v_event_id,
        v_event_status,
        v_deadline,
        v_timezone
    FROM public.guest_groups gg
    JOIN public.events e ON e.id = gg.event_id
    WHERE gg.access_token = p_token
    FOR UPDATE OF gg, e;

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;

    -- Проверяем статус мероприятия
    IF v_event_status <> 'active' THEN
        RAISE EXCEPTION 'Event is not active';
    END IF;

    -- Проверяем наличие дедлайна
    IF v_deadline IS NULL THEN
        RAISE EXCEPTION 'RSVP deadline is not configured';
    END IF;

    -- Проверяем дедлайн по часовому поясу мероприятия
    IF (NOW() AT TIME ZONE v_timezone)::date > v_deadline THEN
        RAISE EXCEPTION 'RSVP deadline has passed';
    END IF;

    -- Считаем количество гостей в группе
    SELECT COUNT(*)
    INTO v_guest_count
    FROM public.guests
    WHERE group_id = v_group_id;

    -- Проверяем количество и уникальность ответов
    SELECT
        COUNT(*),
        COUNT(DISTINCT item->>'guest_id')
    INTO
        v_response_count,
        v_unique_count
    FROM jsonb_array_elements(p_responses) AS item;

    IF v_response_count <> v_guest_count THEN
        RAISE EXCEPTION 'Responses must include every guest';
    END IF;

    IF v_unique_count <> v_response_count THEN
        RAISE EXCEPTION 'Duplicate guest responses';
    END IF;

    -- Проверяем корректность каждого ответа
    FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(p_responses)
    LOOP
        IF jsonb_typeof(v_item) <> 'object'
           OR v_item->>'guest_id' IS NULL
           OR v_item->>'attendance' NOT IN ('yes', 'no') THEN
            RAISE EXCEPTION 'Invalid guest response';
        END IF;

        -- Проверяем принадлежность гостя к группе
        IF NOT EXISTS (
            SELECT 1
            FROM public.guests g
            WHERE g.id::text = v_item->>'guest_id'
              AND g.group_id = v_group_id
        ) THEN
            RAISE EXCEPTION 'Guest does not belong to this group';
        END IF;
    END LOOP;

    -- Сохраняем или обновляем ответы
    FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(p_responses)
    LOOP
        v_guest_id := (v_item->>'guest_id')::uuid;
        v_attendance := v_item->>'attendance';

        INSERT INTO public.rsvp (
            guest_id,
            attendance,
            comment,
            responded_at
        )
        VALUES (
            v_guest_id,
            v_attendance,
            p_comment,
            NOW()
        )
        ON CONFLICT (guest_id)
        DO UPDATE SET
            attendance = EXCLUDED.attendance,
            comment = EXCLUDED.comment,
            responded_at = NOW();

        -- Обновляем статус гостя
        UPDATE public.guests
        SET rsvp_status = CASE
            WHEN v_attendance = 'yes' THEN 'confirmed'
            ELSE 'declined'
        END
        WHERE id = v_guest_id;
    END LOOP;

    -- Возвращаем результат
    RETURN jsonb_build_object(
        'success', true,
        'message', 'RSVP successfully saved',
        'guests_updated', v_response_count,
        'rsvp_deadline', v_deadline
    );
END;
$$;

-- Права на вызов функции
REVOKE ALL ON FUNCTION public.submit_rsvp(text, jsonb, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_rsvp(text, jsonb, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(text, jsonb, text) TO authenticated;
