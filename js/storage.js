const STORAGE_KEY_PREFIX = 'week_';

function saveScheduleToLocal(mondayStr, lessons) {
    const key = STORAGE_KEY_PREFIX + mondayStr;
    localStorage.setItem(key, JSON.stringify(lessons));
}

function getScheduleFromLocal(mondayStr) {
    const key = STORAGE_KEY_PREFIX + mondayStr;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function updateLocalLesson(mondayStr, lessonIndex, newData) {
    const lessons = getScheduleFromLocal(mondayStr);
    if (lessons) {
        // Обновляем данные по индексу или ID
        lessons[lessonIndex] = { ...lessons[lessonIndex], ...newData };
        saveScheduleToLocal(mondayStr, lessons);
        return lessons;
    }
    return null;
}

function addLesson(mondayStr, lessonData) {
    let lessons = getScheduleFromLocal(mondayStr) || [];
    lessons.push(lessonData);
    saveScheduleToLocal(mondayStr, lessons);
}

function deleteLesson(mondayStr, index) {
    let lessons = getScheduleFromLocal(mondayStr);
    if (lessons && lessons[index]) {
        lessons.splice(index, 1);
        saveScheduleToLocal(mondayStr, lessons);
    }
}

export {saveScheduleToLocal, addLesson, deleteLesson, getScheduleFromLocal, updateLocalLesson};