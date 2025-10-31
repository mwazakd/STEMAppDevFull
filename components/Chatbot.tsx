import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { getChatbotResponse } from '../services/geminiService';
import { MessageSquareIcon, CloseIcon, SendIcon } from './Icons';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: "Hello! I'm your STEM tutor. How can I help you understand a topic better today?", sender: 'bot' }
  ]);
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() === '') return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: userInput,
      sender: 'user',
    };
    
    const newHistory = [...messages, userMessage];
    
    setMessages([...newHistory, { id: 'loading', text: '', sender: 'bot', isLoading: true }]);
    setUserInput('');

    const botResponseText = await getChatbotResponse(newHistory);

    const botMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: botResponseText,
      sender: 'bot',
    };

    setMessages(prev => [...prev.filter(m => !m.isLoading), botMessage]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-brand-primary text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
        aria-label="Open chat tutor"
      >
        <MessageSquareIcon className="h-8 w-8" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full sm:w-96 h-[70vh] sm:h-[600px] flex flex-col bg-white rounded-xl shadow-2xl border border-gray-200" role="dialog" aria-live="polite" aria-label="STEM Tutor Chat">
      <header className="flex items-center justify-between p-4 border-b bg-brand-primary text-white rounded-t-xl">
        <h3 className="text-lg font-bold">STEM Tutor</h3>
        <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1" aria-label="Close chat">
          <CloseIcon className="h-6 w-6" />
        </button>
      </header>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex-shrink-0" aria-hidden="true"></div>}
            <div className={`max-w-xs md:max-w-sm rounded-2xl px-4 py-2 ${msg.sender === 'user' ? 'bg-brand-accent text-white rounded-br-none' : 'bg-gray-200 text-brand-dark rounded-bl-none'}`}>
              {msg.isLoading ? (
                <div className="flex items-center space-x-1" role="status" aria-label="Tutor is typing">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                </div>
              ) : (
                <p className="text-sm">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center space-x-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask about a concept..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary"
          aria-label="Your message"
        />
        <button type="submit" className="p-3 bg-brand-primary text-white rounded-full hover:bg-green-700 transition disabled:bg-gray-400" disabled={userInput.trim() === ''} aria-label="Send message">
          <SendIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
