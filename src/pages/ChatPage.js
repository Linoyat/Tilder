import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

function ChatPage() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatUser, setChatUser] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchChat = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // קבל פרטי המשתמש מה-state של הניווט
            if (location.state) {
                setChatUser({
                    name: location.state.userName,
                    image: location.state.userImage
                });
            }

            try {
                const response = await fetch(`http://localhost:5050/api/chats/${id}`, {
                    headers: {
                        'x-auth-token': token,
                    },
                });

                if (response.ok) {
                    const chatData = await response.json();
                    setMessages(chatData.messages || []);
                } else if (response.status === 401) {
                    // טוקן לא תקין - הפניה להתחברות
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                } else if (response.status === 404) {
                    // צ'אט חדש - אין הודעות עדיין
                    setMessages([]);
                } else {
                    console.error('Server error:', response.status);
                    setMessages([]);
                }
            } catch (error) {
                console.error('Error fetching chat:', error);
                // במקרה של שגיאה, נציג צ'אט ריק
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };

        fetchChat();
    }, [id, navigate, location.state]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5050/api/chats/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                },
                body: JSON.stringify({
                    message: newMessage,
                    userName: chatUser?.name || 'משתמש',
                    userImage: chatUser?.image || ''
                }),
            });

            if (response.ok) {
                const chatData = await response.json();
                setMessages(chatData.messages);
                setNewMessage('');
            } else if (response.status === 401) {
                // טוקן לא תקין - הפניה להתחברות
                localStorage.removeItem('token');
                navigate('/login');
                return;
            } else if (response.status === 500) {
                console.error('Server error:', response.status);
                alert('שגיאה בשרת - נסה שוב מאוחר יותר');
            } else {
                console.error('Error sending message:', response.status);
                alert('שגיאה בשליחת ההודעה');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('שגיאה בחיבור לשרת');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleDeleteChat = async () => {
        if (!window.confirm(`האם אתה בטוח שברצונך למחוק את הצ'אט עם ${chatUser?.name || 'משתמש'}?`)) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5050/api/chats/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token,
                },
            });

            if (response.ok) {
                // חזור לדף הצ'אטים
                navigate('/chats');
            } else if (response.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            } else {
                alert('שגיאה במחיקת הצ\'אט');
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            alert('שגיאה במחיקת הצ\'אט');
        }
    };

    if (loading) {
        return (
            <div style={{textAlign: 'center', marginTop: 40}}>
                טוען צ'אט...
            </div>
        );
    }

    return (
        <div style={{ 
            maxWidth: 500, 
            margin: '0 auto', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            background: '#fff'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                borderBottom: '1px solid #eee',
                background: '#fff',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <button 
                    onClick={() => location.state?.fromShelterId
                        ? navigate(`/shelter/${location.state.fromShelterId}`)
                        : navigate('/chats')}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        marginInlineEnd: '12px'
                    }}
                    title="חזרה לצ'אטים"
                >
                    ←
                </button>
                <img 
                    src={chatUser?.image || 'https://randomuser.me/api/portraits/lego/1.jpg'} 
                    alt="Profile" 
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        marginInlineEnd: '12px'
                    }}
                />
                <div style={{flex: 1}}>
                    <div style={{fontWeight: 700}}>{chatUser?.name || 'משתמש'}</div>
                    <div style={{fontSize: '12px', color: '#666'}}>מחובר</div>
                </div>
                <button
                    onClick={handleDeleteChat}
                    style={{
                        background: '#ff6b6b',
                        border: 'none',
                        borderRadius: '50%',
                        width: 36,
                        height: 36,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        color: 'white',
                        transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#ff5252'}
                    onMouseLeave={(e) => e.target.style.background = '#ff6b6b'}
                    title="מחק צ'אט"
                >
                    🗑️
                </button>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {messages.length === 0 ? (
                    <div style={{textAlign: 'center', color: '#666', marginTop: 40}}>
                        <p>אין הודעות עדיין</p>
                        <p>התחל שיחה! 💬</p>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={index}
                            style={{
                                alignSelf: message.sender === 'me' ? 'flex-end' : 'flex-start',
                                maxWidth: '70%'
                            }}
                        >
                            <div style={{
                                background: message.sender === 'me' ? '#4ecdc4' : '#f0f0f0',
                                color: message.sender === 'me' ? 'white' : 'black',
                                padding: '12px 16px',
                                borderRadius: '18px',
                                wordWrap: 'break-word'
                            }}>
                                {message.text}
                            </div>
                            <div style={{
                                fontSize: '10px',
                                color: '#666',
                                marginTop: '4px',
                                textAlign: message.sender === 'me' ? 'right' : 'left'
                            }}>
                                {new Date(message.timestamp).toLocaleTimeString('he-IL', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input - תמיד מוצג */}
            <div style={{
                padding: '16px',
                paddingBottom: '80px',
                borderTop: '1px solid #eee',
                background: '#fff',
                display: 'flex',
                gap: '8px'
            }}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="הקלד הודעה..."
                    style={{
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '20px',
                        fontSize: '14px'
                    }}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    style={{
                        background: newMessage.trim() ? '#4ecdc4' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: 40,
                        height: 40,
                        cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px'
                    }}
                >
                    ➤
                </button>
            </div>
        </div>
    );
}

export default ChatPage; 