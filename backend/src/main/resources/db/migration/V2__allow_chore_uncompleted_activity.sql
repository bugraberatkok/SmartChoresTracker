ALTER TABLE activity_events
    DROP CONSTRAINT IF EXISTS activity_events_type_check;

ALTER TABLE activity_events
    DROP CONSTRAINT IF EXISTS activity_events_type_check;

ALTER TABLE activity_events
    ADD CONSTRAINT activity_events_type_check
    CHECK (type IN ('CHORE_CREATED', 'CHORE_COMPLETED', 'CHORE_UNCOMPLETED'));
