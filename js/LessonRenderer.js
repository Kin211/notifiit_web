import { appState } from './stateManager.js';
import {
    START_HOUR, END_HOUR, SLOT_MINUTES, SLOT_HEIGHT,
    dayToIndex, timeToDecimal, getSlotIndex, getSlotStartDecimal,
    getEventColor, sortLessons
} from './calendarHelpers.js';
import { CalendarRenderer } from './CalendarRenderer.js';
import { getGlobalBuffer } from './storage.js';
import { Lesson } from './lesson.js';
import { UIManager } from './UIManager.js';

export class LessonRenderer {
    static render(modalManager, onScheduleChanged) {
        CalendarRenderer.hideSkeletons();
        document.querySelectorAll('.event-card').forEach(card => card.remove());

        const bufferZone = document.getElementById('bufferDropZone');
        const emptyPlaceholder = bufferZone?.querySelector('.empty-buffer-placeholder');
        let itemsInBuffer = 0;

        const bufferLessons = getGlobalBuffer(appState.groupId);
        const allLessonsToRender = [...appState.lessons, ...bufferLessons];

        sortLessons(allLessonsToRender).forEach(lessonData => {
            const lesson = new Lesson(lessonData);

            // Вычисление координат
            const startDecimal = timeToDecimal(lesson.startTime);
            const endDecimal = timeToDecimal(lesson.endTime);
            const clippedStartDecimal = Math.max(startDecimal, START_HOUR);
            const clippedEndDecimal = Math.min(endDecimal, END_HOUR);

            if (!Number.isFinite(startDecimal) || !Number.isFinite(endDecimal) || clippedEndDecimal <= clippedStartDecimal) return;

            const startSlotIndex = getSlotIndex(clippedStartDecimal);
            const duration = clippedEndDecimal - clippedStartDecimal;
            const slotStartDecimal = getSlotStartDecimal(startSlotIndex);
            const topOffset = ((clippedStartDecimal - slotStartDecimal) * 60 / SLOT_MINUTES) * SLOT_HEIGHT;
            const cardHeight = (duration * 60 / SLOT_MINUTES) * SLOT_HEIGHT;

            // Создание DOM
            const card = document.createElement('div');
            card.className = `event-card ${getEventColor(lesson.subjectName || '')}`;
            card.draggable = true;
            card.dataset.lessonId = lesson.localId;

            if (lesson.localId === appState.selectedLessonId) card.classList.add('is-selected');

            const locationText = lesson.classroomNumber === 'Онлайн'
                ? 'Онлайн'
                : `Ауд. ${lesson.classroomNumber || '-'} ${lesson.auditoryLocation || '-'}`;

            card.innerHTML = `
                <span class="time">${lesson.getTimeRange()}</span>
                <span class="title">${lesson.subjectName || '-'}</span>
                <span class="location">${locationText}</span>
                <span class="teacher">${lesson.teacherName || '-'}</span>
            `;

            // События клика и Drag-n-Drop
            card.addEventListener('click', event => {
                event.stopPropagation();
                const isRepeatClick = appState.selectedLessonId === lesson.localId;
                appState.selectedLessonId = lesson.localId;
                this.render(modalManager, onScheduleChanged);
                UIManager.syncDeleteButtonState();

                if (isRepeatClick && modalManager) modalManager.open(lesson);
            });

            card.addEventListener('pointerdown', event => {
                const cardRect = card.getBoundingClientRect();
                appState.draggedLessonOffsetY = event.clientY - cardRect.top;
            });

            card.addEventListener('dragstart', event => {
                appState.draggedLessonId = lesson.localId;
                appState.selectedLessonId = lesson.localId;

                setTimeout(() => card.classList.add('is-dragging-hidden'), 0);
                CalendarRenderer.syncBufferVisibility(appState.groupId, true);

                if (!Number.isFinite(appState.draggedLessonOffsetY)) {
                    const cardRect = card.getBoundingClientRect();
                    appState.draggedLessonOffsetY = (event.clientY || event.touches?.[0].clientY) - cardRect.top;
                }
                UIManager.syncDeleteButtonState();
            });

            card.addEventListener('dragend', () => {
                appState.draggedLessonId = null;
                appState.draggedLessonOffsetY = 0;
                card.classList.remove('is-dragging-hidden');

                document.querySelectorAll('.day-cell.drag-over').forEach(cell => cell.classList.remove('drag-over'));
                if (bufferZone) bufferZone.classList.remove('drag-over');

                CalendarRenderer.syncBufferVisibility(appState.groupId, false);
            });

            // Позиционирование в DOM
            if (lesson.inBuffer) {
                card.classList.add('in-buffer');
                if (bufferZone) {
                    bufferZone.appendChild(card);
                    itemsInBuffer++;
                }
            } else {
                const dayIdx = dayToIndex[lesson.dayOfWeek];
                const targetCell = document.querySelector(`.day-cell[data-day="${dayIdx}"][data-slot="${startSlotIndex}"]`);
                if (targetCell) {
                    card.style.top = `${topOffset}px`;
                    card.style.height = `${cardHeight}px`;
                    targetCell.appendChild(card);
                }
            }
        });

        CalendarRenderer.syncBufferVisibility(appState.groupId, !!appState.draggedLessonId);
        if (emptyPlaceholder) emptyPlaceholder.style.display = itemsInBuffer > 0 ? 'none' : 'block';

        document.querySelectorAll('.day-cell').forEach(cell => {
            cell.onclick = () => {
                appState.selectedLessonId = null;
                this.render(modalManager, onScheduleChanged);
                UIManager.syncDeleteButtonState();
            };
        });
    }
}