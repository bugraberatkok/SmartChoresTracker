package com.capstone.choreapp.activity.service;

import com.capstone.choreapp.activity.dto.ActivityResponse;
import com.capstone.choreapp.activity.entity.ActivityEvent;
import com.capstone.choreapp.activity.entity.ActivityType;
import com.capstone.choreapp.activity.repository.ActivityEventRepository;
import com.capstone.choreapp.chore.entity.Chore;
import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.group.membership.service.GroupMembershipService;
import com.capstone.choreapp.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityEventRepository activityEventRepository;
    private final GroupMembershipService groupMembershipService;

    @Transactional
    public void recordChoreCreated(
            Group group,
            User actor,
            Chore chore
    ) {
        saveEvent(
                group,
                actor,
                chore,
                ActivityType.CHORE_CREATED
        );
    }

    @Transactional
    public void recordChoreCompleted(
            Group group,
            User actor,
            Chore chore
    ) {
        saveEvent(
                group,
                actor,
                chore,
                ActivityType.CHORE_COMPLETED
        );
    }

    @Transactional
    public void recordChoreUncompleted(
            Group group,
            User actor,
            Chore chore
    ) {
        saveEvent(
                group,
                actor,
                chore,
                ActivityType.CHORE_UNCOMPLETED
        );
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> getActivities(
            Long groupId,
            Long requesterId
    ) {
        groupMembershipService.requireMember(
                groupId,
                requesterId
        );

        return activityEventRepository
                .findTop20ByGroupIdOrderByCreatedAtDesc(groupId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void saveEvent(
            Group group,
            User actor,
            Chore chore,
            ActivityType type
    ) {
        ActivityEvent event = new ActivityEvent();

        event.setGroup(group);
        event.setActor(actor);
        event.setType(type);
        event.setChoreId(chore.getId());
        event.setChoreTitle(chore.getTitle());

        activityEventRepository.save(event);
    }

    private ActivityResponse toResponse(ActivityEvent event) {
        return new ActivityResponse(
                event.getId(),
                event.getType(),
                event.getActor().getId(),
                event.getActor().getName(),
                event.getChoreId(),
                event.getChoreTitle(),
                event.getCreatedAt()
        );
    }
}
