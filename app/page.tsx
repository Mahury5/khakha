"use client";

import { useState } from "react";
import { Shield, Crosshair, Timer, User, Lock, Power } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [dayTimer, setDayTimer] = useState(120);
  const [nightTimer, setNightTimer] = useState(60);
  const [isAutomated, setIsAutomated] = useState(true);
  
  // Role toggles
  const [roles, setRoles] = useState({
    sniper: true,
    diplomat: true, // You can rename this in the UI later based on your group's joke
    martyr: true,
    silencer: true,
    bomber: true,
  });

  const [isDeploying, setIsDeploying] = useState(false);

  const handleToggle = (role: keyof typeof roles) => {
    setRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createGame = async () => {
    if (!nickname) {
      alert("CALLSIGN REQUIRED.");
      return;
    }
    
    setIsDeploying(true);
    const roomCode = generateRoomCode();

    try {
      // 1. Create the Room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert([
          {
            room_code: roomCode,
            is_automated: isAutomated,
            day_timer_seconds: dayTimer,
            night_timer_seconds: nightTimer,
            role_config: roles,
            status: "lobby",
          },
        ])
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. Add the Host to the Players table
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .insert([
          {
            room_id: roomData.id,
            nickname: nickname,
          },
        ])
        .select()
        .single();

      if (playerError) throw playerError;

      // 3. Update the Room with the Host ID
      await supabase
        .from("rooms")
        .update({ host_id: playerData.id })
        .eq("id", roomData.id);

      // 4. Redirect to the Waiting Room (We will build this next)
      window.location.href = `/room/${roomCode}?playerId=${playerData.id}`;
      
    } catch (error) {
      console.error("Failed to initialize operation:", error);
      alert("SYSTEM FAILURE. TRY AGAIN.");
      setIsDeploying(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-cyan-900">
      <div className="max-w-md mx-auto p-6 pt-12 space-y-8">
        
        {/* Header */}
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
            Operation <span className="text-cyan-500">Nightfall</span>
          </h1>
          <p className="font-mono text-xs text-zinc-500 mt-2">SECURE LOBBY CONFIGURATION</p>
        </header>

        {/* User Input */}
        <section className="space-y-4">
          <label className="flex items-center space-x-2 text-sm font-bold text-zinc-400 uppercase tracking-wider">
            <User size={16} className="text-cyan-500" />
            <span>Callsign (Nickname)</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="ENTER ALIAS..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-4 text-white font-mono placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
        </section>

        {/* Phase Timers */}
        <section className="space-y-4 bg-zinc-900/50 border border-zinc-800/50 p-4 rounded">
          <label className="flex items-center space-x-2 text-sm font-bold text-zinc-400 uppercase tracking-wider">
            <Timer size={16} className="text-cyan-500" />
            <span>Phase Timers (Seconds)</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-zinc-500 font-mono">DAY PHASE</span>
              <input
                type="number"
                value={dayTimer}
                onChange={(e) => setDayTimer(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono text-center mt-1 focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-mono">NIGHT PHASE</span>
              <input
                type="number"
                value={nightTimer}
                onChange={(e) => setNightTimer(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono text-center mt-1 focus:border-cyan-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Role Selection */}
        <section className="space-y-4">
          <label className="flex items-center space-x-2 text-sm font-bold text-zinc-400 uppercase tracking-wider">
            <Shield size={16} className="text-cyan-500" />
            <span>Role Deployment</span>
          </label>
          
          <div className="space-y-2 font-mono text-sm">
            {/* Mandatory Role */}
            <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded opacity-75">
              <span className="text-white">Investigator (المحقق)</span>
              <div className="flex items-center space-x-2 text-cyan-500">
                <Lock size={14} />
                <span className="text-xs font-bold">LOCKED ON</span>
              </div>
            </div>

            {/* Optional Roles */}
            {Object.entries(roles).map(([role, isEnabled]) => (
              <button
                key={role}
                onClick={() => handleToggle(role as keyof typeof roles)}
                className={`w-full flex items-center justify-between p-3 border rounded transition-all duration-200 ${
                  isEnabled 
                    ? "bg-zinc-800/80 border-cyan-500/50 text-white" 
                    : "bg-zinc-900 border-zinc-800 text-zinc-600"
                }`}
              >
                <span className="capitalize">{role.replace("diplomat", "Diplomat (القحبة)")}</span>
                <div className={`w-3 h-3 rounded-full ${isEnabled ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-zinc-700"}`} />
              </button>
            ))}
          </div>
        </section>

        {/* Submit Button */}
        <button
          onClick={createGame}
          disabled={isDeploying}
          className="w-full py-4 mt-8 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black uppercase tracking-widest rounded transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {isDeploying ? (
            <span className="animate-pulse">INITIALIZING...</span>
          ) : (
            <>
              <Power size={18} />
              <span>Deploy Lobby</span>
            </>
          )}
        </button>

      </div>
    </main>
  );
}