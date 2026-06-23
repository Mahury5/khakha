// src/actions/gameActions.ts
"use server";

import { supabase } from "@/lib/supabase";

// The classic Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export async function startGameAndAssignRoles(roomId: string) {
  try {
    // 1. Fetch Room Settings and Players
    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .select("role_config")
      .eq("id", roomId)
      .single();

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", roomId);

    if (roomError || playersError || !playersData || !roomData) {
      throw new Error("Data retrieval failed.");
    }

    const playerCount = playersData.length;
    let rolePool: string[] = [];
    const config = roomData.role_config;

    // 2. Build the Role Pool based on Config
    
    // Investigator is mandatory per your rules
    rolePool.push("investigator");

    // We only add optional roles if they are enabled AND we have enough players
    if (config.sniper) rolePool.push("sniper");
    if (config.diplomat) rolePool.push("diplomat");
    if (config.martyr) rolePool.push("martyr");
    if (config.silencer) rolePool.push("silencer");
    if (config.bomber) rolePool.push("bomber");

    // Determine how many Mafia members we need. 
    // Standard rule of thumb: ~25-30% of the players should be Mafia.
    const desiredMafiaCount = Math.max(1, Math.floor(playerCount / 3));
    
    // We already added 'silencer' and 'bomber' (if enabled). They count as Mafia.
    let currentMafiaCount = 0;
    if (config.silencer) currentMafiaCount++;
    if (config.bomber) currentMafiaCount++;

    // Add standard 'mafia' roles if we still need more bad guys
    while (currentMafiaCount < desiredMafiaCount && rolePool.length < playerCount) {
      rolePool.push("mafia");
      currentMafiaCount++;
    }

    // 3. Fill the rest of the pool with Villagers/Citizens
    while (rolePool.length < playerCount) {
      rolePool.push("villager");
    }

    // Edge case: If somehow the config had more roles enabled than players (e.g., 5 roles, but only 4 players)
    // We trim the array to match player count, ensuring Investigator is kept.
    if (rolePool.length > playerCount) {
        rolePool = ["investigator", ...shuffleArray(rolePool.slice(1))].slice(0, playerCount);
    }

    // 4. SHUFFLE THE DECK
    const shuffledRoles = shuffleArray(rolePool);

    // 5. Assign roles to players in the database
    // We use Promise.all to update all players simultaneously
    const updatePromises = playersData.map((player, index) => {
      const assignedRole = shuffledRoles[index];
      
      // If they get Sniper, give them 1 shot in their stats
      const shotsRemaining = assignedRole === "sniper" ? 1 : 0;

      return supabase
        .from("players")
        .update({ role: assignedRole, shots_remaining: shotsRemaining })
        .eq("id", player.id);
    });

    await Promise.all(updatePromises);

    // 6. Flip the Room Status to trigger the UI reveal
    await supabase
      .from("rooms")
      .update({ status: "reveal" })
      .eq("id", roomId);

    return { success: true };

  } catch (error) {
    console.error("Game Initialization Error:", error);
    return { success: false, error };
  }
}

export async function resolveNightPhase(roomId: string, currentRound: number) {
  try {
    // 1. Fetch all secret actions submitted during this specific night round
    const { data: actions, error: actionsError } = await supabase
      .from("night_actions")
      .select("*")
      .eq("room_id", roomId)
      .eq("round_number", currentRound);

    if (actionsError) throw actionsError;

    // Initialize tracking arrays for our state changes
    const targetsToKill = new Set<string>();
    let silencedPlayerId: string | null = null;

    // 2. Process Mafia Votes (Consensus or majority rule)
    const mafiaVotes = actions?.filter(a => a.action_type === "mafia_kill") || [];
    if (mafiaVotes.length > 0) {
      // Count votes per target
      const voteCounts: Record<string, number> = {};
      mafiaVotes.forEach(vote => {
        voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + 1;
      });

      // Find the target with the highest amount of votes
      const topMafiaTarget = Object.keys(voteCounts).reduce((a, b) => 
        voteCounts[a] > voteCounts[b] ? a : b
      );
      targetsToKill.add(topMafiaTarget);
    }

    // 3. Process Sniper Shots
    const sniperShot = actions?.find(a => a.action_type === "sniper_shoot");
    if (sniperShot) {
      targetsToKill.add(sniperShot.target_id);
    }

    // 4. Process Silencer Actions
    const silenceAction = actions?.find(a => a.action_type === "silence");
    if (silenceAction) {
      silencedPlayerId = silenceAction.target_id;
    }

    // 5. Database Transaction execution via Promise.all
    const databaseUpdates = [];

    // Reset everyone's muted status first, then apply the new mute if exists
    databaseUpdates.push(
      supabase
        .from("players")
        .update({ is_muted: false })
        .eq("room_id", roomId)
    );

    if (silencedPlayerId) {
      databaseUpdates.push(
        supabase
          .from("players")
          .update({ is_muted: true })
          .eq("id", silencedPlayerId)
      );
    }

    // Apply deaths to players table
    if (targetsToKill.size > 0) {
      databaseUpdates.push(
        supabase
          .from("players")
          .update({ is_alive: false })
          .in("id", Array.from(targetsToKill))
      );
    }

    // Advance the room state to 'day'
    databaseUpdates.push(
      supabase
        .from("rooms")
        .update({ status: "day" })
        .eq("id", roomId)
    );

    await Promise.all(databaseUpdates);

    return { success: true, casualtiesCount: targetsToKill.size };

  } catch (error) {
    console.error("Critical error resolving night phase:", error);
    return { success: false, error };
  }
}

