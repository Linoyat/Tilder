import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ChatsPage() {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shelterId, setShelterId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchChats = async () => {
            try {
                const response = await fetch('http://localhost:5050/api/chats', {
                    headers: {
                        'x-auth-token': token,
                    },
                });

                if (response.ok) {
                    const chatsData = await response.json();
                    setChats(chatsData);
                } else if (response.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }
            } catch (error) {
                console.error('Error fetching chats:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchProfile = async () => {
            try {
                const res = await fetch('http://localhost:5050/api/profile', {
                    headers: { 'x-auth-token': token },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.shelterId) setShelterId(data.shelterId);
                }
            } catch (e) {
                console.warn('Error fetching profile for shelterId', e);
            }
        };

        fetchChats();
        fetchProfile();
    }, [navigate]);

    const handleChatClick = (chat) => {
        navigate(`/chat/${chat.userId}`, {
            state: {
                userName: chat.userName,
                userImage: chat.userImage
            }
        });
    };

    const handleDeleteChat = async (chat, event) => {
        event.stopPropagation(); // מונע הפעלת handleChatClick
        
        if (!window.confirm(`האם אתה בטוח שברצונך למחוק את הצ'אט עם ${chat.userName}?`)) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5050/api/chats/${chat.userId}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token,
                },
            });

            if (response.ok) {
                // הסר את הצ'אט מהרשימה המקומית
                setChats(prevChats => prevChats.filter(c => c.userId !== chat.userId));
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

    const getLastMessage = (messages) => {
        if (!messages || messages.length === 0) {
            return 'אין הודעות עדיין';
        }
        const lastMessage = messages[messages.length - 1];
        return lastMessage.text.length > 30 
            ? lastMessage.text.substring(0, 30) + '...' 
            : lastMessage.text;
    };

    const getLastMessageTime = (messages) => {
        if (!messages || messages.length === 0) {
            return '';
        }
        const lastMessage = messages[messages.length - 1];
        const date = new Date(lastMessage.timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'עכשיו';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} שעות`;
        } else {
            return date.toLocaleDateString('he-IL');
        }
    };

    if (loading) {
        return (
            <div style={{textAlign: 'center', marginTop: 40}}>
                טוען צ'אטים...
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
                justifyContent: 'center',
                padding: '16px',
                borderBottom: '1px solid #eee',
                background: '#fff',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                {shelterId && (
                    <button
                        onClick={() => navigate(`/shelter/${shelterId}`)}
                        title="חזרה למקלט"
                        style={{
                            position: 'absolute',
                            right: 16,
                            background: 'none',
                            border: 'none',
                            fontSize: 24,
                            cursor: 'pointer',
                            padding: 4,
                            lineHeight: 1,
                        }}
                    >
                        ←
                    </button>
                )}
                <h2 style={{margin: 0}}>צ'אטים</h2>
            </div>

            {/* Chats List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px'
            }}>
                {chats.length === 0 ? (
                    <div style={{textAlign: 'center', color: '#666', marginTop: 40}}>
                        <p>אין צ'אטים עדיין</p>
                        <p>התחל שיחה עם מישהו! 💬</p>
                    </div>
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {chats.map((chat, index) => (
                            <div 
                                key={index}
                                onClick={() => handleChatClick(chat)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '16px',
                                    background: '#f9f9f9',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                                onMouseLeave={(e) => e.target.style.background = '#f9f9f9'}
                            >
                                <img 
                                    src={chat.userImage || 'https://randomuser.me/api/portraits/lego/1.jpg'} 
                                    alt="Profile" 
                                    style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: '50%',
                                        marginInlineEnd: '16px'
                                    }}
                                />
                                <div style={{flex: 1}}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '4px'
                                    }}>
                                        <div style={{fontWeight: 700, fontSize: '16px'}}>
                                            {chat.userName}
                                        </div>
                                        <div style={{fontSize: '12px', color: '#666'}}>
                                            {getLastMessageTime(chat.messages)}
                                        </div>
                                    </div>
                                    <div style={{
                                        color: '#555',
                                        fontSize: '14px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {getLastMessage(chat.messages)}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteChat(chat, e)}
                                    style={{
                                        background: '#ff6b6b',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px',
                                        color: 'white',
                                        marginInlineStart: '8px',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = '#ff5252'}
                                    onMouseLeave={(e) => e.target.style.background = '#ff6b6b'}
                                    title="מחק צ'אט"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatsPage; 