import { eventSource, event_types } from '../../../../script.js';

const injectCSS = () => {
    if ($('#imessage-style').length === 0) {
        const style = `
        <style id="imessage-style">
            .ios-chat-container { background: #1c1c1e; border-radius: 24px; padding: 18px; margin: 15px 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: white; max-width: 420px; border: 1px solid #333; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
            .ios-chat-header { text-align: center; font-size: 0.85em; color: #8e8e93; margin-bottom: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .ios-chat-messages { display: flex; flex-direction: column; gap: 4px; }
            
            .imessage-line { display: flex; flex-direction: column; width: 100%; position: relative; }
            .imessage-line.consecutive { margin-top: -2px; }
            .imessage-sender-name { font-size: 0.7em; color: #8e8e93; margin: 4px 14px 2px 14px; }
            
            .imessage-bubble-wrapper { display: flex; align-items: flex-end; gap: 8px; width: 100%; }
            .imessage-line[data-sender="Me"] .imessage-bubble-wrapper { justify-content: flex-end; }

            .imessage-bubble { padding: 10px 16px; max-width: 80%; word-wrap: break-word; font-size: 0.95em; line-height: 1.4; position: relative; }
            
            /* Хвосты и скругления */
            .imessage-line[data-sender="Me"] .imessage-bubble { background: #0a84ff; color: white; border-radius: 18px 18px 4px 18px; }
            .imessage-line[data-sender="Me"].no-tail .imessage-bubble { border-radius: 18px; }
            
            .imessage-line:not([data-sender="Me"]) .imessage-bubble { background: #2c2c2e; color: white; border-radius: 18px 18px 18px 4px; }
            .imessage-line:not([data-sender="Me"]).no-tail .imessage-bubble { border-radius: 18px; }

            /* Тот самый VOICE PLAYER */
            .voice-player { display: flex; align-items: center; gap: 10px; width: 220px; padding: 4px 0; }
            .play-btn { font-size: 1.4em; cursor: pointer; line-height: 1; }
            .timeline-container { flex-grow: 1; position: relative; display: flex; align-items: center; }
            .timeline-line { width: 100%; height: 2px; background: rgba(255,255,255,0.3); border-radius: 1px; }
            .timeline-dot { position: absolute; left: 20%; width: 8px; height: 8px; background: white; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.5); }
            
            .transcription-box { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); font-style: italic; font-size: 0.85em; opacity: 0.8; line-height: 1.3; display: block; }
            .transcription-box i { margin-right: 6px; opacity: 0.5; }

            /* ФАЙЛЫ */
            .file-card { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 14px; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.05); }
            .file-icon { font-size: 1.6em; color: #fff; opacity: 0.9; }
            .file-details { display: flex; flex-direction: column; min-width: 0; }
            .file-name { font-weight: 500; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .file-size { font-size: 0.75em; opacity: 0.5; }

            .imessage-time { font-size: 0.65em; opacity: 0.6; margin-top: 4px; display: block; text-align: right; }
            .imessage-error-icon { color: #ff3b30; border: 1.5px solid #ff3b30; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; flex-shrink: 0; }
            .imessage-error-text { color: #ff3b30; font-size: 0.7em; margin-top: 4px; font-weight: 500; text-align: right; padding-right: 26px; }

            .media-box { width: 220px; height: 140px; background: rgba(255,255,255,0.05); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 2.5em; opacity: 0.3; margin-bottom: 6px; border: 1px dashed rgba(255,255,255,0.1); }
        </style>`;
        $('head').append(style);
    }
};

const getRandomSize = () => {
    const isMb = Math.random() > 0.6;
    return isMb ? (Math.random() * 10 + 0.5).toFixed(1) + ' MB' : (Math.random() * 900 + 50).toFixed(0) + ' KB';
};

