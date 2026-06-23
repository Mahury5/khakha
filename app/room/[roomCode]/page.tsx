"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Users, Copy, Check, Play, UserPlus, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
// At the top of your file
import { startGameAndAssignRoles } from "@/actions/gameActions";

// Defining the structures for our database rows
type Player = { id: string; nickname: string; is_alive: boolean };
type Room = { id: string; host_id: string; status: string; role_config: any };

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomCode = params.roomCode as string;
  const urlPlayerId = searchParams.get("playerId");

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(urlPlayerId);
  const [joinNickname, setJoinNickname] = useState("");
  
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Room Data and setup Realtime listeners
  useEffect(() => {
    let roomSubscription: any;
    let playerSubscription: any;

    const fetchGameData = async () => {
      // Fetch Room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();

      if (roomError || !roomData) {
        alert("ROOM NOT FOUND. TERMINATING.");
        return;
      }
      setRoom(roomData);

      // Fetch Players in this Room
      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomData.id);
      
      if (playersData) setPlayers(playersData);
      setIsLoading(false);

      // Setup Realtime Listener for New Players Joining
      playerSubscription = supabase
        .channel("public:players")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "players", filter: `room_id=eq.${roomData.id}` },
          (payload) => {
            setPlayers((current) => [...current, payload.new as Player]);
          }
        )
        .subscribe();

      // Setup Realtime Listener for Room Status (when host starts the game)
      roomSubscription = supabase
        .channel("public:rooms")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomData.id}` },
          (payload) => {
            if (payload.new.status === "reveal") {
              // The host clicked start! Send everyone to the game page
              window.location.href = `/play/${roomCode}?playerId=${currentPlayerId}`;
            }
          }
        )
        .subscribe();
    };

    fetchGameData();

    return () => {
      if (playerSubscription) supabase.removeChannel(playerSubscription);
      if (roomSubscription) supabase.removeChannel(roomSubscription);
    };
  }, [roomCode, currentPlayerId]);

  // 2. Function for a friend to join the room
  const joinRoom = async () => {
    if (!joinNickname || !room) return;
    
    const { data: newPlayer, error } = await supabase
      .from("players")
      .insert([{ room_id: room.id, nickname: joinNickname }])
      .select()
      .single();

    if (!error && newPlayer) {
      setCurrentPlayerId(newPlayer.id);
      // Update URL so they don't lose session if they refresh
      window.history.pushState(null, "", `/room/${roomCode}?playerId=${newPlayer.id}`);
    }
  };

  // 3. Function for the Host to start the game
  const startGame = async () => {
    if (!room) return;
    
    // Call the secure server action
    const result = await startGameAndAssignRoles(room.id);

    if (!result.success) {
      alert("CRITICAL ERROR ASSIGNING ROLES. ABORT.");
    }
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-zinc-950 text-cyan-500 flex items-center justify-center font-mono animate-pulse">ESTABLISHING SECURE CONNECTION...</div>;
  }

  const isHost = room?.host_id === currentPlayerId;

  // --- VIEW 1: JOIN SCREEN (If the user hasn't entered a nickname yet) ---
  if (!currentPlayerId) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-300 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <ShieldAlert size={48} className="text-cyan-500 mx-auto" />
            <h1 className="text-2xl font-black text-white uppercase tracking-widest">Join Operation</h1>
            <p className="font-mono text-zinc-500 text-sm">ROOM CODE: {roomCode}</p>
          </div>
          
          <input
            type="text"
            value={joinNickname}
            onChange={(e) => setJoinNickname(e.target.value)}
            placeholder="ENTER CALLSIGN..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-4 text-white font-mono text-center uppercase placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500"
          />
          
          <button
            onClick={joinRoom}
            className="w-full py-4 bg-cyan-500 text-zinc-950 font-black uppercase tracking-widest rounded flex items-center justify-center space-x-2"
          >
            <UserPlus size={18} />
            <span>Infiltrate</span>
          </button>
        </div>
      </main>
    );
  }

  // --- VIEW 2: THE WAITING LOBBY (They are in the room) ---
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-300 font-sans p-6">
      <div className="max-w-md mx-auto space-y-8 pt-6">
        
        {/* Header & Code */}
        <header className="text-center space-y-4">
          <h1 className="text-xl font-bold text-zinc-500 uppercase tracking-widest">Awaiting Deployment</h1>
          <div 
            onClick={copyRoomLink}
            className="bg-zinc-900 border border-zinc-800 p-4 rounded cursor-pointer hover:border-cyan-500 transition-colors flex items-center justify-between group"
          >
            <div className="text-left">
              <span className="text-xs text-zinc-500 font-mono block">INVITE CODE</span>
              <span className="text-3xl font-black text-white tracking-[0.2em]">{roomCode}</span>
            </div>
            {isCopied ? <Check className="text-green-500" /> : <Copy className="text-zinc-600 group-hover:text-cyan-500" />}
          </div>
        </header>

        {/* Player Roster */}
        <section className="space-y-4 border-t border-b border-zinc-800 py-6">
          <div className="flex items-center justify-between text-sm font-bold text-zinc-400 uppercase tracking-wider">
            <div className="flex items-center space-x-2">
              <Users size={16} className="text-cyan-500" />
              <span>Squad Roster</span>
            </div>
            <span className="font-mono bg-zinc-900 px-2 py-1 rounded">{players.length} Operators</span>
          </div>

          <ul className="space-y-2">
            {players.map((player) => (
              <li key={player.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded font-mono text-sm flex items-center justify-between">
                <span className="text-white uppercase">{player.nickname}</span>
                {player.id === room?.host_id && (
                  <span className="text-xs text-cyan-500 bg-cyan-950/30 px-2 py-1 rounded">HOST</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Host Control: Start Button */}
        {isHost ? (
          <div className="space-y-2">
            <button
              onClick={startGame}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black uppercase tracking-widest rounded flex items-center justify-center space-x-2 transition-colors"
            >
              <Play size={18} fill="currentColor" />
              <span>Begin Operation</span>
            </button>
            {players.length < 5 && (
              <p className="text-center text-xs text-amber-500 font-mono uppercase">
                Warning: Tactical layout optimal for 5+ operators.
              </p>
            )}
          </div>
        ) : (
          <div className="py-4 border border-zinc-800 bg-zinc-900/30 rounded flex items-center justify-center animate-pulse">
            <span className="font-mono text-sm text-zinc-500">WAITING FOR HOST TO INITIATE...</span>
          </div>
        )}

      </div>
    </main>
  );
}