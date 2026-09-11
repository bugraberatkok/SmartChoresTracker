package com.capstone.choreapp.chore.repository;

import com.capstone.choreapp.chore.entity.Chore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChoreRepository extends JpaRepository<Chore, Long> {

    List<Chore> findAllByGroupId(Long groupId);

    @Modifying
    @Query("""
        update Chore c
        set c.assignedUser = null
        where c.group.id = :groupId
        and c.assignedUser.id = :userId
        """)
    void unassignUserFromGroupChores(
            @Param("groupId") Long groupId,
            @Param("userId") Long userId
    );

    @Modifying
    @Query("""
        delete from Chore c
        where c.group.id = :groupId
        """)
    void deleteAllByGroupId(
            @Param("groupId") Long groupId
    );

    @Modifying
    @Query(value = """
        delete from chore_completion_dates
        where chore_id in (select id from chores where group_id = :groupId)
        """, nativeQuery = true)
    void deleteCompletionDatesByGroupId(@Param("groupId") Long groupId);

    @Modifying
    @Query(value = """
        delete from chore_recurrence_days
        where chore_id in (select id from chores where group_id = :groupId)
        """, nativeQuery = true)
    void deleteRecurrenceDaysByGroupId(@Param("groupId") Long groupId);
}
