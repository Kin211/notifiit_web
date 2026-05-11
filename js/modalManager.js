export class ModalManager {
    constructor(onEditCallback) {
        this.dialog = document.getElementById('lesson-modal');
        this.content = this.dialog.querySelector('.modal-content');
        this.onEditCallback = onEditCallback;
        this.currentLesson = null;
        this.initTemplate();
        this.initListeners();
    }

    initTemplate() {
        this.content.innerHTML = `
            <button class="lesson-dialog-close" aria-label="Закрыть">&times;</button>
            
            <div class="lesson-dialog-header">
                <h3 class="lesson-dialog-title"></h3>
                <button class="lesson-dialog-edit" aria-label="Редактировать">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        <path d="m15 5 4 4"/>
                    </svg>
                </button>
            </div>
            
            <div class="lesson-dialog-body">
                <div class="lesson-dialog-row">
                    <span class="lesson-dialog-label" id="time-label">🕒 Время:</span>
                    <span class="lesson-dialog-value lesson-time"></span>
                </div>
                <div class="lesson-dialog-row">
                    <span class="lesson-dialog-label">👤 Преподаватель:</span>
                    <span class="lesson-dialog-value lesson-teacher"></span>
                </div>
                <div class="lesson-dialog-row">
                    <span class="lesson-dialog-label">🚪 Кабинет:</span>
                    <span class="lesson-dialog-value lesson-room"></span>
                </div>
                <div class="lesson-dialog-row" id="building-row">
                    <span class="lesson-dialog-label">🏢 Корпус:</span>
                    <span class="lesson-dialog-value lesson-building"></span>
                </div>
            </div>
        `;

        this.titleNode = this.content.querySelector('.lesson-dialog-title');
        this.timeLabelNode = this.content.querySelector('#time-label');
        this.timeNode = this.content.querySelector('.lesson-time');
        this.teacherNode = this.content.querySelector('.lesson-teacher');
        this.roomNode = this.content.querySelector('.lesson-room');
        this.buildingNode = this.content.querySelector('.lesson-building');
        this.buildingRow = this.content.querySelector('#building-row');
        this.editBtn = this.content.querySelector('.lesson-dialog-edit');
        this.closeBtn = this.content.querySelector('.lesson-dialog-close');
    }

    initListeners() {
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) this.close();
        });

        this.closeBtn.addEventListener('click', () => {
            this.close();
        });

        this.editBtn.addEventListener('click', () => {
            if (this.onEditCallback && this.currentLesson) {
                this.onEditCallback(this.currentLesson);
                this.close();
            }
        });
    }

    open(lesson) {
        this.currentLesson = lesson;
        this.titleNode.textContent = lesson.subjectName || 'Без названия';
        
        if (lesson.pairNumber) {
            this.timeLabelNode.textContent = `🕒 ${lesson.pairNumber} пара:`;
        } else {
            this.timeLabelNode.textContent = `🕒 Время:`;
        }
        
        this.timeNode.textContent = lesson.getTimeRange ? lesson.getTimeRange() : `${lesson.startTime} - ${lesson.endTime}`;
        this.teacherNode.textContent = lesson.teacherName || '—';
        this.roomNode.textContent = lesson.classroomNumber || '—';
        
        if (lesson.classroomNumber === "Онлайн" || !lesson.auditoryLocation) {
            this.buildingRow.style.display = 'none';
        } else {
            this.buildingNode.textContent = lesson.auditoryLocation;
            this.buildingRow.style.display = 'flex';
        }

        this.dialog.showModal();
    }

    close() {
        this.dialog.close();
        this.currentLesson = null;
    }
}