let clickCount = 0;
const bell = document.getElementById('bellIcon');
const toastContainer = document.getElementById('toastContainer');

const firstClickPhrases = [
    '🔔 Уведомлений нет, но держи печеньку 🍪',
    '🔔 Звонок принят! А у тебя всё сделано в проекте?',
    '🔔 Динь-дон! Твоя совесть звонит',
    '🔔 А ты знал, что ФИИТ расшифровывается как "Факультет Инфоцыган И Технарей"?'
];

const secondClickPhrases = [
    '📢 Вторая попытка... Ты ищешь домашку? Её никто не выкладывал.',
    '📢 Если нажмёшь ещё раз, случится магия',
    '📢 Не отвлекайся, лучше поправь баги в index.html',
    '📢 Слушай, может, хватит? Иди поучи тервер...'
];

const jackpotPhrases = [
    '🎉 ДЖЕКПОТ! Бесконечная стипендия',
    '💰 Ты сорвал куш! Теперь ты должен мне пиццу',
    '🏆 ДЖЕКПОТ! Можешь идти домой, зачёт автоматом',
    '🎰 Ты сорвал куш! Ты выиграл клуб 2.71 по матстату'
];

const winTriplePhrases = [
    '🏆 ТРИ {symbol}! Ты сегодня — король CSS!',
    '🍀 Поздравляю! Три {symbol} — проект будет сдан на отлично',
    '🎉 Ура! Три {symbol}! Препод в шоке, ты свободен',
    '🌟 Три {symbol}! Пятиминутка будет написана лучше всех'
];

const twoSamePhrases = [
    '🤞 Почти! Два одинаковых — автоматом зачёт?',
    '🍀 Так близко! Ещё одна попытка — и повезёт, да?..',
    '🎯 Два совпали... Может, третий подтянется на пересдаче?',
    '🤔 Два — уже неплохо, в сессию так тоже бывает'
];

const losePhrases = [
    '😭 Не повезло... Попробуй ещё!',
    '🥲 Фортуна не на твоей стороне. Но ты всё равно красавчик',
    '🎲 Мимо. Зато теперь знаешь, что слотики — зло, а додепа нет',
    '😞 Тебе точно повезёт в следующем семестре...'
];

function showToast(text, duration = 2500) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
    toast.addEventListener('click', () => toast.remove());
}

const slotModal = document.getElementById('slotModal');
const closeSlot = document.querySelector('.close-slot');
const reel1 = document.getElementById('reel1');
const reel2 = document.getElementById('reel2');
const reel3 = document.getElementById('reel3');
const spinBtn = document.getElementById('spinBtn');
const slotMessage = document.getElementById('slotMessage');

const symbols = ['🍒', '🍊', '🍺', '🍉', '7️⃣', '🔔', '⭐'];

function openSlotMachine() {
    slotModal.style.display = 'flex';
    slotMessage.textContent = 'Нажми на кнопку!';
    reel1.textContent = '🍒';
    reel2.textContent = '🍒';
    reel3.textContent = '🍒';
}

function  closeSlotModal() {
    slotModal.style.display = 'none';
}

closeSlot.onclick = closeSlotModal;
window.onclick = (e) => {
    if (e.target === slotModal) {
        closeSlotModal();
    }
};

function spinReelWithAnimation(reelElement, duration = 800) {
    return new Promise((resolve) => {
        reelElement.classList.add('spinning');
        let interval = setInterval(() => {
            reelElement.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        }, 60);
        setTimeout(() => {
            clearInterval(interval);
            const finalSymbol = symbols[Math.floor(Math.random() * symbols.length)];
            reelElement.textContent = finalSymbol;
            reelElement.classList.remove('spinning');
            resolve(finalSymbol);
        }, duration);
    });
}

spinBtn.onclick = async () => {
    spinBtn.disabled = true;
    spinBtn.textContent = 'КРУТИТСЯ...';
    slotMessage.textContent = '🎲 🎲 🎲';
    const results = await Promise.all([
        spinReelWithAnimation(reel1),
        spinReelWithAnimation(reel2),
        spinReelWithAnimation(reel3)
    ]);
    const [s1, s2, s3] = results;
    let message = '';
    if (s1 === s2 && s2 === s3) {
        if (s1 === '7️⃣') {
            message = jackpotPhrases[Math.floor(Math.random() * jackpotPhrases.length)];
        } else {
            const phraseTemplate = winTriplePhrases[Math.floor(Math.random() * winTriplePhrases.length)];
            message = phraseTemplate.replace('{symbol}', s1);
        }
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        message = twoSamePhrases[Math.floor(Math.random() * twoSamePhrases.length)];
    } else {
        message = losePhrases[Math.floor(Math.random() * losePhrases.length)];
    }
    slotMessage.innerHTML = message;
    spinBtn.disabled = false;
    spinBtn.textContent = 'КРУТИТЬ';
};

bell.addEventListener('click', () => {
    clickCount++;
    if (clickCount === 1) {
        const randomPhrase = firstClickPhrases[Math.floor(Math.random() * firstClickPhrases.length)];
        showToast(randomPhrase);
    } else if (clickCount === 2) {
        const randomPhrase = secondClickPhrases[Math.floor(Math.random() * secondClickPhrases.length)];
        showToast(randomPhrase);
    } else {
        openSlotMachine();
    }
});
