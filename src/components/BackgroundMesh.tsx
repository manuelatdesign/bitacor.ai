import { motion } from "motion/react";

interface BackgroundMeshProps {
  isDarkMode: boolean;
}

export default function BackgroundMesh({ isDarkMode }: BackgroundMeshProps) {
  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 transition-colors duration-500 ${isDarkMode ? "bg-[#0f172a]" : "bg-[#fff7fe]"}`}>
      {/* Soft ambient drifting mesh gradient blobs from design.md */}
      {/* Mesh blue: #9ed4ef (Light Mode) / deep teal: #115e59 (Dark Mode) */}
      <motion.div 
        animate={{
          x: [0, 40, -20, 0],
          y: [0, 60, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`absolute top-[-10%] left-[-5%] w-[45rem] h-[45rem] rounded-full blur-[100px] pointer-events-none transition-colors duration-500 ${
          isDarkMode ? "bg-[#115e59]/35" : "bg-[#9ed4ef]/40"
        }`} 
      />

      {/* Mesh purple (Periwinkle): #b8caf5 (Light Mode) / deep indigo: #0f172a (Dark Mode) */}
      <motion.div 
        animate={{
          x: [0, -50, 30, 0],
          y: [0, -30, 50, 0],
          scale: [1.05, 0.95, 1.1, 1.05],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`absolute top-[30%] right-[-10%] w-[50rem] h-[50rem] rounded-full blur-[120px] pointer-events-none transition-colors duration-500 ${
          isDarkMode ? "bg-[#0f172a]/60" : "bg-[#b8caf5]/50"
        }`} 
      />

      {/* Mesh pink (Rose Clay): #ed93af (Light Mode) / muted rose dark: #831843 (Dark Mode) */}
      <motion.div 
        animate={{
          x: [0, 30, -30, 0],
          y: [0, -40, -20, 0],
          scale: [0.95, 1.05, 0.98, 0.95],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`absolute bottom-[-10%] left-[15%] w-[48rem] h-[48rem] rounded-full blur-[110px] pointer-events-none transition-colors duration-500 ${
          isDarkMode ? "bg-[#831843]/35" : "bg-[#ed93af]/40"
        }`} 
      />

      {/* Light glow effects */}
      <div className={`absolute top-[20%] left-[30%] w-[25rem] h-[25rem] rounded-full blur-[140px] pointer-events-none transition-colors duration-500 ${
        isDarkMode ? "bg-[#115e59]/10" : "bg-[#240046]/5"
      }`} />
    </div>
  );
}
