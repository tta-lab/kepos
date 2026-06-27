# V3 RetroArch Game Seed List

This document lists candidate games for the V3 desktop RetroArch game-session
direction.

The goal is not to build a public ROM catalog. The goal is to choose a small
set of non-arcade games that are good for proving Kepos as a trusted home game
lobby with ROM peer transfer and RetroArch netplay launch.

## Selection Rules

Prefer games that are:

- non-arcade console games
- local multiplayer on original hardware
- simple to understand from a home invite
- playable with two controllers
- single-file ROMs when possible
- supported by stable RetroArch cores
- useful for testing controller assignment, ROM hash matching, and netplay

Avoid for early batches:

- arcade ROM sets
- BIOS-heavy systems
- games that require link-cable emulation rather than same-console multiplayer
- games that need unusual peripherals before they are worth playing
- games that require deep RetroArch tuning before a first match

## Recommended Cores

Use these as the first default guesses:

| System               | Core                   | Notes                                                                                            |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| SNES / SFC           | `Snes9x`               | Recommended for netplay in libretro docs; avoid old `Snes9x 2005/2010` variants for first tests. |
| Genesis / Mega Drive | `Genesis Plus GX`      | Broad Genesis support and netplay support, but keep desktop-to-desktop first.                    |
| NES                  | `FCEUmm` or `Nestopia` | Useful later, but NES local co-op catalog is less strong for this seed list.                     |

## First Batch

These are the first five games to validate the V3 desktop flow.

| Game                 | System  | Players | Core                   | Why                                                                                                              |
| -------------------- | ------- | ------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Tetris & Dr. Mario   | SNES    | 2       | `Snes9x`               | Best first Tetris-style test. It has head-to-head Tetris with garbage lines and clear rules.                     |
| Tetris Battle Gaiden | SFC     | 2       | `Snes9x`               | Strong battle Tetris candidate with garbage, shared pieces, character powers, and fast friend-vs-friend tension. |
| Contra               | NES     | 2       | `FCEUmm` or `Nestopia` | Iconic co-op action test. Small ROM, light core, simple controls, and immediately recognizable.                  |
| Streets of Rage 2    | Genesis | 2       | `Genesis Plus GX`      | Strong beat-'em-up co-op test and a good Genesis baseline.                                                       |
| Super Bomberman 2    | SNES    | 2-4     | `Snes9x`               | Great home-party test. Start with 2 players; later use it to test multitap and controller-slot handling.         |

First-batch reasoning:

- `Tetris & Dr. Mario` proves competitive puzzle play with garbage.
- `Tetris Battle Gaiden` proves a more playful battle-puzzle variant.
- `Contra` proves classic two-player action co-op on a light NES core.
- `Streets of Rage 2` proves Genesis support.
- `Super Bomberman 2` proves lobby/session fun and later expands into more controller cases.

## Second Batch

These are the next five once the first batch launches reliably.

| Game                                             | System          | Players | Core                          | Why                                                                                               |
| ------------------------------------------------ | --------------- | ------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Gunstar Heroes                                   | Genesis         | 2       | `Genesis Plus GX`             | High-quality two-player run-and-gun. Good stress test for fast action and screen chaos.           |
| Teenage Mutant Ninja Turtles IV: Turtles in Time | SNES            | 2       | `Snes9x`                      | Familiar co-op brawler with simple controls and strong session appeal.                            |
| Pocky & Rocky                                    | SNES            | 2       | `Snes9x`                      | Top-down co-op shooter with same-screen teamwork. Good contrast to side-scrollers.                |
| Contra III: The Alien Wars                       | SNES            | 2       | `Snes9x`                      | Strong follow-up Contra test with stricter timing and more screen activity than the NES original. |
| NBA Jam: Tournament Edition                      | SNES or Genesis | 2-4     | `Snes9x` or `Genesis Plus GX` | Sports/party test. Start 2-player; later use for 4-player controller assignment.                  |

Second-batch reasoning:

- `Gunstar Heroes` and `TMNT IV` broaden action coverage.
- `Pocky & Rocky` gives a different co-op shape.
- `Contra III` checks whether the first Contra path still feels good with a heavier SNES action game.
- `NBA Jam TE` adds a sports/party path and future 4-player pressure.

## Multitap And Four-Player Games

Do not make four-player support part of the first success bar.

RetroArch supports controller requests and SNES multitap setups, but this adds
configuration risk. For V3 game sessions:

1. prove two-player sessions first
2. store controller assignment in the signed invite
3. later add per-game adapter notes for multitap titles
4. test `Super Bomberman 2` and `NBA Jam TE` as the first four-player cases

## V3 Success Bar For This List

The first useful milestone is:

- host chooses one first-batch game
- Kepos computes and shares the ROM hash
- guest receives the ROM over peer asset transfer if missing
- guest verifies the hash
- Kepos launches RetroArch on both desktops
- the game starts with host as player 1 and guest as player 2

After that works for two SNES games and one Genesis game, the list is good
enough to guide broader V3 work.

## Sources To Recheck During Implementation

- RetroArch netplay documentation
- Libretro `Snes9x` core documentation
- Libretro `Genesis Plus GX` core documentation
- Libretro multiple-controller netplay guide
- TetrisWiki pages for `Tetris & Dr. Mario` and `Tetris Battle Gaiden`

## Appendix: Tetris Series Candidates

These are the Tetris-family candidates discussed for V3 RetroArch sessions.

| Game                 | Year                             | Original platform                     | Suggested core                                               | Priority        | Notes                                                                                                                                                       |
| -------------------- | -------------------------------- | ------------------------------------- | ------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tetris & Dr. Mario   | 1994                             | SNES                                  | `Snes9x`                                                     | First batch     | Cleanest first pick. Two-player Tetris has garbage lines based on line clears.                                                                              |
| Tetris Battle Gaiden | 1993                             | Super Famicom                         | `Snes9x`                                                     | First batch     | Strong battle Tetris candidate with garbage, shared pieces, character powers, and friend-vs-friend pressure. Japanese release.                              |
| Tetris Attack        | 1995 JP / 1996 NA                | SNES                                  | `Snes9x`                                                     | Later candidate | Not tetromino Tetris; it is Panel de Pon rebranded as Tetris Attack. Good puzzle battle netplay candidate, but not the requested garbage-line Tetris style. |
| Tetris Plus          | 1995 arcade / 1996 console ports | Arcade, Saturn, PlayStation, Game Boy | `MAME`/`FBNeo` for arcade; platform-specific cores for ports | Later candidate | Has two-player versus. Arcade ROM sets add friction, so keep it out of early batches.                                                                       |
| Tetris Plus 2        | 1997                             | Arcade                                | `MAME`/`FBNeo`                                               | Later candidate | Versus-focused sequel, but arcade core and ROM set matching make it a post-first-batch candidate.                                                           |
| Tetris Party Deluxe  | 2010                             | Nintendo DS / Wii                     | DS/Wii cores, not first-choice RetroArch netplay             | Deferred        | Has multiplayer modes, but DS/Wii emulation and local wireless-style behavior are not a good first target for this V3 desktop RetroArch path.               |

For the specific "clear multiple lines to add rows to the opponent" requirement,
start with `Tetris & Dr. Mario`, then `Tetris Battle Gaiden`.
