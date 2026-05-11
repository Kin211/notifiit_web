export class LessonFormManager {
    constructor() {
        this.modal = document.getElementById('lessonModal');
        this.form = document.getElementById('lessonForm');
        this.title = this.modal.querySelector('.modal-header h3');
    }

    openForCreate() {
        this.form.reset();
        delete this.form.dataset.editId;
        this.title.textContent = 'Новое занятие';
        this.modal.classList.remove('hidden');
    }

    openForEdit(lesson, dayToIndexMap) {
        this.form.reset();
        this.form.dataset.editId = lesson.localId || lesson.id;
        this.title.textContent = 'Редактировать занятие';
        
        const elements = this.form.elements;
        elements['dayIndex'].value = dayToIndexMap[lesson.dayOfWeek] || 0;
        elements['startTime'].value = lesson.startTime || '';
        elements['endTime'].value = lesson.endTime || '';
        elements['subjectName'].value = lesson.subjectName || '';
        elements['teacherName'].value = lesson.teacherName || '';
        elements['classroomNumber'].value = lesson.classroomNumber || '';
        elements['auditoryLocation'].value = lesson.auditoryLocation || '';
        
        this.modal.classList.remove('hidden');
    }

    close() {
        this.modal.classList.add('hidden');
    }

    getEditId() {
        return this.form.dataset.editId;
    }

    getFormData() {
        return new FormData(this.form);
    }
}