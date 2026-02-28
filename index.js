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
            .imessage-bubble-wrapper { display: flex; align-items: center; gap: 6px; }
            .imessage-line[data-sender="Me"] .imessage-bubble-wrapper { justify-content: flex-end; }
            .imessage-bubble { padding: 10px 14px; max-width: 85%; word-wrap: break-word; font-size: 0.95em; line-height: 1.3; position: relative; }
            
            .imessage-line[data-sender="Me"] .imessage-bubble { background: #0a84ff; border-radius: 20px 20px 5px 20px; }
            .imessage-line[data-sender="Me"].no-tail .imessage-bubble { border-radius: 20px; }
            .imessage-line:not([data-sender="Me"]) .imessage-bubble { background: #2c2c2e; border-radius: 20px 20px 20px 5px; }
            .imessage-line:not([data-sender="Me"]).no-tail .imessage-bubble { border-radius: 20px; }
            .imessage-line:not([data-sender="Me"]) .imessage-sender-name { display: block; }
            
            .imessage-time { display: inline-block; font-size: 0.7em; opacity: 0.6; margin-left: 8px; float: right; margin-top: 5px; }
            .imessage-error-icon { color: #ff3b30; border: 1.5px solid #ff3b30; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0; }
            .imessage-error-text { color: #ff3b30; font-size: 0.7em; margin-top: 2px; margin-right: 24px; font-weight: 500; text-align: right; }

            .imessage-attachment { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); padding: 8px; border-radius: 12px; margin-bottom: 5px; }
            .attachment-icon { font-size: 1.2em; opacity: 0.9; }
            .attachment-info { display: flex; flex-direction: column; font-size: 0.8em; }
            .attachment-filename { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
            .attachment-subtext { font-size: 0.75em; opacity: 0.5; }

            .voice-controls { display: flex; align-items: center; gap: 8px; width: 160px; padding: 4px 0; }
            .voice-wave { flex-grow: 1; height: 12px; background: repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 1px, transparent 3px); opacity: 0.3; }
            .transcription { font-style: italic; font-size: 0.85em; opacity: 0.8; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px; display: block; line-height: 1.2; }
            
            .media-placeholder { width: 180px; height: 100px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.8em; opacity: 0.4; margin-bottom: 5px; border: 1px dashed rgba(255,255,255,0.2); }
        </style>`;
        $('head').append(style);
    }
};

// Хелпер для случайного размера файла
const getRandomSize = () => {
    const isMb = Math.random() > 0.7;
    const val = isMb ? (Math.random() * 14 + 1).toFixed(1) + ' MB' : (Math.random() * 800 + 100).toFixed(0) + ' KB';
    return val;
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
            const lineRegex = /([A-Za-zА-Яа-яЁё0-9_\-]+)\s*'(\d{2}:\d{2})'\s*(!)?\s*(?:\((file|voice|photo|media)(?::\s*(.*?))?\))?\s*:\s*(.*)/i;
            const matchLine = pureText.match(lineRegex);

            if (matchLine) {
                parsedMessages.push({
                    type: 'msg',
                    sender: matchLine[1],
                    time: matchLine[2],
                    isUndelivered: matchLine[3] === '!',
                    attachType: matchLine[4],
                    attachData: matchLine[5],
                    msg: matchLine[6]
                });
            } else if (pureText) {
                parsedMessages.push({ type: 'system', text: pureText });
            }
        });

        let resultHtml = '<div class="ios-chat-container"><div class="ios-chat-header">iMessage</div><div class="ios-chat-messages">';

        for (let i = 0; i < parsedMessages.length; i++) {
            const current = parsedMessages[i];
            if (current.type !== 'msg') {
                resultHtml += `<div class="imessage-line" style="align-items: center; opacity: 0.5; font-size: 0.8em; margin: 5px 0;">${current.text}</div>`;
                continue;
            }

            const isMe = current.sender.toLowerCase() === 'me';
            const prev = (i > 0 && parsedMessages[i-1].type === 'msg') ? parsedMessages[i-1] : null;
            const next = (i < parsedMessages.length - 1 && parsedMessages[i+1].type === 'msg') ? parsedMessages[i+1] : null;
            const isConsecutivePrev = prev && prev.sender === current.sender;
            const isConsecutiveNext = next && next.sender === current.sender;
            
            let classes = ['imessage-line'];
            if (isConsecutivePrev) classes.push('consecutive');
            if (isConsecutiveNext) classes.push('no-tail');

            let attachmentHtml = '';
            if (current.attachType === 'file') {
                attachmentHtml = `<div class="imessage-attachment"><i class="fa-solid fa-file-lines attachment-icon"></i><div class="attachment-info"><span class="attachment-filename">${current.attachData || 'document.pdf'}</span><span class="attachment-subtext">${getRandomSize()}</span></div></div>`;
            } else if (current.attachType === 'voice') {
                attachmentHtml = `<div class="voice-controls"><i class="fa-solid fa-play"></i><div class="voice-wave"></div><span class="attachment-subtext">0:12</span></div>`;
                if (current.attachData && current.attachData.trim() !== '') {
                    attachmentHtml += `<span class="transcription"><i class="fa-solid fa-quote-left" style="font-size:0.7em; margin-right:6px; opacity:0.4;"></i>${current.attachData}</span>`;
                }
            } else if (current.attachType === 'photo') {
                attachmentHtml = `<div class="media-placeholder"><i class="fa-solid fa-image"></i></div>`;
            } else if (current.attachType === 'media') {
                attachmentHtml = `<div class="media-placeholder"><i class="fa-solid fa-video"></i></div>`;
            }

            resultHtml += `
                <div class="${classes.join(' ')}" data-sender="${isMe ? 'Me' : current.sender}">
                    ${!isMe && !isConsecutivePrev ? `<div class="imessage-sender-name">${current.sender}</div>` : ''}
                    <div class="imessage-bubble-wrapper">
                        <div class="imessage-bubble">
                            ${attachmentHtml}
                            ${current.msg ? `<span>${current.msg}</span>` : ''}
                            <span class="imessage-time">${current.time}</span>
                        </div>
                        ${isMe && current.isUndelivered ? '<div class="imessage-error-icon">!</div>' : ''}
                    </div>
                    ${isMe && current.isUndelivered ? '<div class="imessage-error-text">Не доставлено</div>' : ''}
                </div>
            `;
        }
        return resultHtml + '</div></div>';
    });
};

const renderIMessages = () => {
    $('.mes_text').each(function() {
        let currentHtml = $(this).html();
        if (currentHtml.toLowerCase().includes('imessage')) {
            let newHtml = parseIMessageTags(currentHtml);
            if (currentHtml !== newHtml) $(this).html(newHtml);
        }
    });
};

jQuery(async () => {
    injectCSS();
    const delayedRender = () => { setTimeout(renderIMessages, 150); };
    eventSource.on(event_types.CHAT_CHANGED, delayedRender);
    eventSource.on(event_types.MESSAGE_RECEIVED, delayedRender);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, delayedRender);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, delayedRender);
    eventSource.on(event_types.MESSAGE_UPDATED, delayedRender);
    setTimeout(renderIMessages, 1000);
});
