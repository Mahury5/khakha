// src/app/play/[roomCode]/DayPhase.tsx
import { useState } from "react";
import { Skull, AlertTriangle, ShieldOff } from "lucide-react";

export function DayPhase({ player, allPlayers, roomId }: any) {
  const [votedFor, setVotedFor] = useState<string | null>(null);

  const livingPlayers = allPlayers.filter((p: any) => p.is_alive);
  const deadPlayers = allPlayers.filter((p: any) => !p.is_alive);

  return (
    <div className="flex flex-col h-screen p-6 bg-gradient-to-b from-stone-900 to-stone-950">
      
      {/* 1. Death Toll Header */}
      <header className="mb-6 space-y-2">
        <h1 className="font-serif text-3xl text-red-700 tracking-widest uppercase">The Council</h1>
        {player.is_muted && (
          <div className="bg-red-950/50 border border-red-900 p-2 rounded flex items-center gap-2 text-red-500 font-mono text-sm">
            <ShieldOff size={16} /> YOU HAVE BEEN SILENCED. NO SPEAKING.
          </div>
        )}
      </header>

      {/* 2. The Graveyard (Who died last night) */}
      <section className="mb-8">
        <p className="text-xs font-mono text-stone-500 mb-2 uppercase">Casualties</p>
        <div className="flex flex-wrap gap-2">
          {deadPlayers.map((p: any) => (
            <span key={p.id} className="text-stone-400 bg-stone-900 px-3 py-1 rounded border border-stone-800 flex items-center gap-2 text-sm line-through decoration-red-600">
              <Skull size={14} className="text-stone-600" /> {p.nickname}
            </span>
          ))}
        </div>
      </section>

      {/* 3. The Voting Table */}
      <section className="flex-1 overflow-y-auto">
        <p className="text-xs font-mono text-amber-600 mb-2 uppercase">Cast Your Vote</p>
        <div className="space-y-3">
          {livingPlayers.map((target: any) => (
            <button
              key={target.id}
              onClick={() => setVotedFor(target.id)}
              disabled={!player.is_alive || votedFor !== null}
              className={`w-full p-4 rounded border transition-all flex justify-between items-center ${
                votedFor === target.id
                  ? "bg-amber-900/30 border-amber-600"
                  : "bg-stone-900 border-stone-800"
              } ${!player.is_alive && "opacity-50"}`}
            >
              <span className="font-serif text-lg">{target.nickname}</span>
              {/* Here we would map real-time vote counts */}
              <div className="w-6 h-6 rounded-full bg-stone-800 text-xs flex items-center justify-center font-mono">
                {/* Vote Count Variable */} 0 
              </div>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}