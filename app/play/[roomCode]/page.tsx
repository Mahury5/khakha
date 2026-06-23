"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { NightPhase } from "./NightPhase";
import { DayPhase } from "./DayPhase";
import { CardReveal } from "./CardReveal";
import { VictoryScreen } from "./VictoryScreen";
import { resetGameSession } from "@/actions/gameActions";

type PlayerState = { id: string; nickname: string; role: string; is_alive: boolean; is_muted: boolean };
type RoomState = { id: string; host_id: string; status: string; current_round: number };

export default function PlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomCode = params.roomCode as string;
  const playerId = searchParams.get("playerId");

  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerState[]>([]);
  const [loading, setLoading] = useState(true);

  // The restart handler
  const handleRestart = async () => {
    // Only let the Host trigger the reset to prevent chaos
    if (player?.id !== room?.host_id) {
      alert("Only the Host can initialize a new operation.");
      return;
    }

    if (!room?.id) return;
    
    const result = await resetGameSession(room.id);
    
    if (!result.success) {
      alert("SYSTEM FAILURE: Could not reset the lobby.");
    }
  };
  // Initial Fetch & Realtime Subscription
  useEffect(() => {
    if (!playerId) return;

    const fetchGameState = async () => {
      // Get the Room State
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("id, host_id, status, current_round") // <-- Added host_id here
        .eq("room_code", roomCode)
        .single();
      
      if (roomData) setRoom(roomData);

      // Get All Players
      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomData?.id);

      if (playersData) {
        setAllPlayers(playersData);
        setPlayer(playersData.find(p => p.id === playerId) || null);
      }
      setLoading(false);

      // Listen for Room Status Changes (Day -> Night -> Day)
      const roomSub = supabase
        .channel('room-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomData?.id}` }, (payload) => {
          setRoom(payload.new as RoomState);
        })
        .subscribe();

      // Listen for Player Changes (Deaths, Mutes)
      const playerSub = supabase
        .channel('player-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_id=eq.${roomData?.id}` }, (payload) => {
          setAllPlayers(current => current.map(p => p.id === payload.new.id ? payload.new as PlayerState : p));
          if (payload.new.id === playerId) setPlayer(payload.new as PlayerState);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(roomSub);
        supabase.removeChannel(playerSub);
      };
    };

    fetchGameState();
  }, [roomCode, playerId]);

  if (loading) return <div className="min-h-screen bg-stone-950 animate-pulse text-amber-600 font-serif flex items-center justify-center">Loading Table...</div>;

  // The Game State Machine
  return (
    <main className="min-h-screen bg-stone-950 text-stone-200">
      {/* 1. NEW ADDITION: Handle the auto-redirect when the game is reset */}
      {room?.status === "lobby" && (
        <div className="flex h-screen items-center justify-center font-mono text-amber-500 animate-pulse">
          Re-establishing secure lobby...
          {setTimeout(() => {
            window.location.href = `/room/${roomCode}?playerId=${playerId}`;
          }, 1000) && ""}
        </div>
      )}

      {/* 2. Your existing perfectly fine layout below */}
      {room?.status === "reveal" && player && <CardReveal player={player} roomCode={roomCode} />}
      {room?.status === "night" && <NightPhase player={player} allPlayers={allPlayers} roomId={room?.id} currentRound={room?.current_round} />}
      {room?.status === "day" && <DayPhase player={player} allPlayers={allPlayers} roomId={room?.id} />}
      {room?.status === "mafia_win" && <VictoryScreen winningTeam="mafia" players={allPlayers} onRestart={handleRestart} />}
      {room?.status === "citizens_win" && <VictoryScreen winningTeam="citizens" players={allPlayers} onRestart={handleRestart} />}
    </main>
  );
}