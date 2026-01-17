import { FileText, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Chunk, ParsedOriginalContent } from '@/types/chat';

interface ChunkCardProps {
  chunk: Chunk;
  index: number;
  onClick: () => void;
}

export const ChunkCard = ({ chunk, index, onClick }: ChunkCardProps) => {
  const getModality = (): { hasText: boolean; hasImages: boolean } => {
    try {
      const parsed: ParsedOriginalContent = JSON.parse(chunk.metadata.original_content);
      return {
        hasText: Boolean(parsed.raw_text?.trim()),
        hasImages: parsed.images_base64?.length > 0,
      };
    } catch {
      return { hasText: true, hasImages: false };
    }
  };

  const modality = getModality();
  const modalityLabel = modality.hasImages 
    ? 'Text + Image' 
    : 'Text';

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, backgroundColor: 'hsl(var(--chunk-hover))' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full px-4 py-3 rounded-xl bg-chunk border border-border/50 text-left transition-all duration-200 hover:border-primary/30 hover:shadow-glass group"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">
            Chunk {index + 1}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            modality.hasImages ? 'chunk-badge-image' : 'chunk-badge-text'
          }`}>
            {modality.hasImages ? (
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {modalityLabel}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {modalityLabel}
              </span>
            )}
          </span>
        </div>
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <FileText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </motion.button>
  );
};
