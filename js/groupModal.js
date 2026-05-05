import { loadGroupId, saveGroupId } from "./storage.js";

let currentGroup = loadGroupId();

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('groupModal');
    const openModalButton = document.getElementById('profileBtn');
    const closeButton = document.getElementById('modalCloseBtn');
    const okButton = document.getElementById('modalOkBtn');
    const groupSelect = document.getElementById('groupSelect');

    openModalButton.onclick = () => {
        if (currentGroup) {
            const targetValue = `${currentGroup}`;
            if ([...groupSelect.options].some(opt => opt.value === targetValue)) {
                groupSelect.value = targetValue;
            } else {
                groupSelect.value = '';
            }
        } else {
            groupSelect.value = '';
        }

        modal.style.display = 'flex';
    };

    closeButton.onclick = () => {
        modal.style.display = 'none';
    };

    // Закрыть при клике вне окна
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    okButton.onclick = () => {
        const selectedValue = groupSelect.value;
        if (!selectedValue) {
            alert('Пожалуйста, выберите группу');
            return;
        }

        const newGroup = Number(selectedValue);
        if (newGroup === currentGroup) {
            modal.style.display = 'none';
            return;
        }

        currentGroup = newGroup;
        const groupChangeEvent = new CustomEvent('groupChanged', {
            detail: { groupId: currentGroup }
        });
        saveGroupId(currentGroup);
        window.dispatchEvent(groupChangeEvent);
        modal.style.display = 'none';
    };
});