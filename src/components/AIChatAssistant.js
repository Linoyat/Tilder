import React, { useState, useRef, useEffect } from 'react';
import './AIChatAssistant.css';

function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState('');
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // הוסף הודעת ברוכים הבאים
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: 'שלום! אני כאן כדי לעזור לך לכתוב משפטי פתיחה כדי שלא תצא מפה רווק/ה! 😊'
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    // סגירת הפאנל כשלוחצים מחוץ לו
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    // גלילה אוטומטית להודעה האחרונה
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateAIOpeningLine = async (context) => {
    const errors = [];

    // אם יש API key)
    try {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Trying server API with Gemini...');
        const response = await fetch('http://localhost:5050/api/ai/opening-line', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
          },
          body: JSON.stringify({ context }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.openingLine) {
            // בדיקה שזה לא fallback - אם זה מכיל מילים ספציפיות של fallback, נדחה
            const fallbackIndicators = [
              'היי! ראיתי אותך במקלט וחשבתי שזה הזמן הנכון',
              'שלום! נראה שאנחנו באותו מקלט',
              'היי! איך עובר עליך במקלט?'
            ];
            
            const isFallback = fallbackIndicators.some(indicator => 
              data.openingLine.includes(indicator)
            );

            if (!isFallback && data.openingLine.length > 10) {
              console.log('Got AI response from server:', data.openingLine);
              return data.openingLine;
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          errors.push(`Server API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (serverError) {
      console.log('Server API failed:', serverError);
      errors.push(`Server API: ${serverError.message}`);
    }

    // אם השרת נכשל, נזרוק שגיאה
    throw new Error(`כל ה-APIs נכשלו. שגיאות: ${errors.join('; ')}`);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setContext(userMessage);
    
    // הוסף את הודעת המשתמש
    const newUserMessage = {
      role: 'user',
      text: userMessage
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      console.log('Generating AI response for:', userMessage);
      
      // נסה ליצור משפט פתיחה עם AI - רק AI API, ללא fallback
      const openingLine = await generateAIOpeningLine(userMessage);
      
      if (!openingLine || openingLine.trim().length === 0) {
        throw new Error('התקבלה תשובה ריקה מ-AI');
      }
      
      console.log('Successfully generated AI opening line:', openingLine);
      
      const aiMessage = {
        role: 'assistant',
        text: openingLine
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        role: 'assistant',
        text: `מצטער, לא הצלחתי להתחבר ל-AI כרגע. ${error.message ? `שגיאה: ${error.message}` : 'נסה שוב בעוד כמה רגעים.'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickSuggestions = (suggestion) => {
    setInputValue(suggestion);
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      text: 'שלום! אני כאן כדי לעזור לך לכתוב משפטי פתיחה כדי שלא תצא מפה רווק/ה! 😊'
    }]);
    setContext('');
  };

  return (
    <div className="ai-chat-assistant-container" ref={panelRef}>
      <button 
        className="ai-chat-button" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="עוזר AI למשפטי פתיחה"
        title="עוזר AI למשפטי פתיחה"
      >
        ✨ AI
      </button>

      {isOpen && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <div className="ai-chat-title">
              <span className="ai-icon">✨</span>
              <span>עוזר AI למשפטי פתיחה</span>
            </div>
            <div className="ai-chat-actions">
              <button onClick={clearChat} className="clear-chat-btn" title="נקה שיחה">
                🗑️
              </button>
              <button onClick={() => setIsOpen(false)} className="close-chat-btn" title="סגור">
                ✕
              </button>
            </div>
          </div>

          <div className="ai-chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`ai-message ${message.role}`}>
                <div className="ai-message-content">
                  {message.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="ai-message assistant">
                <div className="ai-message-content">
                  <span className="typing-indicator">מחשב...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-quick-suggestions">
            <div className="suggestions-label">הצעות מהירות:</div>
            <div className="suggestions-buttons">
              <button onClick={() => handleQuickSuggestions('אני רוצה לפתוח שיחה עם מישהו במקלט')}>
                💬 פתיחת שיחה במקלט
              </button>
              <button onClick={() => handleQuickSuggestions('אני רוצה לכתוב משהו מצחיק')}>
                😄 משהו מצחיק
              </button>
              <button onClick={() => handleQuickSuggestions('אני רוצה לכתוב משהו רומנטי')}>
                ❤️ משהו רומנטי
              </button>
            </div>
          </div>

          <div className="ai-chat-input-container">
            <textarea
              className="ai-chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="כתוב כאן מה אתה רוצה לומר או על מי אתה רוצה לכתוב..."
              rows={2}
            />
            <button 
              onClick={handleSend} 
              className="ai-send-button"
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIChatAssistant;

