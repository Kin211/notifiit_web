const REEL_UPDATE_INTERVAL_MS = 60;

let clickCount = 0;
const bell = document.getElementById('bellIcon');
const toastContainer = document.getElementById('toastContainer');
const slotMusic = document.getElementById('slotMusic');
const wowSound = new Audio('assets/anime-wow.mp3');
slotMusic.volume = 0.1;
wowSound.volume = 0.5;


const firstClickPhrases = [
    '🔔 Уведомлений нет, но держи печеньку 🍪',
    '🔔 Звонок принят! А у тебя всё сделано в проекте?',
    '🔔 Динь-дон! Твоя совесть звонит',
    '🔔 А ты знал, что ФИИТ расшифровывается как "Факультет Инфоцыган И Технарей"?',
    '🔔 Я просто кнопка звонка, тут точно ничего нет',
];

const secondClickPhrases = [
    '📢 Вторая попытка... Ты ищешь домашку? Её никто не выкладывал.',
    '📢 Если нажмёшь ещё раз, случится магия',
    '📢 Не отвлекайся, лучше поправь баги в index.html',
    '📢 Слушай, может, хватит? Иди поучи тервер...',
    '📢 Жми ещё раз и готовь свои уши',
];

const jackpotPhrases = [
    '🎉 ДЖЕКПОТ! Бесконечная стипендия',
    '💰 Ты сорвал куш! Теперь ты должен мне пиццу',
    '🏆 ДЖЕКПОТ! Можешь идти домой, зачёт автоматом',
    '🎰 Ты сорвал куш! Ты выиграл клуб 2.71 по матстату',
    '🤯 Три семёрки? А теперь посчитай вероятность этого...',
];

const winTriplePhrases = [
    '🏆 ТРИ {symbol}! Ты сегодня – король CSS!',
    '🍀 Поздравляю! Три {symbol} – проект будет сдан на отлично',
    '🎉 Ура! Три {symbol}! Препод в шоке, ты свободен',
    '🌟 Три {symbol}! Пятиминутка будет написана лучше всех',
    '😍 Три {symbol}! Но лучше бы клуб 3 дали',
];

const twoSamePhrases = [
    '🤞 Почти! Два одинаковых – автоматом зачёт?',
    '🍀 Так близко! Ещё одна попытка – и повезёт, да?..',
    '🎯 Два совпали... Может, третий подтянется потом?',
    '😡 Два? Да даже ЧатГПТ работает лучше этих слотов',
];

const losePhrases = [
    '😭 Не повезло... Попробуй ещё!',
    '🥲 Фортуна не на твоей стороне. Но ты всё равно красавчик',
    '🎲 Мимо. Зато теперь знаешь, что слотики – зло, а додепа нет',
    '😞 Тебе точно повезёт в следующем семестре...',
    '🤔 Отвергнем гипотезу H₀ о твоей удачливости...'
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

const symbols = ['🍒', '🍺', '🐗', '7️⃣', '🤖', '⭐'];

function openSlotMachine() {
    slotModal.style.display = 'flex';
    slotMessage.textContent = 'Нажми на кнопку!';

    slotMusic.currentTime = 0;
    slotMusic.play().catch(e => console.warn('Музыка не заиграла:', e));
}

function closeSlotModal() {
    slotModal.style.display = 'none';
    slotMusic.pause();
}

closeSlot.onclick = closeSlotModal;
window.onclick = (e) => {
    if (e.target === slotModal) {
        closeSlotModal();
    }
};

function spinReelWithAnimation(reelElement, duration = 800, delay = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            reelElement.classList.add('spinning');
            let interval = setInterval(() => {
                reelElement.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            }, REEL_UPDATE_INTERVAL_MS);
            setTimeout(() => {
                clearInterval(interval);
                const finalSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                reelElement.textContent = finalSymbol;
                reelElement.classList.remove('spinning');
                resolve(finalSymbol);
            }, duration);
        }, delay);
    });
}

spinBtn.onclick = async () => {
    spinBtn.disabled = true;
    spinBtn.textContent = 'КРУТИТСЯ...';
    slotMessage.textContent = '🎲 🎲 🎲';

    const delay1 = 0;
    const delay2 = Math.random() * 20 + 10;
    const delay3 = Math.random() * 25 + 25;

    startTickSound();

    const results = await Promise.all([
        spinReelWithAnimation(reel1, 800, delay1),
        spinReelWithAnimation(reel2, 800, delay2),
        spinReelWithAnimation(reel3, 800, delay3)
    ]);

    stopTickSound();

    const [s1, s2, s3] = results;
    let message = '';
    if (s1 === s2 && s2 === s3) {
        if (s1 === '7️⃣') {
            message = jackpotPhrases[Math.floor(Math.random() * jackpotPhrases.length)];
        } else {
            const phraseTemplate = winTriplePhrases[Math.floor(Math.random() * winTriplePhrases.length)];
            message = phraseTemplate.replace('{symbol}', s1);
        }

        createStarsEffect();
        applyGlowEffect();
        wowSound.currentTime = 0;
        await wowSound.play();
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

function createStarsEffect() {
    const effectContainer = document.createElement('div');
    effectContainer.className = 'stars-effect';
    document.body.appendChild(effectContainer);

    const modal = document.querySelector('.slot-modal');
    if (!modal) {
        effectContainer.remove();
        return;
    }
    const modalRect = modal.getBoundingClientRect();
    const centerX = modalRect.left + modalRect.width / 2;
    const centerY = modalRect.top + modalRect.height / 2;


    const starsCount = 50;
    const symbols = ['⭐', '🌟', '✨'];

    for (let i = 0; i < starsCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        star.style.left = `${centerX - 15}px`;
        star.style.top = `${centerY - 15}px`;

        const angle = Math.random() * Math.PI * 2;
        const distance = 250 + Math.random() * 150;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        star.style.setProperty('--dx', `${dx}px`);
        star.style.setProperty('--dy', `${dy}px`);

        star.style.animationDelay = `${Math.random() * 0.2}s`;
        effectContainer.appendChild(star);
    }

    setTimeout(() => {
        effectContainer.remove();
    }, 2000);
}

function applyGlowEffect() {
    const reels = [reel1, reel2, reel3];
    for (const reel of reels) {
        reel.classList.remove('reel-glow');
        void reel.offsetWidth;
        reel.classList.add('reel-glow');
        setTimeout(() => {
            reel.classList.remove('reel-glow');
        }, 1500);
    }
}

let tickInterval = null;

function startTickSound() {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(() => {
        const tick = new Audio('assets/reel_click.mp3');
        tick.volume = 0.7;
        tick.play().catch(e => console.error('Sound error', e));
    }, REEL_UPDATE_INTERVAL_MS);
}

function stopTickSound() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}