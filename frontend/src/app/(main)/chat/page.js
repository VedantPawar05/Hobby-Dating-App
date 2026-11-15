'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Send,
  Calendar,
  MapPin,
  ArrowLeft,
  Check,
  CheckCheck,
  Sparkles,
  HeartHandshake,
  Search,
} from 'lucide-react';
import ProtectedRoute from '../../../components/auth/ProtectedRoute.js';
import { useAuth } from '../../../context/AuthContext.js';
import chatService from '../../../services/chat.service.js';
import { getSocket } from '../../../services/socket.service.js';
import Button from '../../../components/common/Button.js';
import Card from '../../../components/common/Card.js';
import LoadingState from '../../../components/common/LoadingState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import { formatDateTime } from '../../../utils/formatters.js';

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatChatDateSeparator(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function ChatContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchIdParam = searchParams.get('matchId');
  const conversationIdParam = searchParams.get('conversationId');

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(conversationIdParam || null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [mobileView, setMobileView] = useState(conversationIdParam ? 'chat' : 'list');

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingEmittedRef = useRef(0);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // 1. Load user's conversations list
  const loadConversations = useCallback(async () => {
    try {
      const res = await chatService.getConversations({ page: 1, limit: 50 });
      const convs = res?.data?.conversations || [];
      setConversations(convs);
      return convs;
    } catch (err) {
      setError(err.message || 'Unable to load conversations.');
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // 2. Initial load: handle ?matchId=... or ?conversationId=...
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      const convs = await loadConversations();
      if (!isMounted) return;

      if (matchIdParam) {
        try {
          const res = await chatService.createOrGetConversation(matchIdParam);
          const conv = res?.data?.conversation;
          if (conv && isMounted) {
            setActiveId(conv._id);
            setActiveConversation(conv);
            setMobileView('chat');
            // Ensure conversation is in list
            setConversations((prev) => {
              const exists = prev.some((c) => c._id === conv._id);
              return exists ? prev : [conv, ...prev];
            });
          }
        } catch (err) {
          if (isMounted) setError(err.message || 'Could not open conversation for this match.');
        }
      } else if (conversationIdParam) {
        setActiveId(conversationIdParam);
        setMobileView('chat');
      } else if (convs.length > 0 && window.innerWidth >= 768) {
        // Desktop default: pick first conversation
        setActiveId(convs[0]._id);
        setActiveConversation(convs[0]);
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [matchIdParam, conversationIdParam, loadConversations]);

  // 3. Load messages when activeId changes
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setActiveConversation(null);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    async function fetchConversationData() {
      try {
        const [convRes, msgsRes] = await Promise.all([
          chatService.getConversation(activeId),
          chatService.getMessages(activeId, { page: 1, limit: 100 }),
        ]);

        if (!isMounted) return;

        const conv = convRes?.data?.conversation;
        const msgs = msgsRes?.data?.messages || [];

        setActiveConversation(conv);
        setMessages(msgs);

        // Mark unread messages as read
        if (conv?.unreadCount > 0) {
          chatService.markAsRead(activeId).catch(() => {});
          const socket = getSocket();
          if (socket) {
            socket.emit('mark_read', { conversationId: activeId });
          }
          // Reset unread count locally
          setConversations((prev) =>
            prev.map((c) => (c._id === activeId ? { ...c, unreadCount: 0 } : c))
          );
        }

        setTimeout(() => scrollToBottom(false), 50);
      } catch (err) {
        if (isMounted) setError(err.message || 'Could not load messages.');
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }

    fetchConversationData();

    return () => {
      isMounted = false;
    };
  }, [activeId]);

  // 4. Socket.io event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (activeId) {
      socket.emit('join_conversation', { conversationId: activeId });
    }

    const handleNewMessage = (newMsg) => {
      const msgConvId =
        typeof newMsg.conversation === 'object'
          ? newMsg.conversation?._id
          : newMsg.conversation;

      if (msgConvId === activeId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === newMsg._id);
          if (exists) return prev;
          return [...prev, newMsg];
        });

        const isRecipient =
          (newMsg.recipient?._id ? newMsg.recipient._id.toString() : newMsg.recipient?.toString()) ===
          user?._id?.toString();

        if (isRecipient) {
          socket.emit('mark_read', { conversationId: activeId });
          chatService.markAsRead(activeId).catch(() => {});
        }

        setTimeout(() => scrollToBottom(true), 50);
      }

      // Update sidebar conversation item
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv._id === msgConvId) {
            const isUnread =
              msgConvId !== activeId &&
              (newMsg.recipient?._id
                ? newMsg.recipient._id.toString()
                : newMsg.recipient?.toString()) === user?._id?.toString();

            return {
              ...conv,
              lastMessage: newMsg,
              lastMessageAt: newMsg.createdAt,
              unreadCount: isUnread ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
            };
          }
          return conv;
        })
      );
    };

    const handleMessagesRead = ({ conversationId: readConvId, readerId }) => {
      if (readConvId === activeId && readerId !== user?._id?.toString()) {
        setMessages((prev) =>
          prev.map((m) => (m.sender?._id === user?._id ? { ...m, isRead: true } : m))
        );
      }
    };

    const handleUserTyping = ({ conversationId: typingConvId }) => {
      if (typingConvId === activeId) {
        setOtherTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setOtherTyping(false);
        }, 3000);
      }
    };

    const handleUserStopTyping = ({ conversationId: typingConvId }) => {
      if (typingConvId === activeId) {
        setOtherTyping(false);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      if (activeId) {
        socket.emit('leave_conversation', { conversationId: activeId });
      }
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeId, user?._id]);

  // 5. Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !activeId || sending) return;

    setSending(true);
    setInputText('');

    const socket = getSocket();
    if (socket && activeId) {
      socket.emit('stop_typing', { conversationId: activeId });
    }

    try {
      const res = await chatService.sendMessage(activeId, trimmed);
      const savedMsg = res?.data?.message;

      if (savedMsg) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === savedMsg._id);
          return exists ? prev : [...prev, savedMsg];
        });

        // Update sidebar
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeId
              ? { ...c, lastMessage: savedMsg, lastMessageAt: savedMsg.createdAt }
              : c
          )
        );

        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // 6. Typing status dispatch
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    const socket = getSocket();
    if (!socket || !activeId) return;

    const now = Date.now();
    if (now - lastTypingEmittedRef.current > 2000) {
      socket.emit('typing', { conversationId: activeId });
      lastTypingEmittedRef.current = now;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveId(conv._id);
    setActiveConversation(conv);
    setMobileView('chat');
    router.replace(`/chat?conversationId=${conv._id}`, { scroll: false });
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchTerm.trim()) return true;
    const name = c.otherParticipant?.fullName?.toLowerCase() || '';
    const eventTitle = c.event?.title?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();
    return name.includes(term) || eventTitle.includes(term);
  });

  if (loadingConversations) {
    return <LoadingState message="Loading your conversations..." />;
  }

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Page Title */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mutual Match Messaging</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 mt-1">
            Private Messages
          </h1>
        </div>
        <Link href="/matches">
          <Button variant="outline" size="sm">
            <HeartHandshake className="w-4 h-4 mr-1.5" />
            View Matches
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorState message={error} onRetry={() => setError('')} />
        </div>
      )}

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No mutual conversations yet"
          description="Private chat unlocks automatically when you and another attendee mutually tag each other after an event."
          action={
            <Link href="/matches">
              <Button variant="primary" size="sm">
                Check Mutual Matches
              </Button>
            </Link>
          }
        />
      ) : (
        <Card className="p-0 overflow-hidden border border-surface-200 shadow-sm h-[720px] flex">
          {/* Left Panel: Conversation List */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-surface-200 flex flex-col bg-white shrink-0 ${
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search Box */}
            <div className="p-3.5 border-b border-surface-100 bg-surface-50/50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search matches or events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-100">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matches match your search.
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const person = conv.otherParticipant;
                  const isSelected = conv._id === activeId;
                  const initials = person?.fullName
                    ? person.fullName
                        .split(' ')
                        .map((n) => n.charAt(0))
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'M';

                  return (
                    <button
                      key={conv._id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full text-left p-3.5 flex items-start space-x-3 transition-colors ${
                        isSelected
                          ? 'bg-brand-50/60 border-l-4 border-l-brand-600'
                          : 'hover:bg-surface-50'
                      }`}
                    >
                      {person?.profilePicture ? (
                        <img
                          src={person.profilePicture}
                          alt={person.fullName}
                          className="w-11 h-11 rounded-full object-cover border border-surface-200 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm border border-brand-200 shrink-0">
                          {initials}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm font-bold text-surface-900 truncate">
                            {person?.fullName || 'Match'}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatMessageTime(conv.lastMessageAt)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {conv.lastMessage?.content || 'Mutual match connected'}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-1.5">
                          <span className="text-[10px] text-slate-400 font-medium truncate flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-brand-600 shrink-0" />
                            {conv.event?.title || 'Event'}
                          </span>

                          {conv.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-600 text-white shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Active Chat View */}
          <div
            className={`flex-1 flex flex-col bg-surface-50/40 ${
              mobileView === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3.5 sm:px-5 bg-white border-b border-surface-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-3 min-w-0">
                    <button
                      onClick={() => setMobileView('list')}
                      className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-surface-100"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    {activeConversation.otherParticipant?.profilePicture ? (
                      <img
                        src={activeConversation.otherParticipant.profilePicture}
                        alt={activeConversation.otherParticipant.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-surface-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm border border-brand-200 shrink-0">
                        {activeConversation.otherParticipant?.fullName
                          ?.split(' ')
                          .map((n) => n.charAt(0))
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'M'}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-surface-900 truncate">
                        {activeConversation.otherParticipant?.fullName || 'Mutual Match'}
                      </h3>
                      {activeConversation.otherParticipant?.city && (
                        <p className="text-xs text-slate-400 flex items-center">
                          <MapPin className="w-3 h-3 mr-1 shrink-0" />
                          <span>{activeConversation.otherParticipant.city}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {activeConversation.event?._id && (
                    <Link
                      href={`/events/${activeConversation.event._id}`}
                      className="hidden sm:inline-flex items-center space-x-1.5 text-xs text-brand-700 bg-brand-50 border border-brand-200/60 px-2.5 py-1 rounded-full font-medium hover:bg-brand-100 transition-colors shrink-0"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[160px]">
                        {activeConversation.event.title}
                      </span>
                    </Link>
                  )}
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center">
                      <LoadingState message="Loading messages..." />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-sm text-surface-900">
                        Say hello to {activeConversation.otherParticipant?.fullName || 'your match'}!
                      </h4>
                      <p className="text-xs max-w-sm text-slate-500">
                        You both mutually tagged each other at &ldquo;
                        {activeConversation.event?.title || 'an activity'}&rdquo;. Start the
                        conversation!
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, index) => {
                        const isSelf =
                          (msg.sender?._id ? msg.sender._id.toString() : msg.sender?.toString()) ===
                          user?._id?.toString();

                        const prevMsg = index > 0 ? messages[index - 1] : null;
                        const showDateSeparator =
                          !prevMsg ||
                          new Date(msg.createdAt).toDateString() !==
                            new Date(prevMsg.createdAt).toDateString();

                        return (
                          <React.Fragment key={msg._id || index}>
                            {showDateSeparator && (
                              <div className="flex items-center justify-center my-3">
                                <span className="text-[10px] font-semibold text-slate-400 bg-surface-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  {formatChatDateSeparator(msg.createdAt)}
                                </span>
                              </div>
                            )}

                            <div
                              className={`flex flex-col ${
                                isSelf ? 'items-end' : 'items-start'
                              }`}
                            >
                              <div
                                className={`max-w-[85%] sm:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs break-words ${
                                  isSelf
                                    ? 'bg-brand-600 text-white rounded-br-xs'
                                    : 'bg-white text-surface-900 border border-surface-200 rounded-bl-xs'
                                }`}
                              >
                                {msg.content}
                              </div>

                              <div
                                className={`flex items-center space-x-1 mt-1 text-[10px] ${
                                  isSelf ? 'text-slate-400' : 'text-slate-400'
                                }`}
                              >
                                <span>{formatMessageTime(msg.createdAt)}</span>
                                {isSelf && (
                                  <span>
                                    {msg.isRead ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-brand-600 inline" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}

                      {otherTyping && (
                        <div className="flex items-center space-x-2 text-xs text-slate-400 italic">
                          <div className="flex space-x-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                            <span
                              className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                              style={{ animationDelay: '0.2s' }}
                            />
                            <span
                              className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                              style={{ animationDelay: '0.4s' }}
                            />
                          </div>
                          <span>
                            {activeConversation.otherParticipant?.fullName || 'Match'} is
                            typing...
                          </span>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 bg-white border-t border-surface-200 flex items-center space-x-2 sm:space-x-3"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${
                      activeConversation.otherParticipant?.fullName || 'your match'
                    }...`}
                    maxLength={2000}
                    className="flex-1 px-4 py-2.5 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={!inputText.trim() || sending}
                    className="shrink-0 px-4 py-2.5 rounded-xl shadow-xs"
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    <span>Send</span>
                  </Button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-300" />
                <h4 className="font-bold text-sm text-surface-900">
                  Select a Conversation
                </h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  Pick a mutual match from the left sidebar to read message history or send a new
                  message.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingState message="Loading chat..." />}>
        <ChatContent />
      </Suspense>
    </ProtectedRoute>
  );
}
