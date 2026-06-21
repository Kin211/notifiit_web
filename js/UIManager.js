import { appState } from './stateManager.js';
import { deleteLesson, updateLocalLesson, addLesson } from './storage.js';
import {
    timeToDecimal, getDateForDayIndex, indexToEnglishDay,
    formatDateTime, recalculatePairNumbers
} from './calendarHelpers.js';

export class UIManager {
    static setupNavigation(onDateChange) {
        document.getElementById('prevWeekBtn').addEventListener('click', () => {
            const prevWeek = new Date(appState.mondayDate || new Date());
            prevWeek.setDate(prevWeek.getDate() - 7);
            onDateChange(prevWeek);
        });

        document.getElementById('nextWeekBtn').addEventListener('click', () => {
            const nextWeek = new Date(appState.mondayDate || new Date());
            nextWeek.setDate(nextWeek.getDate() + 7);
            onDateChange(nextWeek);
        });

        document.getElementById('todayBtn').addEventListener('click', () => {
            onDateChange(new Date());
        });

        window.addEventListener('groupChanged', (event) => {
            const { groupId } = event.detail;
            appState.setGroupId(groupId);
            onDateChange(appState.mondayDate || new Date(), {forceRefresh: true});
        });
    }

    static setupLessonActions(formManager, onScheduleChanged) {
        const addButton = document.getElementById('addEventBtn');
        const deleteButton = document.getElementById('deleteEventBtn');
        const modal = document.getElementById('lessonModal');
        const form = document.getElementById('lessonForm');

        const confirmModal = document.getElementById('confirmModal');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const confirmMessage = document.getElementById('confirmMessage');
        let pendingDeleteLessonId = null;

        const closeConfirmModal = () => {
            if (confirmModal) confirmModal.classList.add('hidden');
            pendingDeleteLessonId = null;
        };

        confirmModal.addEventListener('click', (event) => {
            if (event.target.dataset.closeModal === 'true') {
                closeConfirmModal();
            }
        });

        confirmDeleteBtn.addEventListener('click', () => {
            if (pendingDeleteLessonId === null) {
                return;
            }

            appState.lessons = recalculatePairNumbers(
                deleteLesson(appState.weekStorageKey, pendingDeleteLessonId) || []
            );
            appState.selectedLessonId = null;
            onScheduleChanged();
            UIManager.syncDeleteButtonState();

            closeConfirmModal();
        });

        addButton.addEventListener('click', () => {
            formManager.openForCreate();
        });

        deleteButton.addEventListener('click', () => {
            if (!appState.selectedLessonId) {
                alert('Сначала выберите занятие для удаления.');
                return;
            }

            const selectedLesson = appState.lessons.find(lesson => lesson.localId === appState.selectedLessonId);
            if (!selectedLesson) return;

            pendingDeleteLessonId = appState.selectedLessonId;
            confirmMessage.textContent = `Вы уверены, что хотите удалить занятие "${selectedLesson.subjectName}"?`;
            confirmModal.classList.remove('hidden');
        });

        modal.addEventListener('click', event => {
            if (event.target.dataset.closeModal === 'true') {
                formManager.close();
            }
        });

        form.addEventListener('submit', event => {
            event.preventDefault();

            const formData = formManager.getFormData();
            const dayIndex = Number(formData.get('dayIndex'));
            const startTime = formData.get('startTime');
            const endTime = formData.get('endTime');

            if (!startTime || !endTime || timeToDecimal(endTime) <= timeToDecimal(startTime)) {
                alert('Время окончания должно быть позже времени начала.');
                return;
            }

            const lessonDate = getDateForDayIndex(appState.mondayDate, dayIndex);
            const newLesson = {
                date: formatDateTime(lessonDate),
                dayOfWeek: indexToEnglishDay[dayIndex],
                pairNumber: 0,
                startTime,
                endTime,
                subjectName: String(formData.get('subjectName') || '').trim(),
                teacherName: String(formData.get('teacherName') || '').trim() || null,
                classroomNumber: String(formData.get('classroomNumber') || '').trim() || null,
                auditoryLocation: String(formData.get('auditoryLocation') || '').trim() || null,
                evenness: 'Always'
            };

            const editId = formManager.getEditId();

            if (editId) {
                appState.lessons = updateLocalLesson(appState.weekStorageKey, editId, newLesson) || appState.lessons;
            } else {
                newLesson.pairNumber = 0;
                appState.lessons = addLesson(appState.weekStorageKey, newLesson) || [];
            }

            appState.lessons = recalculatePairNumbers(appState.lessons);
            onScheduleChanged();
            formManager.close();
        });
    }

    static syncDeleteButtonState() {
        const deleteButton = document.getElementById('deleteEventBtn');
        if (deleteButton) {
            deleteButton.classList.toggle('is-active', Boolean(appState.selectedLessonId));
        }
    }
}