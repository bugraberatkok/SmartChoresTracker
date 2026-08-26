package com.capstone.choreapp.chore.service;

import com.capstone.choreapp.chore.dto.CreateChoreRequest;
import com.capstone.choreapp.chore.dto.ChoreResponse;
import com.capstone.choreapp.chore.dto.UpdateChoreRequest;
import com.capstone.choreapp.chore.entity.Chore;
import com.capstone.choreapp.chore.entity.ChoreStatus;
import com.capstone.choreapp.chore.mapper.ChoreMapper;
import com.capstone.choreapp.chore.repository.ChoreRepository;
import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.group.exception.GroupNotFoundException;
import com.capstone.choreapp.group.membership.service.GroupMembershipService;
import com.capstone.choreapp.group.repository.GroupRepository;
import com.capstone.choreapp.user.entity.User;
import com.capstone.choreapp.user.exception.UserNotFoundException;
import com.capstone.choreapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import com.capstone.choreapp.chore.exception.ChoreNotFoundException;

@Service
@RequiredArgsConstructor
public class ChoreService {

    private final ChoreRepository choreRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final GroupMembershipService groupMembershipService;
    private final ChoreMapper choreMapper;


    @Transactional
    public ChoreResponse createChore(
            Long groupId,
            Long creatorId,
            CreateChoreRequest request
    ) {
        groupMembershipService.requireManager(groupId, creatorId);

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new GroupNotFoundException(groupId));

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() ->
                        new UserNotFoundException("Authenticated user was not found")
                );

        User assignedUser = null;

        if (request.assignedUserId() != null) {
            assignedUser = userRepository
                    .findById(request.assignedUserId())
                    .orElseThrow(() ->
                            new UserNotFoundException("Assigned user was not found")
                    );

            groupMembershipService.requireMember(
                    groupId,
                    assignedUser.getId()
            );
        }

        Chore chore = new Chore();

        chore.setTitle(request.title().trim());
        chore.setDescription(
                request.description() != null
                        ? request.description().trim()
                        : null
        );
        chore.setGroup(group);
        chore.setCreatedBy(creator);
        chore.setAssignedUser(assignedUser);
        chore.setStatus(ChoreStatus.PENDING);
        chore.setPoints(
                request.points() != null
                        ? request.points()
                        : 0
        );
        chore.setDueDate(request.dueDate());

        Chore savedChore = choreRepository.save(chore);

        return choreMapper.toResponse(savedChore);
    }

    @Transactional(readOnly = true)
    public List<ChoreResponse> getGroupChores(
            Long groupId,
            Long userId
    ) {
        groupMembershipService.requireMember(groupId, userId);

        return choreRepository.findAllByGroupId(groupId)
                .stream()
                .map(choreMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ChoreResponse getChoreById(
            Long groupId,
            Long choreId,
            Long userId
    ) {
        groupMembershipService.requireMember(groupId, userId);

        Chore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ChoreNotFoundException(choreId));

        if (!chore.getGroup().getId().equals(groupId)) {
            throw new ChoreNotFoundException(choreId);
        }

        return choreMapper.toResponse(chore);
    }

    @Transactional
    public ChoreResponse updateChore(
            Long groupId,
            Long choreId,
            Long requesterId,
            UpdateChoreRequest request
    ) {
        groupMembershipService.requireManager(groupId, requesterId);

        Chore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ChoreNotFoundException(choreId));

        if (!chore.getGroup().getId().equals(groupId)) {
            throw new ChoreNotFoundException(choreId);
        }

        if (request.title() != null) {
            String title = request.title().trim();

            if (title.isBlank()) {
                throw new IllegalArgumentException("Chore title cannot be blank");
            }

            chore.setTitle(title);
        }

        if (request.description() != null) {
            chore.setDescription(request.description().trim());
        }

        if (request.points() != null) {
            chore.setPoints(request.points());
        }

        if (request.dueDate() != null) {
            chore.setDueDate(request.dueDate());
        }

        if (request.assignedUserId() != null) {
            User assignedUser = userRepository
                    .findById(request.assignedUserId())
                    .orElseThrow(() ->
                            new UserNotFoundException("Assigned user was not found")
                    );

            // En önemli güvenlik/business kontrolü:
            // kullanıcı gerçekten bu group'un üyesi mi?
            groupMembershipService.requireMember(
                    groupId,
                    assignedUser.getId()
            );

            chore.setAssignedUser(assignedUser);
        }

        return choreMapper.toResponse(chore);
    }

    @Transactional
    public void deleteChore(
            Long groupId,
            Long choreId,
            Long requesterId
    ) {
        groupMembershipService.requireManager(groupId, requesterId);

        Chore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ChoreNotFoundException(choreId));

        if (!chore.getGroup().getId().equals(groupId)) {
            throw new ChoreNotFoundException(choreId);
        }

        choreRepository.delete(chore);
    }

    @Transactional
    public ChoreResponse completeChore(
            Long groupId,
            Long choreId,
            Long requesterId
    ) {
        // Grubun dışındaki biri chore tamamlayamasın
        groupMembershipService.requireMember(groupId, requesterId);

        Chore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ChoreNotFoundException(choreId));

        if (!chore.getGroup().getId().equals(groupId)) {
            throw new ChoreNotFoundException(choreId);
        }

        boolean isAssignedUser =
                chore.getAssignedUser() != null
                        && chore.getAssignedUser().getId().equals(requesterId);

        // Assigned user değilse OWNER / ADMIN olmak zorunda
        if (!isAssignedUser) {
            groupMembershipService.requireManager(groupId, requesterId);
        }

        // Tekrar request gelirse sorun çıkarmasın
        if (chore.getStatus() == ChoreStatus.COMPLETED) {
            return choreMapper.toResponse(chore);
        }

        chore.setStatus(ChoreStatus.COMPLETED);
        chore.setCompletedAt(Instant.now());

        return choreMapper.toResponse(chore);
    }
}