const parseIMessageTags = (htmlText) => {
    let cleanText = htmlText.replace(/ㅤ/g, ' ');
    const blockRegex = /\{\s*imessage\s*\}([\s\S]*?)\{\s*\/imessage\s*\}/gi;

    return cleanText.replace(blockRegex, (match, content) => {
        let cleanContent = content.replace(/<\/?p>/gi, '').trim();
        const lines = cleanContent.split(/(?:<br\s*\/?>|\n)/i).filter(line => line.trim() !== '');
        
        let messages = [];
        lines.forEach(line => {
            let pure = line.replace(/<[^>]*>/g, '').trim();
            const regex = /([A-Za-zА-Яа-яЁё0-9_\-]+)\s*'(\d{2}:\d{2})'\s*(!)?\s*(?:\((file|voice|photo|media)(?::\s*(.*?))?\))?\s*:\s*(.*)/i;
            const m = pure.match(regex);
            if (m) messages.push({ sender: m[1], time: m[2], err: !!m[3], type: m[4], data: m[5], text: m[6] });
            else if (pure) messages.push({ system: pure });
        });

        let html = '<div class="ios-chat-container"><div class="ios-chat-header">iMessage</div><div class="ios-chat-messages">';

        messages.forEach((msg, i) => {
            if (msg.system) {
                html += `<div style="text-align:center; opacity:0.4; font-size:0.75em; margin:8px 0;">${msg.system}</div>`;
                return;
            }

            const isMe = msg.sender.toLowerCase() === 'me';
            const prev = messages[i-1], next = messages[i+1];
            const isPrevSame = prev && prev.sender === msg.sender;
            const isNextSame = next && next.sender === msg.sender;

            let cls = ['imessage-line'];
            if (isPrevSame) cls.push('consecutive');
            if (isNextSame) cls.push('no-tail');

            let attach = '';
            if (msg.type === 'file') {
                attach = `<div class="file-card"><i class="fa-solid fa-file-doc file-icon"></i><div class="file-details"><span class="file-name">${msg.data || 'document.pdf'}</span><span class="file-size">${getRandomSize()}</span></div></div>`;
            } else if (msg.type === 'voice') {
                attach = `<div class="voice-player"><span class="play-btn">▷</span><div class="timeline-container"><div class="timeline-line"></div><div class="timeline-dot"></div></div><span style="font-size:0.7em; opacity:0.5;">0:12</span></div>`;
                if (msg.data) attach += `<span class="transcription-box"><i class="fa-solid fa-quote-left"></i>${msg.data}</span>`;
            } else if (msg.type === 'photo' || msg.type === 'media') {
                attach = `<div class="media-box"><i class="fa-solid fa-${msg.type === 'photo' ? 'image' : 'video'}"></i></div>`;
            }

            html += `
                <div class="${cls.join(' ')}" data-sender="${isMe ? 'Me' : msg.sender}">
                    ${!isMe && !isPrevSame ? `<div class="imessage-sender-name">${msg.sender}</div>` : ''}
                    <div class="imessage-bubble-wrapper">
                        <div class="imessage-bubble">
                            ${attach}
                            ${msg.text ? `<div>${msg.text}</div>` : ''}
                            <span class="imessage-time">${msg.time}</span>
                        </div>
                        ${isMe && msg.err ? '<div class="imessage-error-icon">!</div>' : ''}
                    </div>
                    ${isMe && msg.err ? '<div class="imessage-error-text">Не доставлено</div>' : ''}
                </div>`;
        });
        return html + '</div></div>';
    });
};

const render = () => {
    $('.mes_text').each(function() {
        let h = $(this).html();
        if (h.toLowerCase().includes('imessage')) {
            let n = parseIMessageTags(h);
            if (h !== n) $(this).html(n);
        }
    });
};

jQuery(async () => {
    injectCSS();
    console.warn("[iMessage UI] Красивая версия загружена!"); [cite: 16]
    const d = () => setTimeout(render, 100);
    eventSource.on(event_types.CHAT_CHANGED, d);
    eventSource.on(event_types.MESSAGE_RECEIVED, d);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, d); [cite: 22]
    eventSource.on(event_types.USER_MESSAGE_RENDERED, d);
    eventSource.on(event_types.MESSAGE_UPDATED, d); [cite: 22]
    setTimeout(render, 800);
});
