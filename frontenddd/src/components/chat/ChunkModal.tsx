import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, FileText } from 'lucide-react';
import { Chunk, ParsedOriginalContent } from '@/types/chat';

interface ChunkModalProps {
  chunk: Chunk;
  chunkIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ChunkModal = ({ chunk, chunkIndex, isOpen, onClose }: ChunkModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const parseContent = (): ParsedOriginalContent => {
    try {
      return JSON.parse(chunk.metadata.original_content);
    } catch {
      return {
        raw_text: chunk.page_content,
        tables_html: [],
        images_base64: [],
      };
    }
  };

  const content = parseContent();
  const images = content.images_base64 || [];
  const hasImages = images.length > 0;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Chunk {chunkIndex + 1}
              </h2>
              <p className="text-xs text-muted-foreground">
                {hasImages ? `Text + ${images.length} image${images.length > 1 ? 's' : ''}` : 'Text only'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Text Content */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Text Content
            </h3>
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {content.raw_text || chunk.page_content}
              </p>
            </div>
          </div>

          {/* Tables */}
          {content.tables_html?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Tables ({content.tables_html.length})
              </h3>
              {content.tables_html.map((tableHtml, idx) => (
                <div 
                  key={idx}
                  className="bg-muted/30 rounded-xl p-4 border border-border/50 overflow-x-auto mb-3"
                  dangerouslySetInnerHTML={{ __html: tableHtml }}
                />
              ))}
            </div>
          )}

          {/* Images Carousel */}
          {hasImages && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Images ({images.length})
              </h3>
              <div className="relative bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                {/* Image Display */}
                <div className="relative aspect-video flex items-center justify-center p-4">
                  <img
                    key={currentImageIndex}
                    src={`data:image/png;base64,${images[currentImageIndex]}`}
                    alt={`Chunk ${chunkIndex + 1} - Image ${currentImageIndex + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>

                {/* Navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-foreground" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-foreground" />
                    </button>

                    {/* Dots Indicator */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            idx === currentImageIndex 
                              ? 'bg-primary w-4' 
                              : 'bg-muted-foreground/50 hover:bg-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// import { useState } from 'react';
// import { X, ChevronLeft, ChevronRight, Image as ImageIcon, FileText } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Chunk, ParsedOriginalContent } from '@/types/chat';

// interface ChunkModalProps {
//   chunk: Chunk;
//   chunkIndex: number;
//   isOpen: boolean;
//   onClose: () => void;
// }

// export const ChunkModal = ({ chunk, chunkIndex, isOpen, onClose }: ChunkModalProps) => {
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);

//   const parseContent = (): ParsedOriginalContent => {
//     try {
//       return JSON.parse(chunk.metadata.original_content);
//     } catch {
//       return {
//         raw_text: chunk.page_content,
//         tables_html: [],
//         images_base64: [],
//       };
//     }
//   };

//   const content = parseContent();
//   const images = content.images_base64 || [];
//   const hasImages = images.length > 0;

//   const nextImage = () => {
//     setCurrentImageIndex((prev) => (prev + 1) % images.length);
//   };

//   const prevImage = () => {
//     setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
//   };

//   return (
//     <AnimatePresence>
//       {isOpen && (
//         <>
//           {/* Backdrop */}
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             onClick={onClose}
//             className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
//           />
          
//           {/* Modal */}
//           <motion.div
//             initial={{ opacity: 0, scale: 0.95, y: 20 }}
//             animate={{ opacity: 1, scale: 1, y: 0 }}
//             exit={{ opacity: 0, scale: 0.95, y: 20 }}
//             transition={{ type: 'spring', damping: 25, stiffness: 300 }}
//             className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] md:w-full md:max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-lg z-50 flex flex-col overflow-hidden"
//           >
//             {/* Header */}
//             <div className="flex items-center justify-between p-4 border-b border-border">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
//                   <FileText className="w-5 h-5 text-primary" />
//                 </div>
//                 <div>
//                   <h2 className="text-lg font-semibold text-foreground">
//                     Chunk {chunkIndex + 1}
//                   </h2>
//                   <p className="text-xs text-muted-foreground">
//                     {hasImages ? `Text + ${images.length} image${images.length > 1 ? 's' : ''}` : 'Text only'}
//                   </p>
//                 </div>
//               </div>
//               <motion.button
//                 whileHover={{ scale: 1.1 }}
//                 whileTap={{ scale: 0.9 }}
//                 onClick={onClose}
//                 className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
//               >
//                 <X className="w-5 h-5 text-muted-foreground" />
//               </motion.button>
//             </div>

//             {/* Content */}
//             <div className="flex-1 overflow-y-auto p-4 space-y-6">
//               {/* Text Content */}
//               <div>
//                 <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
//                   <FileText className="w-4 h-4" />
//                   Text Content
//                 </h3>
//                 <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
//                   <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
//                     {content.raw_text || chunk.page_content}
//                   </p>
//                 </div>
//               </div>

//               {/* Tables */}
//               {content.tables_html?.length > 0 && (
//                 <div>
//                   <h3 className="text-sm font-medium text-muted-foreground mb-3">
//                     Tables ({content.tables_html.length})
//                   </h3>
//                   {content.tables_html.map((tableHtml, idx) => (
//                     <div 
//                       key={idx}
//                       className="bg-muted/30 rounded-xl p-4 border border-border/50 overflow-x-auto mb-3"
//                       dangerouslySetInnerHTML={{ __html: tableHtml }}
//                     />
//                   ))}
//                 </div>
//               )}

//               {/* Images Carousel */}
//               {hasImages && (
//                 <div>
//                   <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
//                     <ImageIcon className="w-4 h-4" />
//                     Images ({images.length})
//                   </h3>
//                   <div className="relative bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
//                     {/* Image Display */}
//                     <div className="relative aspect-video flex items-center justify-center p-4">
//                       <motion.img
//                         key={currentImageIndex}
//                         initial={{ opacity: 0 }}
//                         animate={{ opacity: 1 }}
//                         transition={{ duration: 0.2 }}
//                         src={`data:image/png;base64,${images[currentImageIndex]}`}
//                         alt={`Chunk ${chunkIndex + 1} - Image ${currentImageIndex + 1}`}
//                         className="max-w-full max-h-full object-contain rounded-lg"
//                       />
//                     </div>

//                     {/* Navigation */}
//                     {images.length > 1 && (
//                       <>
//                         <motion.button
//                           whileHover={{ scale: 1.1 }}
//                           whileTap={{ scale: 0.9 }}
//                           onClick={prevImage}
//                           className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-muted transition-colors"
//                         >
//                           <ChevronLeft className="w-5 h-5 text-foreground" />
//                         </motion.button>
//                         <motion.button
//                           whileHover={{ scale: 1.1 }}
//                           whileTap={{ scale: 0.9 }}
//                           onClick={nextImage}
//                           className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-muted transition-colors"
//                         >
//                           <ChevronRight className="w-5 h-5 text-foreground" />
//                         </motion.button>

//                         {/* Dots Indicator */}
//                         <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border">
//                           {images.map((_, idx) => (
//                             <button
//                               key={idx}
//                               onClick={() => setCurrentImageIndex(idx)}
//                               className={`w-2 h-2 rounded-full transition-all duration-200 ${
//                                 idx === currentImageIndex 
//                                   ? 'bg-primary w-4' 
//                                   : 'bg-muted-foreground/50 hover:bg-muted-foreground'
//                               }`}
//                             />
//                           ))}
//                         </div>
//                       </>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </motion.div>
//         </>
//       )}
//     </AnimatePresence>
//   );
// };

// // import { useState } from 'react';
// // import { X, ChevronLeft, ChevronRight, Image as ImageIcon, FileText } from 'lucide-react';
// // import { motion, AnimatePresence } from 'framer-motion';
// // import { Chunk, ParsedOriginalContent } from '@/types/chat';

// // interface ChunkModalProps {
// //   chunk: Chunk;
// //   chunkIndex: number;
// //   isOpen: boolean;
// //   onClose: () => void;
// // }

// // export const ChunkModal = ({ chunk, chunkIndex, isOpen, onClose }: ChunkModalProps) => {
// //   const [currentImageIndex, setCurrentImageIndex] = useState(0);

// //   const parseContent = (): ParsedOriginalContent => {
// //     try {
// //       return JSON.parse(chunk.metadata.original_content);
// //     } catch {
// //       return {
// //         raw_text: chunk.page_content,
// //         tables_html: [],
// //         images_base64: [],
// //       };
// //     }
// //   };

// //   const content = parseContent();
// //   const images = content.images_base64 || [];
// //   const hasImages = images.length > 0;

// //   const nextImage = () => {
// //     setCurrentImageIndex((prev) => (prev + 1) % images.length);
// //   };

// //   const prevImage = () => {
// //     setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
// //   };

// //   return (
// //     <AnimatePresence>
// //       {isOpen && (
// //         <>
// //           {/* Backdrop */}
// //           <motion.div
// //             initial={{ opacity: 0 }}
// //             animate={{ opacity: 1 }}
// //             exit={{ opacity: 0 }}
// //             onClick={onClose}
// //             className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
// //           />
          
// //           {/* Modal */}
// //           <motion.div
// //             initial={{ opacity: 0, scale: 0.95 }}
// //             animate={{ opacity: 1, scale: 1 }}
// //             exit={{ opacity: 0, scale: 0.95 }}
// //             transition={{ type: 'spring', damping: 25, stiffness: 300 }}
// //             className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-3xl md:max-h-[85vh] bg-card border border-border rounded-2xl shadow-lg-dark z-50 flex flex-col overflow-hidden"
// //             // className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-lg-dark z-50 flex flex-col overflow-hidden"
// //           >
// //             {/* Header */}
// //             <div className="flex items-center justify-between p-4 border-b border-border">
// //               <div className="flex items-center gap-3">
// //                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
// //                   <FileText className="w-5 h-5 text-primary" />
// //                 </div>
// //                 <div>
// //                   <h2 className="text-lg font-semibold text-foreground">
// //                     Chunk {chunkIndex + 1}
// //                   </h2>
// //                   <p className="text-xs text-muted-foreground">
// //                     {hasImages ? `Text + ${images.length} image${images.length > 1 ? 's' : ''}` : 'Text only'}
// //                   </p>
// //                 </div>
// //               </div>
// //               <motion.button
// //                 whileHover={{ scale: 1.1 }}
// //                 whileTap={{ scale: 0.9 }}
// //                 onClick={onClose}
// //                 className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
// //               >
// //                 <X className="w-5 h-5 text-muted-foreground" />
// //               </motion.button>
// //             </div>

// //             {/* Content */}
// //             <div className="flex-1 overflow-y-auto p-4 space-y-6">
// //               {/* Text Content */}
// //               <div>
// //                 <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
// //                   <FileText className="w-4 h-4" />
// //                   Text Content
// //                 </h3>
// //                 <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
// //                   <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
// //                     {content.raw_text || chunk.page_content}
// //                   </p>
// //                 </div>
// //               </div>

// //               {/* Tables */}
// //               {content.tables_html?.length > 0 && (
// //                 <div>
// //                   <h3 className="text-sm font-medium text-muted-foreground mb-3">
// //                     Tables ({content.tables_html.length})
// //                   </h3>
// //                   {content.tables_html.map((tableHtml, idx) => (
// //                     <div 
// //                       key={idx}
// //                       className="bg-muted/30 rounded-xl p-4 border border-border/50 overflow-x-auto mb-3"
// //                       dangerouslySetInnerHTML={{ __html: tableHtml }}
// //                     />
// //                   ))}
// //                 </div>
// //               )}

// //               {/* Images Carousel */}
// //               {hasImages && (
// //                 <div>
// //                   <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
// //                     <ImageIcon className="w-4 h-4" />
// //                     Images ({images.length})
// //                   </h3>
// //                   <div className="relative bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
// //                     {/* Image Display */}
// //                     <div className="relative aspect-video flex items-center justify-center p-4">
// //                       <motion.img
// //                         key={currentImageIndex}
// //                         initial={{ opacity: 0 }}
// //                         animate={{ opacity: 1 }}
// //                         transition={{ duration: 0.2 }}
// //                         src={`data:image/png;base64,${images[currentImageIndex]}`}
// //                         alt={`Chunk ${chunkIndex + 1} - Image ${currentImageIndex + 1}`}
// //                         className="max-w-full max-h-full object-contain rounded-lg"
// //                       />
// //                     </div>

// //                     {/* Navigation */}
// //                     {images.length > 1 && (
// //                       <>
// //                         <motion.button
// //                           whileHover={{ scale: 1.1 }}
// //                           whileTap={{ scale: 0.9 }}
// //                           onClick={prevImage}
// //                           className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-muted transition-colors"
// //                         >
// //                           <ChevronLeft className="w-5 h-5 text-foreground" />
// //                         </motion.button>
// //                         <motion.button
// //                           whileHover={{ scale: 1.1 }}
// //                           whileTap={{ scale: 0.9 }}
// //                           onClick={nextImage}
// //                           className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-muted transition-colors"
// //                         >
// //                           <ChevronRight className="w-5 h-5 text-foreground" />
// //                         </motion.button>

// //                         {/* Dots Indicator */}
// //                         <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border">
// //                           {images.map((_, idx) => (
// //                             <button
// //                               key={idx}
// //                               onClick={() => setCurrentImageIndex(idx)}
// //                               className={`w-2 h-2 rounded-full transition-all duration-200 ${
// //                                 idx === currentImageIndex 
// //                                   ? 'bg-primary w-4' 
// //                                   : 'bg-muted-foreground/50 hover:bg-muted-foreground'
// //                               }`}
// //                             />
// //                           ))}
// //                         </div>
// //                       </>
// //                     )}
// //                   </div>
// //                 </div>
// //               )}
// //             </div>
// //           </motion.div>
// //         </>
// //       )}
// //     </AnimatePresence>
// //   );
// // };
