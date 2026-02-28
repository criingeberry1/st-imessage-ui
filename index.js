import { eventSource, event_types } from '../../../../script.js';

// Главная функция парсинга
const parseIMessageTags = (htmlText) => {
    // 1. Убиваем невидимый пробел (если нейронка его всё-таки сгенерит)
    let cleanText = htmlText.replace(/ㅤ/g, ' ');

    // 2. Ищем теги <imessage> или экранированные &lt;imessage&gt;
    const blockRegex = /(&lt;|<)imessage(&gt;|>)([\s\S]*?)(&lt;|<)\/imessage(&gt;|>)/gi;

    return cleanText.replace(blockRegex, (match, open1, open2, content) => {
        // Разбиваем контент на строки
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        let resultHtml = '<div class="ios-chat-container"><div class="ios-chat-header">iMessage</div><div class="ios-chat-messages">';

        lines.forEach(line => {
            // Ищем паттерн: Имя 'Время': Сообщение
            // Поддерживает кириллицу, латиницу, цифры и дефисы в имени
            const lineRegex = /^([A-Za-zА-Яа-яЁё0-9_\-]+)\s*'(\d{2}:\d{2})':\s*(.*)$/;
            const matchLine = line.match(lineRegex);

            if (matchLine) {
                const sender = matchLine[1];
                const time = matchLine[2];
                // Очищаем сообщение от возможных <br>, которые добавил парсер ST
                const msg = matchLine[3].replace(/<br>/g, '');
                
                // Проверяем, мы ли это
                const isMe = sender.toLowerCase() === 'me';

                resultHtml += `
                    <div class="imessage-line" data-sender="${isMe ? 'Me' : sender}">
                        ${!isMe ? `<div class="imessage-sender-name">${sender}</div>` : ''}
                        <div class="imessage-bubble">
                            ${msg}
                            <span class="imessage-time">${time}</span>
                        </div>
                    </div>
                `;
            } else {
                // Если строка не попала под формат (например, просто текст внутри тегов)
                // Отрисуем её как системное уведомление или просто текст
                const cleanLine = line.replace(/<br>/g, '');
                if (cleanLine.trim()) {
                    resultHtml += `<div class="imessage-line" style="align-items: center; opacity: 0.5; font-size: 0.8em; margin: 5px 0;">${cleanLine}</div>`;
                }
            }
        });

        resultHtml += '</div></div>';
        return resultHtml;
    });
};

// Функция перерисовки сообщений
const renderIMessages = () => {
    // Проходимся по всем отрендеренным блокам текста в чате
    $('.mes_text').each(function() {
        let currentHtml = $(this).html();
        
        // Оптимизация: парсим только если видим ключевое слово
        if (currentHtml.includes('imessage&gt;') || currentHtml.includes('imessage>')) {
            let newHtml = parseIMessageTags(currentHtml);
            
            // Заменяем HTML, только если он реально изменился
            if (currentHtml !== newHtml) {
                $(this).html(newHtml);
            }
        }
    });
};

// Подключаем скрипт к событиям SillyTavern
jQuery(async () => {
    // Вызываем парсер при загрузке чата и при любых изменениях сообщений
    eventSource.on(event_types.CHAT_CHANGED, renderIMessages);
    eventSource.on(event_types.MESSAGE_RECEIVED, renderIMessages);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, renderIMessages);
    eventSource.on(event_types.MESSAGE_SWIPED, renderIMessages);
    eventSource.on(event_types.MESSAGE_UPDATED, renderIMessages);
    
    // Единоразовый проход при старте скрипта
    setTimeout(renderIMessages, 500);
});
