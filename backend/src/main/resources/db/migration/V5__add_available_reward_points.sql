ALTER TABLE group_memberships
    ADD COLUMN available_points integer NOT NULL DEFAULT 0;

-- Start each member with the points represented by their currently completed
-- chores. From this point onward, completions add to this balance and reward
-- redemptions subtract from it, independently of older redemption history.
UPDATE group_memberships membership
SET available_points = CAST(COALESCE((
    SELECT SUM(
        COALESCE(chore.points, 0) *
        CASE
            WHEN chore.recurring THEN (
                SELECT COUNT(*)
                FROM chore_completion_dates completion
                WHERE completion.chore_id = chore.id
            )
            WHEN chore.status = 'COMPLETED' THEN 1
            ELSE 0
        END
    )
    FROM chores chore
    WHERE chore.group_id = membership.group_id
      AND chore.assigned_user_id = membership.user_id
), 0) AS integer);
