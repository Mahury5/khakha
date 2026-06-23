"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, HelpCircle, Spade, Heart, Clover, Diamond } from "lucide-react";

type PlayerState = { id: string; nickname: string; role: string };

// 1. We define the properties this component expects to receive from the main page
interface CardRevealProps {
  player: PlayerState;
  roomCode: string;
}

// 2. Rename the function to CardReveal and pass in the props
export function CardReveal({ player, roomCode }: CardRevealProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Helper function to format the role display nicely
  const getRoleDetails = (role: string) => {
    switch (role?.toLowerCase()) {
      case "mafia":
        return { name: "الـمـافـيـا (Mafia)", alignment: "Evil", desc: "Eliminate all citizens without blowing your cover.", color: "text-red-600 border-red-900/50 bg-red-950/20" };
      case "investigator":
        return { name: "الـمـحـقـق (Investigator)", alignment: "Good", desc: "Investigate one identity each night phase to uncover hidden threats.", color: "text-amber-500 border-amber-700/50 bg-amber-950/10" };
      case "sniper":
        return { name: "الـقـنـاص (Sniper)", alignment: "Good", desc: "You carry a single silver bullet. Fire it wisely on any night you choose.", color: "text-zinc-300 border-zinc-700/50 bg-zinc-900/40" };
      case "diplomat":
        return { name: "الـقـحـبـة", alignment: "Good", desc: "Double your voting weight for one critical round to shift the dynamic.", color: "text-amber-500 border-amber-700/50 bg-amber-950/10" };
      case "silencer":
        return { name: "الـمُـسـكـت (Silencer)", alignment: "Evil", desc: "Choose one target each night to strip of their voice for the entire next day.", color: "text-red-600 border-red-900/50 bg-red-950/20" };
      case "martyr":
        return { name: "الـشـهـيـد (Martyr)", alignment: "Good", desc: "If the council votes you out, you drag an executioner down into the grave with you.", color: "text-yellow-600 border-yellow-900/50 bg-yellow-950/10" };
      case "bomber":
        return { name: "الـمـفـجـر (The Bomber)", alignment: "Evil", desc: "If you are exposed and lynched, you detonate and take down one target with you.", color: "text-red-700 border-red-950 bg-red-950/30" };
      default:
        return { name: "مـواطـن (Citizen)", alignment: "Good", desc: "Use logic, discussion, and intuition to spot the liars among you.", color: "text-stone-400 border-stone-800 bg-stone-900/20" };
    }
  };

  const cardInfo = getRoleDetails(player?.role || "villager");

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 text-stone-200 flex flex-col items-center justify-center p-6 selection:bg-red-950">
      <div className="w-full max-w-sm flex flex-col items-center space-y-8">
        
        {/* Top bar styling */}
        <div className="text-center space-y-1">
          <h2 className="font-serif text-xl font-bold tracking-widest text-amber-500 uppercase">La Cosa Nostra</h2>
          <p className="text-xs text-stone-500 uppercase tracking-widest font-mono">Operator: {player?.nickname}</p>
        </div>

        {/* 3D Interactive Flipping Card container */}
        <div 
          className="w-72 h-96 relative cursor-pointer [perspective:1000px] group"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <motion.div
            className="w-full h-full relative [transform-style:preserve-3d] transition-all duration-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-amber-600/20"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
          >
            {/* CARD BACK SIDE */}
            <div className="absolute inset-0 w-full h-full rounded-2xl p-4 bg-gradient-to-br from-red-950 via-stone-900 to-red-950 border-4 border-amber-600/40 flex flex-col justify-between [backface-visibility:hidden]">
              <div className="flex justify-between text-amber-600/30 text-sm"><Spade size={16} /><Heart size={16} /></div>
              
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-600/20 flex items-center justify-center text-amber-500/30">
                  <Eye size={28} className="animate-pulse" />
                </div>
                <span className="font-serif text-xs uppercase tracking-[0.25em] text-amber-600/50">Tap to peek role</span>
              </div>

              <div className="flex justify-between text-amber-600/30 text-sm rotate-180"><Diamond size={16} /><Clover size={16} /></div>
            </div>

            {/* CARD FRONT SIDE (Revealed state) */}
            <div 
              className={`absolute inset-0 w-full h-full rounded-2xl p-6 border-4 border-amber-500/50 flex flex-col justify-between bg-stone-900 [backface-visibility:hidden] [transform:rotateY(180deg)] ${cardInfo.color}`}
            >
              <div className="flex justify-between items-center text-xs font-mono tracking-widest uppercase opacity-60">
                <span>ROOM: {roomCode}</span>
                <span>{cardInfo.alignment}</span>
              </div>

              <div className="text-center space-y-4 my-auto">
                <div className="font-serif text-3xl font-black tracking-tight text-white leading-tight">
                  {cardInfo.name}
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30" />
                <p className="text-sm leading-relaxed text-stone-300 font-sans italic opacity-90 px-2">
                  "{cardInfo.desc}"
                </p>
              </div>

              <div className="text-center text-[10px] font-mono uppercase tracking-widest opacity-40">
                Tap to hide identity
              </div>
            </div>
          </motion.div>
        </div>

        {/* Action instruction text underneath card */}
        <div className="text-center max-w-[240px]">
          <p className="text-xs text-stone-400 leading-relaxed font-sans flex items-center justify-center gap-1.5">
            <HelpCircle size={14} className="text-amber-500 shrink-0" />
            Keep your screen hidden. Tap the card deck to reveal your operational directives.
          </p>
        </div>

      </div>
    </div>
  );
}