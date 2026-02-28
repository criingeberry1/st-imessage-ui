console.error("!!! Я НОВЫЙ ФАЙЛ И Я РАБОТАЮ !!!");
import { eventSource, event_types } from '../../../../script.js';

const parseIMessageTags = (htmlText) => {
    // 1. Убиваем шакальные пробелы
    let cleanText = htmlText.replace(/ㅤ/g, ' ');

    // 2. Ищем блок imessage
    const blockRegex = /(&lt;|<)imessage(&gt;|>)([\s\S]*?)(&lt;|<)\/imessage(&gt;|>)/gi;

    return cleanText.replace(blockRegex, (match, open1, open2, content) => {
        // Добавляем лог в консоль, чтобы точно видеть, что скрипт поймал тег
        console.log("[iMessage UI] Нашел блок:", content);

        // 3. Вычищаем теги <p> и </p>, которые добавляет ST
        let cleanContent = content.replace(/<\/?p>/gi, '').trim();
        
        // 4. Разбиваем строки по тегу <br> или \n
        const lines = cleanContent.split(/(?:<br\s*\/?>|\n)/i).filter(line => line.trim() !== '');
        
        let resultHtml = '<div class="ios-chat-container"><div class="ios-chat-header">iMessage</div><div class="ios-chat-messages">';

        lines.forEach(line => {
            // Убираем вообще любые остаточные HTML-теги из строки перед чтением
            let pureText = line.replace(/<[^>]*>/g, '').trim();
            
            // 5. Бронебойная регулярка (ищет Имя 'Время': Текст)
            const lineRegex = /([A-Za-zА-Яа-яЁё0-9_\-]+)\s*'(\d{2}:\d{2})'\s*:\s*(.*)/i;
            const matchLine = pureText.match(lineRegex);

            if (matchLine) {
                const sender = matchLine[1];
                const time = matchLine[2];
                const msg = matchLine[3];
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
            } else if (pureText) {
                // Если формат не совпал, выводим просто как системный текст по центру
                resultHtml += `<div class="imessage-line" style="align-items: center; opacity: 0.5; font-size: 0.8em; margin: 5px 0;">${pureText}</div>`;
            }
        });

        resultHtml += '</div></div>';
        return resultHtml;
    });
};

const renderIMessages = () => {
    $('.mes_text').each(function() {
        let currentHtml = $(this).html();
        
        // Переводим в нижний регистр для проверки, чтобы не пропустить из-за капса
        if (currentHtml.toLowerCase().includes('imessage&gt;') || currentHtml.toLowerCase().includes('imessage>')) {
            let newHtml = parseIMessageTags(currentHtml);
            if (currentHtml !== newHtml) {
                $(this).html(newHtml);
            }
        }
    });
};

jQuery(async () => {
    console.log("[iMessage UI] Скрипт запущен и готов к работе!");
    
    eventSource.on(event_types.CHAT_CHANGED, renderIMessages);
    eventSource.on(event_types.MESSAGE_RECEIVED, renderIMessages);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, renderIMessages);
    eventSource.on(event_types.MESSAGE_SWIPED, renderIMessages);
    eventSource.on(event_types.MESSAGE_UPDATED, renderIMessages);
    
    // Даем ST секунду на то, чтобы отрендерить весь чат при старте
    setTimeout(renderIMessages, 1000);
});
