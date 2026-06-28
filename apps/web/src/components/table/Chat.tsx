import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@boardhub/shared';
import { CHAT_MAX_LENGTH } from '@boardhub/shared';
import { Icon } from '../Icon';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function Chat({ messages, onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText('');
  };

  return (
    <div className="bh-chat">
      <div className="bh-chat-log" ref={logRef}>
        {messages.length === 0 ? (
          <div className="bh-muted" style={{ fontSize: 13 }}>
            Chưa có tin nhắn. Hãy chào bàn một câu.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`bh-chat-msg${m.kind === 'system' ? ' system' : ''}`}>
              {m.kind === 'system' ? (
                <span>
                  {m.displayName !== 'Hệ thống' ? <span className="who">{m.displayName} </span> : null}
                  {m.text}
                </span>
              ) : (
                <span>
                  <span className="who" style={{ color: m.avatarColor }}>
                    {m.displayName}:
                  </span>{' '}
                  {m.text}
                </span>
              )}
            </div>
          ))
        )}
      </div>
      <form className="d-flex gap-2 p-2 border-top" onSubmit={submit}>
        <input
          className="form-control form-control-sm"
          placeholder="Nhắn tin..."
          value={text}
          maxLength={CHAT_MAX_LENGTH}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={disabled || !text.trim()} aria-label="Gửi">
          <Icon name="send" size={16} />
        </button>
      </form>
    </div>
  );
}
