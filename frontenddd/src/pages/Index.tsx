import { Trash2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { useChat } from '@/hooks/useChat';

const Index = () => {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-glass sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">RAG Assistant</h1>
              <p className="text-xs text-muted-foreground">Document Q&A</p>
            </div>
          </div>
          
          {messages.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearMessages}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </motion.button>
          )}
        </div>
      </header>

      {/* Chat Messages */}
      <ChatMessages messages={messages} isLoading={isLoading} onSendMessage={sendMessage} />

      {/* Chat Input */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
};

export default Index;
