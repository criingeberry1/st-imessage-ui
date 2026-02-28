import { eventSource, event_types } from '../../../../script.js';

const injectCSS = () => {
    if ($('#imessage-style').length === 0) {
        const style = `
        <style id="imessage-style">
            .ios-chat-container { background: #1c1c1e; border-radius: 20px; padding: 15px; margin: 15px 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: white; max-width: 450px; border: 1px solid #333; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
            .ios-chat-header { text-align: center; font-size: 0.9em; color: #8e8e93; margin-bottom: 15px; font-weight: 600; }
            .ios-chat-messages { display: flex; flex-direction: column; gap: 8px; }
            .imessage-line { display: flex; flex-direction: column; width: 100%; margin-bottom: 4px; }
            .imessage-sender-name { font-size: 0.7em; color: #8e8e93; margin: 0 12px 4px 12px; display: none; }
            .imessage-bubble { padding: 10px 14px; max-width: 85%; word-wrap: break-word; font-size: 0.95em; line-height: 1.3; }
            .imessage-line[data-sender="Me"] { align-items: flex-end; }
            .imessage-line[data-sender="Me"] .imessage-bubble { background: #0a84ff; color: white; border-radius: 20px 20px 5px 20px; }
            .imessage-line:not([data-sender="Me"]) { align-items: flex-start; }
            .imessage-line:not([data-sender="Me"]) .imessage-bubble { background: #2c2c2e; color: white; border-radius: 20px 20px 20px 5px; }
            .imessage-line:not([data-sender="Me"]) .imessage-sender-name { display: block; }
            .imessage-time { display: inline-block; font-size: 0.7em; opacity: 0.6; margin-left: 8px; float: right; margin-top: 5px; }
        </style>`;
        $('head').append(style);
    }
};

const parseIMessageTags = (htmlText) => {
    let cleanText = htmlText.replace(/ㅤ/g, ' ');

    // Ищем ФИГУРНЫЕ скобки {imessage} ... {/imessage}
    const blockRegex = /\{\s*imessage\s*\}([\s\S]*?)\{\s*\/imessage\s*\}/gi;

    return cleanText.replace(blockRegex, (match, content) => {
        console.warn("[iMessage UI] НАШЕЛ БЛОК с фигурными скобками! Рендерим...");
        
        let cleanContent = content.replace(/<\/?p>/gi, '').trim();
        const lines = cleanContent.split(/(?:<br\s*\/?>|\n)/i).filter(line => line.trim() !== '');
        
        let resultHtml = '<div class="ios-chat-container"><div class="ios-chat-header">iMessage</div><div class="ios-chat-messages">';

        lines.forEach(line => {
            let pureText = line.replace(/<[^>]*>/g, '').trim();
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
    console.warn("🚀🚀🚀 IMESSAGE EXTENSION (ФИГУРНЫЕ СКОБКИ) РАБОТАЕТ! 🚀🚀🚀");
    
    eventSource.on(event_types.CHAT_CHANGED, renderIMessages);
    eventSource.on(event_types.MESSAGE_RECEIVED, renderIMessages);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, renderIMessages);
    eventSource.on(event_types.MESSAGE_SWIPED, renderIMessages);
    eventSource.on(event_types.MESSAGE_UPDATED, renderIMessages);
    
    setTimeout(renderIMessages, 1000);
});
