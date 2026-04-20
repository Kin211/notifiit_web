export class ModalManager {
    constructor() {
        this.dialog = document.getElementById('lesson-modal');
        this.content = this.dialog.querySelector('.modal-content');
        this.initTemplate();
        this.initListeners();
    }

    initTemplate() {
        this.content.innerHTML = `
            <button class="btn-close-icon" aria-label="Закрыть">&times;</button>
            
            <div class="modal-header">
                <h3 class="modal-title"></h3>
            </div>
            
            <div class="modal-body">
                <div class="info-row">
                    <span class="label" id="time-label">🕒 Время:</span>
                    <span class="value lesson-time"></span>
                </div>
                <div class="info-row">
                    <span class="label">👤 Преподаватель:</span>
                    <span class="value lesson-teacher"></span>
                </div>
                <div class="info-row">
                    <span class="label">🚪 Кабинет:</span>
                    <span class="value lesson-room"></span>
                </div>
                <div class="info-row" id="building-row">
                    <span class="label">🏢 Корпус:</span>
                    <span class="value lesson-building"></span>
                </div>
            </div>
        `;

        this.titleNode = this.content.querySelector('.modal-title');
        
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

        this.content.querySelector('.btn-close-icon').addEventListener('click', () => {
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
