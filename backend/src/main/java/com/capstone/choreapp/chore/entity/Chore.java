package com.capstone.choreapp.chore.entity;

import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "chores")
@Getter
@Setter
@NoArgsConstructor
public class Chore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 500)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_user_id")
    private User assignedUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChoreStatus status;

    @Column(nullable = false)
    private Integer points;

    @Column(nullable = false, length = 16, columnDefinition = "varchar(16) default '🧹'")
    private String icon = "🧹";

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean recurring;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "chore_recurrence_days", joinColumns = @JoinColumn(name = "chore_id"))
    @Column(name = "day_of_week", nullable = false, length = 12)
    @Enumerated(EnumType.STRING)
    private Set<DayOfWeek> recurrenceDays = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "chore_completion_dates", joinColumns = @JoinColumn(name = "chore_id"))
    @Column(name = "completion_date", nullable = false)
    private Set<LocalDate> completedDates = new HashSet<>();

    @Column(name = "recurrence_start_date")
    private LocalDate recurrenceStartDate;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
