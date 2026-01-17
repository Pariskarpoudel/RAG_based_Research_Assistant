import { useState } from 'react';
import { User, Bot, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { Message, Chunk } from '@/types/chat';
import { ChunkCard } from './ChunkCard';
import { ChunkModal } from './ChunkModal';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const [selectedChunk, setSelectedChunk] = useState<{ chunk: Chunk; index: number } | null>(null);
  const isUser = message.role === 'user';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      >
        {/* Avatar */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted border border-border'
        }`}>
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4 text-primary" />
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 max-w-[80%] space-y-3 ${isUser ? 'items-end' : ''}`}>
          {/* Message Bubble */}
          <div className={`rounded-2xl px-4 py-3 ${
            isUser 
              ? 'bg-primary text-primary-foreground ml-auto' 
              : 'glass-card'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>

          {/* Retrieved Sources (only for assistant messages) */}
          {!isUser && message.chunks && message.chunks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  📚 Retrieved Sources ({message.chunksRetrieved} chunks)
                </h3>
              </div>
              <div className="space-y-2">
                {message.chunks.map((chunk, index) => (
                  <ChunkCard
                    key={chunk.metadata.parent_id}
                    chunk={chunk}
                    index={index}
                    onClick={() => setSelectedChunk({ chunk, index })}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Chunk Modal */}
      {selectedChunk && (
        <ChunkModal
          chunk={selectedChunk.chunk}
          chunkIndex={selectedChunk.index}
          isOpen={!!selectedChunk}
          onClose={() => setSelectedChunk(null)}
        />
      )}
    </>
  );
};

// import { useState } from 'react';
// import { User, Bot, BookOpen } from 'lucide-react';
// import { motion } from 'framer-motion';
// import { Message, Chunk } from '@/types/chat';
// import { ChunkCard } from './ChunkCard';
// import { ChunkModal } from './ChunkModal';

// interface MessageBubbleProps {
//   message: Message;
// }

// export const MessageBubble = ({ message }: MessageBubbleProps) => {
//   const [selectedChunk, setSelectedChunk] = useState<{ chunk: Chunk; index: number } | null>(null);
//   const isUser = message.role === 'user';

//   return (
//     <>
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
//       >
//         {/* Avatar */}
//         <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
//           isUser 
//             ? 'bg-primary text-primary-foreground' 
//             : 'bg-muted border border-border'
//         }`}>
//           {isUser ? (
//             <User className="w-4 h-4" />
//           ) : (
//             <Bot className="w-4 h-4 text-primary" />
//           )}
//         </div>

//         {/* Content */}
//         <div className={`flex-1 max-w-[80%] space-y-3 ${isUser ? 'items-end' : ''}`}>
//           {/* Message Bubble */}
//           <div className={`rounded-2xl px-4 py-3 ${
//             isUser 
//               ? 'bg-primary text-primary-foreground ml-auto' 
//               : 'glass-card'
//           }`}>
//             <p className="text-sm leading-relaxed whitespace-pre-wrap">
//               {message.content}
//             </p>
//           </div>

//           {/* Retrieved Sources (only for assistant messages) */}
//           {!isUser && message.chunks && message.chunks.length > 0 && (
//             <motion.div
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ delay: 0.2 }}
//               className="glass-card rounded-xl p-4"
//             >
//               <div className="flex items-center gap-2 mb-4">
//                 <BookOpen className="w-4 h-4 text-primary" />
//                 <h3 className="text-sm font-semibold text-foreground">
//                   📚 Retrieved Sources ({message.chunksRetrieved} chunks)
//                 </h3>
//               </div>
//               <div className="space-y-2">
//                 {message.chunks.map((chunk, index) => (
//                   <ChunkCard
//                     key={chunk.metadata.parent_id}
//                     chunk={chunk}
//                     index={index}
//                     onClick={() => setSelectedChunk({ chunk, index })}
//                   />
//                 ))}
//               </div>
//             </motion.div>
//           )}
//         </div>
//       </motion.div>

//       {/* Chunk Modal */}
//       {selectedChunk && (
//         <ChunkModal
//           chunk={selectedChunk.chunk}
//           chunkIndex={selectedChunk.index}
//           isOpen={!!selectedChunk}
//           onClose={() => setSelectedChunk(null)}
//         />
//       )}
//     </>
//   );
// };
