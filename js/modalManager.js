export class ModalManager {
    constructor() {
        this.dialog = document.getElementById('lesson-modal');
        this.content = this.dialog.querySelector('.modal-content');
        this.initTemplate();
        this.initListeners();
    }

    initTemplate() {
        this.content.innerHTML = `
            <button class="lesson-dialog-close" aria-label="Закрыть">&times;</button>
            
            <div class="lesson-dialog-header">
                <h3 class="lesson-dialog-title"></h3>
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
    }

    initListeners() {
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) this.close();
        });

        this.content.querySelector('.lesson-dialog-close').addEventListener('click', () => {
            this.close();
        });
    }

    open(lesson) {
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
    }
}
