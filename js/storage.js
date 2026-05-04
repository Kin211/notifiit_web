const STORAGE_KEY_PREFIX = 'week_';
const BUFFER_KEY_PREFIX = 'buffer_group_';

function generateLessonId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `lesson-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeLesson(lesson) {
    return {
        ...lesson,
        localId: lesson.localId || lesson.id || generateLessonId()
    };
}

function saveScheduleToLocal(mondayStr, lessons) {
    const key = STORAGE_KEY_PREFIX + mondayStr;
    const normalizedLessons = (lessons || []).map(normalizeLesson);
    localStorage.setItem(key, JSON.stringify(normalizedLessons));
    return normalizedLessons;
}

function getScheduleFromLocal(mondayStr) {
    const key = STORAGE_KEY_PREFIX + mondayStr;
    const data = localStorage.getItem(key);
    if (!data) {
        return null;
    }

    const normalizedLessons = JSON.parse(data).map(normalizeLesson);
    localStorage.setItem(key, JSON.stringify(normalizedLessons));
    return normalizedLessons;
}

function updateLocalLesson(mondayStr, lessonId, newData) {
    const lessons = getScheduleFromLocal(mondayStr);
    if (lessons) {
        const lessonIndex = lessons.findIndex(lesson => lesson.localId === lessonId);
        if (lessonIndex === -1) {
            return null;
        }

        lessons[lessonIndex] = normalizeLesson({...lessons[lessonIndex], ...newData});
        return saveScheduleToLocal(mondayStr, lessons);
    }
    return null;
}

function addLesson(mondayStr, lessonData) {
    const lessons = getScheduleFromLocal(mondayStr) || [];
    lessons.push(normalizeLesson(lessonData));
    return saveScheduleToLocal(mondayStr, lessons);
}

function deleteLesson(mondayStr, lessonId) {
    const lessons = getScheduleFromLocal(mondayStr);
    if (lessons) {
        const filteredLessons = lessons.filter(lesson => lesson.localId !== lessonId);
        return saveScheduleToLocal(mondayStr, filteredLessons);
    }
    return null;
}

// Глобальный буфер (вне недель)
function getGlobalBuffer(groupId) {
    const key = BUFFER_KEY_PREFIX + groupId;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data).map(normalizeLesson) : [];
}

function saveGlobalBuffer(groupId, bufferLessons) {
    const key = BUFFER_KEY_PREFIX + groupId;
    const normalizedLessons = (bufferLessons || []).map(normalizeLesson);
    localStorage.setItem(key, JSON.stringify(normalizedLessons));
    return normalizedLessons;
}

function addLessonToBuffer(groupId, lessonData) {
    const buffer = getGlobalBuffer(groupId);
    buffer.push(normalizeLesson({...lessonData, inBuffer: true}));
    return saveGlobalBuffer(groupId, buffer);
}

function removeLessonFromBuffer(groupId, lessonId) {
    const buffer = getGlobalBuffer(groupId);
    const filteredBuffer = buffer.filter(lesson => lesson.localId !== lessonId);
    return saveGlobalBuffer(groupId, filteredBuffer);
}

export {
    saveScheduleToLocal, addLesson, deleteLesson, getScheduleFromLocal, updateLocalLesson,
    getGlobalBuffer, saveGlobalBuffer, addLessonToBuffer, removeLessonFromBuffer
};
