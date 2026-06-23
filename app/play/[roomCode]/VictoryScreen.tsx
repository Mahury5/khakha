"use client";

import { motion } from "framer-motion";
import { Crown, Skull, Shield, RotateCcw } from "lucide-react";

type Player = {
  id: string;
  nickname: string;
  role: string;
  is_alive: boolean;
};

interface VictoryScreenProps {
  winningTeam: "mafia" | "citizens";
  players: Player[];
  onRestart: () => void;
}

export function VictoryScreen({ winningTeam, players, onRestart }: VictoryScreenProps) {
  const isMafiaWin = winningTeam === "mafia";

  // Theme configuration based on the winner
  const theme = isMafiaWin
    ? {
        bg: "from-red-950 via-stone-950 to-black",
        accent: "text-red-600",
        border: "border-red-900/50",
        title: "La Cosa Nostra Prevails",
        subtitle: "The city belongs to the syndicate.",
        icon: <Crown className="w-12 h-12 text-red-700 mb-4 mx-auto" />,
      }
    : {
        bg: "from-stone-800 via-stone-950 to-black",
        accent: "text-amber-500",
        border: "border-amber-700/50",
        title: "The City Survives",
        subtitle: "The syndicate has been eradicated.",
        icon: <Shield className="w-12 h-12 text-amber-500 mb-4 mx-auto" />,
      };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${theme.bg}`}
    >
      {/* Cinematic Header */}
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
        >
          {theme.icon}
          <h1 className={`font-serif text-4xl md:text-6xl font-black tracking-widest uppercase ${theme.accent} drop-shadow-lg`}>
            {theme.title}
          </h1>
          <p className="mt-4 font-mono text-stone-400 uppercase tracking-widest text-sm">
            {theme.subtitle}
          </p>
        </motion.div>
      </div>

      {/* The Post-Mortem Reveal Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className={`w-full max-w-lg bg-stone-950/80 backdrop-blur-md border-2 ${theme.border} rounded-xl p-6 shadow-2xl`}
      >
        <h3 className="text-center font-mono text-xs text-stone-500 uppercase tracking-widest mb-6 pb-4 border-b border-stone-800/50">
          Final Operative Status
        </h3>

        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {players.map((player) => (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-3 rounded bg-stone-900/50 border ${
                player.is_alive ? "border-stone-800" : "border-stone-900 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                {!player.is_alive && <Skull size={16} className="text-red-900" />}
                <span className={`font-serif text-lg ${player.is_alive ? "text-stone-200" : "text-stone-600 line-through decoration-red-900/50"}`}>
                  {player.nickname}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono tracking-wider uppercase px-2 py-1 rounded ${
                  ["mafia", "silencer", "bomber"].includes(player.role) 
                    ? "bg-red-950/30 text-red-500" 
                    : "bg-stone-800 text-stone-400"
                }`}>
                  {player.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Return Action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="mt-10"
      >
        <button 
          onClick={onRestart}
          className={`flex items-center gap-2 px-8 py-4 bg-transparent border-2 ${theme.border} ${theme.accent} hover:bg-stone-900 transition-colors rounded uppercase font-black tracking-widest text-sm`}
        >
          <RotateCcw size={18} />
          Return to Lobby
        </button>
      </motion.div>
    </motion.div>
  );
}