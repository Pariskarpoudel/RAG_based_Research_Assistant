import { useRef, useEffect } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Message } from '@/types/chat';
import { MessageBubble } from './MessageBubble';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage?: (message: string) => void;
}

export const ChatMessages = ({ messages, isLoading, onSendMessage }: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Research Assistant
            </h1>
            <p className="text-muted-foreground max-w-md mb-8">
              Ask questions about your documents. I'll search through them and provide answers with source references.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['What is PINN?', 'Explain neural networks', 'How does RAG work?'].map((suggestion) => (
                <motion.button
                  key={suggestion}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSendMessage?.(suggestion)}
                  className="px-4 py-2 rounded-full bg-muted/50 border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/50 transition-all duration-200 cursor-pointer"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Generating...
              </span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
