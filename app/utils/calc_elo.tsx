import moment from "moment";
import { Duel, Player } from "teslo";

export interface PlayedMatch {
  winner: string;
  loser: string;
  datetime?: string | Date;
}

export interface UserStats {
  userId: string;
  elo: number;
  dead?: boolean;
}

export interface EloHistoryPoint {
  timestamp: Date;
  [playerId: string]: number | Date;
}

/**
 * Calculate final ELO scores for all players from a list of games
 * @param games Array of played matches
 * @param learningRate K-factor for ELO calculation
 * @returns Array of user stats with ELO scores, sorted by ELO descending
 */
export function calcEloFromGames(games: PlayedMatch[], learningRate: number): UserStats[] {
  // Get all unique players
  const players = Array.from(new Set(games.flatMap((game) => [game.winner, game.loser])));
  
  // Initialize ELO players - all start at 1500
  const eloPlayers = players.map((player) => new Player(player, 1500));
  
  // Process games in chronological order
  const sortedGames = [...games].sort((a, b) => {
    const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
    const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
    return dateA - dateB;
  });

  // Calculate ELO for each game using teslo
  for (const game of sortedGames) {
    const winner = eloPlayers[players.indexOf(game.winner)];
    const loser = eloPlayers[players.indexOf(game.loser)];
    
    if (!winner || !loser || winner === loser) {
      console.log("Player not found", game);
      continue;
    }
    
    const duel = new Duel([winner, loser], { kFactor: learningRate } as any);
    duel.calculate(winner.id);
  }

  // Return sorted by ELO descending
  return eloPlayers
    .sort((playerA, playerB) => playerB.elo - playerA.elo)
    .map((player) => ({
      userId: player.id,
      elo: Number(player.elo.toFixed(2)),
      dead: false,
    }));
}

/**
 * Calculate ELO history over time, returning a point for each game
 * @param games Array of played matches
 * @param learningRate K-factor for ELO calculation
 * @returns Array of ELO history points, one per game plus initial state
 */
export function calcEloHistory(games: PlayedMatch[], learningRate: number): EloHistoryPoint[] {
  // Get all unique players
  const players = Array.from(new Set(games.flatMap((game) => [game.winner, game.loser])));
  
  // Initialize ELO players - all start at 1500
  const eloPlayers = players.map((player) => new Player(player, 1500));
  
  // Sort games chronologically
  const sortedGames = [...games].sort((a, b) => {
    const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
    const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
    return dateA - dateB;
  });

  const history: EloHistoryPoint[] = [];

  // Create initial history point (all players at 1500)
  if (sortedGames.length > 0) {
    const firstGameDate = sortedGames[0].datetime 
      ? new Date(sortedGames[0].datetime)
      : new Date();
    
    const initialPoint: EloHistoryPoint = {
      timestamp: firstGameDate,
    };
    eloPlayers.forEach((player) => {
      initialPoint[player.id] = 1500;
    });
    history.push(initialPoint);
  }

  // Process each game and create a history point
  for (const game of sortedGames) {
    const winner = eloPlayers[players.indexOf(game.winner)];
    const loser = eloPlayers[players.indexOf(game.loser)];
    
    if (!winner || !loser || winner === loser) {
      continue;
    }
    
    // Calculate ELO using teslo
    const duel = new Duel([winner, loser], { kFactor: learningRate } as any);
    duel.calculate(winner.id);

    // Create history point for this game
    const gameDate = game.datetime ? new Date(game.datetime) : new Date();
    const historyPoint: EloHistoryPoint = {
      timestamp: gameDate,
    };
    
    // Include all players' current ELO in this point
    eloPlayers.forEach((player) => {
      historyPoint[player.id] = player.elo;
    });
    
    history.push(historyPoint);
  }

  return history;
}

/**
 * Filter games within a specific time frame
 * @param games Array of played matches
 * @param startTime Start of time frame
 * @param endTime End of time frame
 * @returns Filtered array of games within the time frame
 */
export function listGamesInTimeFrame(
  games: PlayedMatch[],
  startTime: moment.Moment,
  endTime: moment.Moment
): PlayedMatch[] {
  return games.filter((game) => {
    if (!game.datetime) return false;
    const gameMoment = moment(game.datetime);
    return gameMoment.isAfter(startTime) && gameMoment.isBefore(endTime);
  });
}

/**
 * Get time frame boundaries based on scope and index
 * @param scope Time period scope: "week", "month", or "year"
 * @param index Offset index (0 = current, 1 = previous, etc.)
 * @returns Tuple of [startTime, endTime] as moment objects
 */
export function getTimeFrameByScope(
  scope: string,
  index: number
): [moment.Moment, moment.Moment] {
  const now = moment();
  switch (scope) {
    case "week":
      return [
        now.clone().subtract(7 * index, "days").startOf("week"),
        now.clone().subtract(7 * index, "days").endOf("week"),
      ];
    case "month":
      return [
        now.clone().subtract(index, "months").startOf("month"),
        now.clone().subtract(index, "months").endOf("month"),
      ];
    case "year":
      return [
        now.clone().subtract(index, "years").startOf("year"),
        now.clone().subtract(index, "years").endOf("year"),
      ];
    default:
      return [moment(0), moment()];
  }
}

