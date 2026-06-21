import { appState } from './stateManager.js';
import {
    getDropStartDecimal, timeToDecimal, decimalToTime,
    getDateForDayIndex, indexToEnglishDay, formatDateTime, recalculatePairNumbers
} from './calendarHelpers.js';
import {
    getGlobalBuffer, removeLessonFromBuffer, addLesson,
    updateLocalLesson, addLessonToBuffer, deleteLesson
} from './storage.js';

export class DragAndDropManager {
    static setup(onScheduleChanged) {
        this.setupCellsDnD(onScheduleChanged);
        this.setupBufferDnD(onScheduleChanged);
    }

    static setupCellsDnD(onScheduleChanged) {
        document.querySelectorAll('.day-cell').forEach(cell => {
            cell.addEventListener('dragover', event => {
                event.preventDefault();
                cell.classList.add('drag-over');
            });

            cell.addEventListener('dragleave', () => {
                cell.classList.remove('drag-over');
            });

            cell.addEventListener('drop', event => {
                event.preventDefault();
                cell.classList.remove('drag-over');
                this.moveLessonToCell(appState.draggedLessonId, cell, event, onScheduleChanged);
            });
        });
    }

    static setupBufferDnD(onScheduleChanged) {
        const bufferZone = document.getElementById('bufferDropZone');
        if (!bufferZone) return;

        bufferZone.addEventListener('dragover', event => {
            event.preventDefault();
            bufferZone.classList.add('drag-over');
        });

        bufferZone.addEventListener('dragleave', () => {
            bufferZone.classList.remove('drag-over');
        });

        bufferZone.addEventListener('drop', event => {
            event.preventDefault();
            bufferZone.classList.remove('drag-over');
            this.moveLessonToBuffer(appState.draggedLessonId, onScheduleChanged);
        });
    }

    static moveLessonToCell(lessonId, cell, event, onScheduleChanged) {
        if (!lessonId) return;

        const dayIndex = Number(cell.dataset.day);
        const targetStartDecimal = getDropStartDecimal(cell, event, appState.draggedLessonOffsetY);

        let lesson = appState.lessons.find(item => item.localId === lessonId);
        let wasInBuffer = false;

        if (!lesson) {
            const buffer = getGlobalBuffer(appState.groupId);
            lesson = buffer.find(item => item.localId === lessonId);
            if (lesson) wasInBuffer = true;
        }

        if (!lesson) return;

        const duration = timeToDecimal(lesson.endTime) - timeToDecimal(lesson.startTime);
        const newStartTime = decimalToTime(targetStartDecimal);
        const newEndTime = decimalToTime(targetStartDecimal + duration);
        const newDate = getDateForDayIndex(appState.mondayDate, dayIndex);

        if (wasInBuffer) {
            removeLessonFromBuffer(appState.groupId, lessonId);
            lesson.date = formatDateTime(newDate);
            lesson.dayOfWeek = indexToEnglishDay[dayIndex];
            lesson.startTime = newStartTime;
            lesson.endTime = newEndTime;
            lesson.inBuffer = false;
            appState.lessons = addLesson(appState.weekStorageKey, lesson) || [];
        } else {
            appState.lessons = updateLocalLesson(appState.weekStorageKey, lessonId, {
                date: formatDateTime(newDate),
                dayOfWeek: indexToEnglishDay[dayIndex],
                startTime: newStartTime,
                endTime: newEndTime,
                inBuffer: false,
            }) || appState.lessons;
        }

        appState.lessons = recalculatePairNumbers(appState.lessons);
        appState.selectedLessonId = lessonId;
        onScheduleChanged();
    }

    static moveLessonToBuffer(lessonId, onScheduleChanged) {
        if (!lessonId) return;

        const lessonIndex = appState.lessons.findIndex(item => item.localId === lessonId);
        if (lessonIndex !== -1) {
            const lessonToMove = appState.lessons[lessonIndex];
            addLessonToBuffer(appState.groupId, lessonToMove);
            appState.lessons = deleteLesson(appState.weekStorageKey, lessonId) || [];
            appState.selectedLessonId = lessonId;
            onScheduleChanged();
        }
    }
}