import { eventSource, event_types } from '../../../../script.js';

const injectCSS = () => {
    if ($('#imessage-style').length === 0) {
        const style = `
        <style id="imessage-style">
            .ios-chat-container { background: #1c1c1e; border-radius: 20px; padding: 15px; margin: 15px 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: white; max-width: 450px; border: 1px solid #333; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
            .ios-chat-header { text-align: center; font-size: 0.9em; color: #8e8e93; margin-bottom: 15px; font-weight: 600; }
            .ios-chat-messages { display: flex; flex-direction: column; gap: 8px; }
            .imessage-line { display: flex; flex-direction: column; width: 100%; margin-bottom: 2px; }
            .imessage-line.consecutive { margin-top: -4px; }
            .imessage-sender-name { font-size: 0.75em; color: #8e8e93; margin: 0 12px 4px 12px; display: none; }
            
            /* Обертка для пузыря и иконки ошибки */
            .imessage-bubble-wrapper { display: flex; align-items: center; gap: 6px; }
            .imessage-line[data-sender="Me"] .imessage-bubble-wrapper { justify-content: flex-end; }
            
            .imessage-bubble { padding: 10px 14px; max-width: 85%; word-wrap: break-word; font-size: 0.95em; line-height: 1.3; }
            
            /* === ИСХОДЯЩИЕ (Me) === */
            .imessage-line[data-sender="Me"] { align-items: flex-end; }
            .imessage-line[data-sender="Me"] .imessage-bubble { background: #0a84ff; color: white; border-radius: 20px 20px 5px 20px; }
            .imessage-line[data-sender="Me"].no-tail .imessage-bubble { border-radius: 20px; }
            
            /* === ВХОДЯЩИЕ (Остальные) === */
            .imessage-line:not([data-sender="Me"]) { align-items: flex-start; }
            .imessage-line:not([data-sender="Me"]) .imessage-bubble { background: #2c2c2e; color: white; border-radius: 20px 20px 20px 5px; }
            .imessage-line:not([data-sender="Me"]) .imessage-sender-name { display: block; }
            .imessage-line:not([data-sender="Me"]).no-tail .imessage-bubble { border-radius: 20px; }
            
            .imessage-time { display: inline-block; font-size: 0.7em; opacity: 0.6; margin-left: 8px; float: right; margin-top: 5px; }
            
            /* Стили ошибки */
            .imessage-error-icon { color: #ff3b30; border: 1.5px solid #ff3b30; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0; box-sizing: border-box; }
            .imessage-error-text { color: #ff3b30; font-size: 0.7em; margin-top: 2px; margin-right: 24px; font-weight: 500; }
        </style>`;
        $('head').append(style);
    }
};

const parseIMessageTags = (htmlText) => {
    let cleanText = htmlText.replace(/ㅤ/g, ' ');
    const blockRegex = /\{\s*imessage\s*\}([\s\S]*?)\{\s*\/imessage\s*\}/gi;

    return cleanText.replace(blockRegex, (match, content) => {
        let cleanContent = content.replace(/<\/?p>/gi, '').trim();
        const lines = cleanContent.split(/(?:<br\s*\/?>|\n)/i).filter(line => line.trim() !== '');
        
        let parsedMessages = [];
        lines.forEach(line => {
            let pureText = line.replace(/<[^>]*>/g, '').trim();
            // Регулярка для отлова восклицательного знака перед двоеточием
            const lineRegex = /([A-Za-zА-Яа-яЁё0-9_\-]+)\s*'(\d{2}:\d{2})'\s*(!)?\s*:\s*(.*)/i;
            const matchLine = pureText.match(lineRegex);

            if (matchLine) {
                parsedMessages.push({
                    type: 'msg',
                    sender: matchLine[1],
                    time: matchLine[2],
                    isUndelivered: matchLine[3] === '!',
                    msg: matchLine[4]
                });
            } else if (pureText) {
                parsedMessages.push({ type: 'system', text: pureText });
            }
        });

        let resultHtml = '<div class="ios-chat-container"><div class="ios-chat-header">iMessage</div><div class="ios-chat-messages">';

        for (let i = 0; i < parsedMessages.length; i++) {
            const current = parsedMessages[i];
            
            if (current.type === 'msg') {
                const isMe = current.sender.toLowerCase() === 'me';
                const isUndelivered = isMe && current.isUndelivered;
                
                const prev = (i > 0 && parsedMessages[i-1].type === 'msg') ? parsedMessages[i-1] : null;
                const next = (i < parsedMessages.length - 1 && parsedMessages[i+1].type === 'msg') ? parsedMessages[i+1] : null;
                
                const isConsecutivePrev = prev && prev.sender === current.sender;
                const isConsecutiveNext = next && next.sender === current.sender;
                
                let classes = ['imessage-line'];
                if (isConsecutivePrev) classes.push('consecutive');
                if (isConsecutiveNext) classes.push('no-tail');
                if (isUndelivered) classes.push('undelivered');

                resultHtml += `
                    <div class="${classes.join(' ')}" data-sender="${isMe ? 'Me' : current.sender}">
                        ${!isMe && !isConsecutivePrev ? `<div class="imessage-sender-name">${current.sender}</div>` : ''}
                        
                        <div class="imessage-bubble-wrapper">
                            <div class="imessage-bubble">
                                ${current.msg}
                                <span class="imessage-time">${current.time}</span>
                            </div>
                            ${isUndelivered ? '<div class="imessage-error-icon">!</div>' : ''}
                        </div>
                        ${isUndelivered ? '<div class="imessage-error-text">Не доставлено</div>' : ''}
                        
                    </div>
                `;
            } else {
                resultHtml += `<div class="imessage-line" style="align-items: center; opacity: 0.5; font-size: 0.8em; margin: 5px 0;">${current.text}</div>`;
            }
        }

        resultHtml += '</div></div>';
        return resultHtml;
    });
};

const renderIMessages = () => {
    $('.mes_text').each(function() {
        let currentHtml = $(this).html();
        if (currentHtml.toLowerCase().includes('imessage')) {
            let newHtml = parseIMessageTags(currentHtml);
            if (currentHtml !== newHtml) {
                $(this).html(newHtml);
            }
        }
    });
};

jQuery(async () => {
    injectCSS();
    console.warn("🚀🚀🚀 IMESSAGE EXTENSION (СИНИЕ ОШИБКИ) РАБОТАЕТ! 🚀🚀🚀");
    
    eventSource.on(event_types.CHAT_CHANGED, renderIMessages);
    eventSource.on(event_types.MESSAGE_RECEIVED, renderIMessages);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, renderIMessages);
    eventSource.on(event_types.MESSAGE_SWIPED, renderIMessages);
    eventSource.on(event_types.MESSAGE_UPDATED, renderIMessages);
    
    setTimeout(renderIMessages, 1000);
});