// Add this to src/actions/gameActions.ts

// Helper function to check if the game has ended
async function checkWinCondition(roomId: string) {
  const { data: players } = await supabase
    .from("players")
    .select("role, is_alive")
    .eq("room_id", roomId);

  if (!players) return null;

  const livingPlayers = players.filter(p => p.is_alive);
  
  // Define what counts as "Mafia"
  const evilRoles = ["mafia", "silencer", "bomber"];
  
  const mafiaCount = livingPlayers.filter(p => evilRoles.includes(p.role)).length;
  const citizenCount = livingPlayers.length - mafiaCount;

  if (mafiaCount === 0) {
    return "citizens_win";
  } else if (mafiaCount >= citizenCount) {
    return "mafia_win";
  }

  return null; // Game continues
}

// Add this to src/actions/gameActions.ts

export async function executeLynchAndAdvance(roomId: string, lynchedPlayerId: string | null) {
  try {
    const databaseUpdates = [];

    // 1. If the town agreed to lynch someone, kill them
    if (lynchedPlayerId) {
      // Check if they are the Bomber or Martyr first (Optional edge cases)
      const { data: target } = await supabase
        .from("players")
        .select("role")
        .eq("id", lynchedPlayerId)
        .single();

      databaseUpdates.push(
        supabase
          .from("players")
          .update({ is_alive: false })
          .eq("id", lynchedPlayerId)
      );

      // (If they were the Bomber, you would trigger a secondary kill here)
    }

    // Run the kill
    await Promise.all(databaseUpdates);

    // 2. Check if the game is over
    const winStatus = await checkWinCondition(roomId);

    if (winStatus) {
      // Game Over!
      await supabase
        .from("rooms")
        .update({ status: winStatus })
        .eq("id", roomId);
        
      return { status: "game_over", winner: winStatus };
    } else {
      // 3. Game Continues - Plunge back to Night Phase
      // We increment the round number and reset the room to night
      const { data: room } = await supabase
        .from("rooms")
        .select("current_round")
        .eq("id", roomId)
        .single();

      await supabase
        .from("rooms")
        .update({ 
          status: "night", 
          current_round: (room?.current_round || 1) + 1 
        })
        .eq("id", roomId);

      return { status: "next_round" };
    }

  } catch (error) {
    console.error("Error executing lynch:", error);
    return { success: false, error };
  }
}

// src/actions/gameActions.ts

export async function resetGameSession(roomId: string) {
  try {
    // 1. Burn the evidence (Delete all previous night actions for this room)
    const deleteActionsPromise = supabase
      .from("night_actions")
      .delete()
      .eq("room_id", roomId);

    // 2. Resurrect and strip players of their identities
    const resetPlayersPromise = supabase
      .from("players")
      .update({
        role: null,
        is_alive: true,
        is_muted: false,
        shots_remaining: 0,
        double_vote_used: false,
      })
      .eq("room_id", roomId);

    // 3. Reset the room's clock and status back to the lobby
    const resetRoomPromise = supabase
      .from("rooms")
      .update({
        status: "lobby",
        current_round: 0,
      })
      .eq("id", roomId);

    // Execute all database operations simultaneously for maximum speed
    await Promise.all([
      deleteActionsPromise,
      resetPlayersPromise,
      resetRoomPromise,
    ]);

    return { success: true };
  } catch (error) {
    console.error("Failed to reset game session:", error);
    return { success: false, error };
  }
}