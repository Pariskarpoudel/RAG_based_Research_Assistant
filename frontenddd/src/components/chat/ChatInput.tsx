import { useState, KeyboardEvent } from 'react';
import { Loader2, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSend, isLoading }: ChatInputProps) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isActive = input.trim().length > 0;

  return (
    <div className="p-4 border-t border-border bg-background/80 backdrop-blur-glass">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-2xl p-2 flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            className="flex-1 bg-transparent border-0 resize-none min-h-[44px] max-h-[200px] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 font-sans text-sm leading-relaxed"
            rows={1}
            disabled={isLoading}
          />
          <motion.button
            whileHover={{ scale: 1.08, rotate: isActive ? 0 : 0 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
              isActive 
                ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30' 
                : 'bg-muted/60 border border-border'
            } disabled:cursor-not-allowed`}
          >
            {/* Shimmer effect when active */}
            {isActive && !isLoading && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              />
            )}
            
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            ) : (
              <ArrowUp 
                className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-muted-foreground'
                }`} 
                strokeWidth={2.5}
              />
            )}
          </motion.button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send • Shift + Enter for new line
        </p>
      </div>
    </div>
  );
};
