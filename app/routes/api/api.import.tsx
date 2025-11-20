import { DB_EXPORT } from './firebase_export';
import { prisma } from '../../utils/db.server';


interface OldUser {
    id: string;
    name: string;
}

interface OldGame {
    id: string;
    winner: OldUser;
    loser: OldUser;
    timestamp: string;
    issuer: OldUser;
}

export async function loader() {
    // open the JSON file, and import the data into the database
    let created = {
        users: 0,
        games: 0,
    }
    let updated = {
        users: 0,
        games: 0,
    }
    const users = []
    console.log(DB_EXPORT.users);
    for (const [userId, user] of Object.entries(DB_EXPORT.users)) {
        users.push({
            id: userId,
            name: user.name,
        });
    }
    // create users if they don't exist
    for (const user of users) {
        const existingUser = await prisma.user.findUnique({
            where: {
                id: user.id,
            },
            include: {
                claimedBy: true,
            }
        });
        if (!existingUser) {
            await prisma.user.create({
                data: {
                    id: user.id,
                    name: user.name,
                    email: `${user.id}@ypoolghost.com`,
                    ghost: true,
                }
            });
            created.users++;
        }
        else {
            // update the user
            // unclaim the user if they are claimed
            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    name: user.name,
                    email: `${user.id}@ypoolghost.com`,
                    ghost: true,
                    claimedBy: {
                        disconnect: true,
                    },
                }
            });
            // mark the claimer as non claimer
            if (existingUser.claimedById) {
                await prisma.user.update({
                    where: {
                        id: existingUser.claimedById,
                    },
                    data: {
                        hasClaimed: {
                            disconnect: true,
                        },
                    }
                });
                updated.users++;
            }
            updated.users++;
        }
    }

    const games = []
    for (const [gameId, game] of Object.entries(DB_EXPORT.matches)) {
        games.push({
            id: gameId,
            winner: users.find((u) => u.id === game.winner),
            loser: users.find((u) => u.id === game.loser),
        });
        const existingGame = await prisma.game.findUnique({
            where: {
                id: gameId,
            }
        });
        if (!existingGame) {
            await prisma.game.create({
                data: {
                    id: gameId,
                    winner: {
                        connect: {
                            id: game.winner,
                        }
                    },
                    loser: {
                        connect: {
                            id: game.loser,
                        }
                    },
                    timestamp: new Date(game.datetime ?? new Date(2023, 1, 1).toISOString()),
                }
            });
            created.games++;
        }
        else {
            await prisma.game.update({
                where: {
                    id: gameId,
                },
                data: {
                    winner: {
                        connect: {
                            id: game.winner,
                        }
                    },
                    loser: {
                        connect: {
                            id: game.loser,
                        }
                    },
                    timestamp: new Date(game.datetime ?? new Date(2023, 1, 1).toISOString()),
                }
            });
            updated.games++;
        }
    }




    return {
        "ok": true,
        "created": {
            "users": created.users,
            "games": created.games,
        },
        "updated": {
            "users": updated.users,
            "games": updated.games,
        }
    }
}