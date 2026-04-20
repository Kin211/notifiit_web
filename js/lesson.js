export class Lesson {
    constructor(data) {
        this.localId = data.localId || data.id || null;
        this.date = data.date;
        this.dayOfWeek = data.dayOfWeek;
        this.pairNumber = data.pairNumber;
        this.startTime = data.startTime;
        this.endTime = data.endTime;
        this.subjectName = data.subjectName;
        this.teacherName = data.teacherName;
        this.classroomNumber = data.classroomNumber;
        this.auditoryLocation = data.auditoryLocation || null;
        this.evenness = data.evenness;
    }

    static engDayToRus = {
        Monday: 'Понедельник',
        Tuesday: 'Вторник',
        Wednesday: 'Среда',
        Thursday: 'Четверг',
        Friday: 'Пятница',
        Saturday: 'Суббота',
        Sunday: 'Воскресенье'
    };

    getTimeRange() {
        return `${this.startTime} – ${this.endTime}`;
    }

    getRussianDay() {
        return Lesson.engDayToRus[this.dayOfWeek] || this.dayOfWeek;
    }

    // пока так, не знаю понадобится ли
    toString() {
        return `${this.getTimeRange()}\n${this.subjectName} - ${this.teacherName}`;
    }
}
