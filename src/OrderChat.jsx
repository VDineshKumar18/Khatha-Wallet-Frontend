import { useState, useEffect, useRef } from "react";
import { Send, X, MessageSquareWarning, Check, CheckCheck } from "lucide-react";
import axiosClient from "./api/axiosClient";
import "./CustomerApp.css";

function OrderChat({ order, currentUserId, currentUserRole, onClose }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const pollingInterval = useRef(null);

    // Mark messages as read when opening or receiving new messages
    const markAsRead = async () => {
        try {
            await axiosClient.put(`/orders/${order.id}/chat/read`, null, {
                params: { role: currentUserRole }
            });
        } catch (err) {
            console.error("Failed to mark messages as read", err);
        }
    };

    // Fetch initial messages and set up polling
    useEffect(() => {
        fetchMessages();
        markAsRead();
        
        pollingInterval.current = setInterval(() => {
            fetchMessages(false); // don't show loading on background polls
        }, 5000); 

        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        };
    }, [order.id]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.senderRole !== currentUserRole && !lastMsg.read) {
                markAsRead();
            }
        }
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async (showLoad = true) => {
        if (showLoad) setLoading(true);
        try {
            const res = await axiosClient.get(`/orders/${order.id}/chat`);
            setMessages(res.data || []);
        } catch (err) {
            console.error("Failed to load chat", err);
        } finally {
            if (showLoad) setLoading(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msgPayload = {
            senderId: currentUserId,
            senderRole: currentUserRole, 
            message: newMessage.trim()
        };

        // Optimistic UI update
        const tempMsg = { ...msgPayload, id: Date.now(), timestamp: new Date().toISOString(), read: false };
        setMessages(prev => [...prev, tempMsg]);
        setNewMessage("");

        try {
            await axiosClient.post(`/orders/${order.id}/chat`, msgPayload);
            fetchMessages(false);
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    const formatTime = (ts) => {
        if (!ts) return "";
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-content chat-modal" onClick={(e) => e.stopPropagation()} style={{ 
                width: '95%', maxWidth: '420px', height: '85vh', 
                display: 'flex', flexDirection: 'column', padding: 0, 
                overflow: 'hidden', borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                
                {/* Chat Header */}
                <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
                    color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px' }}>Order #{order.id}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <div style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }}></div>
                            <span style={{ fontSize: '12px', opacity: 0.9, fontWeight: 500 }}>
                                {currentUserRole === 'CUSTOMER' ? `with ${order.retailerName}` : `with ${order.customerName || 'Customer'}`}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div style={{ 
                    flex: 1, overflowY: 'auto', padding: '20px', 
                    background: '#f8fafc', // Modern Slate
                    display: 'flex', flexDirection: 'column', gap: '16px',
                    backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
                    backgroundSize: '24px 24px'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <span style={{ background: '#e2e8f0', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TODAY</span>
                    </div>

                    {loading && messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', marginTop: '20px', fontSize: '14px' }}>Loading conversation...</div>
                    ) : messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 'auto', marginBottom: 'auto', padding: '0 40px' }}>
                            <div style={{ background: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <MessageSquareWarning size={32} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                                <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>Secure Messaging</p>
                                <p style={{ fontSize: '12px', marginTop: '4px', lineHeight: 1.5 }}>Only use this chat for coordinating this specific order. Avoid sharing sensitive info.</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.senderRole === currentUserRole;
                            
                            return (
                                <div key={msg.id || idx} style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: isMe ? 'flex-end' : 'flex-start',
                                    maxWidth: '100%'
                                }}>
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '20px',
                                        fontSize: '14.5px',
                                        lineHeight: '1.5',
                                        background: isMe ? '#4f46e5' : 'white',
                                        color: isMe ? 'white' : '#1e293b',
                                        borderBottomRightRadius: isMe ? '4px' : '20px',
                                        borderBottomLeftRadius: isMe ? '20px' : '4px',
                                        boxShadow: isMe ? '0 4px 12px rgba(79, 70, 229, 0.2)' : '0 2px 5px rgba(0,0,0,0.05)',
                                        maxWidth: '85%',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'pre-wrap',
                                        position: 'relative'
                                    }}>
                                        {msg.message}
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'flex-end', 
                                            gap: '4px', 
                                            marginTop: '4px',
                                            fontSize: '10px',
                                            opacity: isMe ? 0.8 : 0.6
                                        }}>
                                            <span>{formatTime(msg.timestamp)}</span>
                                            {isMe && (
                                                msg.read ? <CheckCheck size={14} /> : <Check size={14} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid #f1f5f9' }}>
                    <form onSubmit={sendMessage} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <textarea 
                                rows="1"
                                placeholder="Message..." 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage(e);
                                    }
                                }}
                                style={{ 
                                    width: '100%', 
                                    padding: '12px 16px', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: '24px', 
                                    outline: 'none', 
                                    background: '#f8fafc',
                                    resize: 'none',
                                    fontSize: '14.5px',
                                    fontFamily: 'inherit',
                                    display: 'block'
                                }}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim()}
                            style={{ 
                                background: newMessage.trim() ? '#4f46e5' : '#e2e8f0', 
                                border: 'none', 
                                borderRadius: '16px', 
                                width: '48px', 
                                height: '48px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: 'white', 
                                cursor: newMessage.trim() ? 'pointer' : 'default', 
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: newMessage.trim() ? 'scale(1)' : 'scale(0.95)',
                                boxShadow: newMessage.trim() ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none'
                            }}
                        >
                            <Send size={20} style={{ marginLeft: '2px' }}/>
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}

export default OrderChat;
