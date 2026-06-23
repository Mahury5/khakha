// src/app/play/[roomCode]/NightPhase.tsx
import { useState } from "react";
import { Crosshair, Skull, Search, VolumeX } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function NightPhase({ player, allPlayers, roomId, currentRound }: any) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [actionSubmitted, setActionSubmitted] = useState(false);

  const livingPlayers = allPlayers.filter((p: any) => p.is_alive && p.id !== player.id);

  // Submit action to the queue
  const submitAction = async (actionType: string) => {
    if (!selectedTarget) return;

    await supabase.from("night_actions").insert([{
      room_id: roomId,
      round_number: currentRound,
      actor_id: player.id,
      target_id: selectedTarget,
      action_type: actionType
    }]);

    setActionSubmitted(true);
  };

  // 1. The Citizen View (No Actions)
  if (player.role === "villager" || !player.is_alive) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black">
        <h1 className="font-serif text-3xl text-stone-600 tracking-widest uppercase">The City Sleeps</h1>
        <p className="text-stone-700 font-mono mt-4 animate-pulse">Awaiting dawn...</p>
      </div>
    );
  }

  // 2. Action Role Views (Sniper, Mafia, Investigator, Silencer)
  return (
    <div className="flex flex-col h-screen p-6">
      <header className="text-center mb-8 border-b border-stone-800 pb-4">
        <h1 className="font-serif text-2xl text-amber-600 tracking-widest uppercase">Night Operations</h1>
        <p className="font-mono text-xs text-stone-500">Select your target carefully.</p>
      </header>

      {actionSubmitted ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-amber-600 font-serif text-xl">Action Confirmed</p>
          <p className="text-stone-500 font-mono text-sm mt-2">Awaiting other operators...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {livingPlayers.map((target: any) => (
            <button
              key={target.id}
              onClick={() => setSelectedTarget(target.id)}
              className={`w-full p-4 rounded-lg flex items-center justify-between border-2 transition-all ${
                selectedTarget === target.id 
                  ? "border-amber-600 bg-amber-950/20" 
                  : "border-stone-800 bg-stone-900"
              }`}
            >
              <span className="font-mono text-lg">{target.nickname}</span>
              {selectedTarget === target.id && getRoleIcon(player.role)}
            </button>
          ))}
        </div>
      )}

      {/* Action Button at Bottom */}
      {!actionSubmitted && (
        <button
          onClick={() => submitAction(getActionType(player.role))}
          disabled={!selectedTarget}
          className="w-full py-5 mt-6 bg-amber-700 disabled:bg-stone-800 text-stone-900 font-black uppercase tracking-widest rounded-lg transition-all"
        >
          Execute Order
        </button>
      )}
    </div>
  );
}

// Helper functions for UI polish
function getRoleIcon(role: string) {
  switch (role) {
    case "sniper": return <Crosshair className="text-stone-400" />;
    case "mafia": return <Skull className="text-red-600" />;
    case "investigator": return <Search className="text-blue-500" />;
    case "silencer": return <VolumeX className="text-red-600" />;
    default: return null;
  }
}

function getActionType(role: string) {
  switch (role) {
    case "sniper": return "sniper_shoot";
    case "mafia": return "mafia_kill";
    case "investigator": return "investigate";
    case "silencer": return "silence";
    default: return "none";
  }
}