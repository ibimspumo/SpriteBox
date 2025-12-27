// apps/server/src/bots/handlers/VotingHandler.ts
// Bot voting phase handlers

import { randomInt } from 'crypto';
import type { Instance, VotingAssignment } from '../../types.js';
import type { Bot, BotConfig } from '../types.js';
import { getVotingState } from '../../phases.js';
import { processVote, processFinaleVote, type VotingState } from '../../voting.js';
import { log, randomItem } from '../../utils.js';

/**
 * Random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return randomInt(min, max + 1);
}

export interface VotingHandlerContext {
  onDisconnect: (bot: Bot, instance: Instance) => void;
}

/**
 * Handler for bot voting phases
 */
export class VotingHandler {
  private context: VotingHandlerContext;

  constructor(context: VotingHandlerContext) {
    this.context = context;
  }

  /**
   * Handle bot voting phase
   */
  handleVotingPhase(bot: Bot, instance: Instance, config: BotConfig): void {
    const state = getVotingState(instance.id);
    if (!state) return;

    // Check if bot has an assignment for current round
    const assignment = state.assignments.find((a) => a.voterId === bot.playerId);
    if (!assignment) return;

    // Check if already voted
    if (state.votersVoted.has(bot.playerId)) return;

    // AFK chance
    if (randomInt(0, 100) < config.afkChance * 100) {
      return;
    }

    // Disconnect chance
    if (randomInt(0, 100) < config.disconnectChance * 100) {
      this.context.onDisconnect(bot, instance);
      return;
    }

    // Vote after delay
    const delay = randomBetween(config.voteDelay.min, config.voteDelay.max);
    const voteTimer = setTimeout(() => {
      if (bot.isActive && instance.phase === 'voting') {
        this.submitVote(bot, instance, state, assignment);
      }
    }, delay);

    bot.timers.push(voteTimer);
  }

  /**
   * Handle bot finale phase
   */
  handleFinalePhase(bot: Bot, instance: Instance, config: BotConfig): void {
    const state = getVotingState(instance.id);
    if (!state || state.finalists.length === 0) return;

    // Check if already voted in finale
    if (state.votersVoted.has(bot.playerId)) return;

    // AFK chance
    if (randomInt(0, 100) < config.afkChance * 100) {
      return;
    }

    // Vote after delay
    const delay = randomBetween(config.voteDelay.min, config.voteDelay.max);
    const finaleTimer = setTimeout(() => {
      if (bot.isActive && instance.phase === 'finale') {
        this.submitFinaleVote(bot, instance, state);
      }
    }, delay);

    bot.timers.push(finaleTimer);
  }

  /**
   * Submit a vote for a bot
   */
  private submitVote(bot: Bot, instance: Instance, state: VotingState, assignment: VotingAssignment): void {
    // Random choice between imageA and imageB
    const chosenId = randomInt(0, 2) === 0 ? assignment.imageA : assignment.imageB;

    const result = processVote(instance, state, bot.playerId, chosenId);

    if (result.success) {
      log('Debug', `Bot ${bot.user.fullName} voted for ${chosenId.slice(0, 8)}...`);
    }
  }

  /**
   * Submit a finale vote for a bot
   */
  private submitFinaleVote(bot: Bot, instance: Instance, state: VotingState): void {
    // Filter out self from finalists
    const choices = state.finalists.filter((f) => f.playerId !== bot.playerId);

    if (choices.length === 0) return;

    const choice = randomItem(choices);
    const result = processFinaleVote(state, bot.playerId, choice.playerId);

    if (result.success) {
      log('Debug', `Bot ${bot.user.fullName} finale voted for ${choice.playerId.slice(0, 8)}...`);
    }
  }
}
