/**
 * Usage Tracking and Cost Monitoring
 * Track per-user API usage to prevent abuse and monitor costs
 */

interface UsageMetrics {
  userId: string;
  apiCalls: {
    gemini: number;
    tts: number;
    audio: number;
    video: number;
  };
  tokens: {
    input: number;
    output: number;
  };
  estimatedCost: number; // in INR
  periodStart: Date;
  periodEnd: Date;
}

interface CostConfig {
  geminiFlash: {
    inputPerMillion: number; // INR per 1M tokens
    outputPerMillion: number;
  };
  geminiFlash8b: {
    inputPerMillion: number;
    outputPerMillion: number;
  };
  tts: {
    perMillion: number; // INR per 1M characters
  };
  bandwidth: {
    perGB: number;
  };
}

// Current pricing in INR (as of 2025)
const COST_CONFIG: CostConfig = {
  geminiFlash: {
    inputPerMillion: 6.19,
    outputPerMillion: 24.75,
  },
  geminiFlash8b: {
    inputPerMillion: 3.09, // ~50% cheaper
    outputPerMillion: 12.37,
  },
  tts: {
    perMillion: 330, // ₹330 per 1M characters
  },
  bandwidth: {
    perGB: 8.25, // Standard CDN pricing
  },
};

class UsageTracker {
  private metrics: Map<string, UsageMetrics> = new Map();

  /**
   * Initialize or get user metrics
   */
  private getMetrics(userId: string): UsageMetrics {
    if (!this.metrics.has(userId)) {
      this.metrics.set(userId, {
        userId,
        apiCalls: { gemini: 0, tts: 0, audio: 0, video: 0 },
        tokens: { input: 0, output: 0 },
        estimatedCost: 0,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }
    return this.metrics.get(userId)!;
  }

  /**
   * Track Gemini API call
   */
  trackGeminiCall(
    userId: string,
    inputTokens: number,
    outputTokens: number,
    model: 'flash' | 'flash-8b' = 'flash'
  ) {
    const metrics = this.getMetrics(userId);
    metrics.apiCalls.gemini++;
    metrics.tokens.input += inputTokens;
    metrics.tokens.output += outputTokens;

    const config = model === 'flash-8b' ? COST_CONFIG.geminiFlash8b : COST_CONFIG.geminiFlash;
    const cost =
      (inputTokens / 1_000_000) * config.inputPerMillion +
      (outputTokens / 1_000_000) * config.outputPerMillion;

    metrics.estimatedCost += cost;
    console.log(`[Usage] ${userId}: Gemini ${model} call - ₹${cost.toFixed(4)}`);
  }

  /**
   * Track TTS API call
   */
  trackTTSCall(userId: string, characters: number) {
    const metrics = this.getMetrics(userId);
    metrics.apiCalls.tts++;

    const cost = (characters / 1_000_000) * COST_CONFIG.tts.perMillion;
    metrics.estimatedCost += cost;
    console.log(`[Usage] ${userId}: TTS call (${characters} chars) - ₹${cost.toFixed(4)}`);
  }

  /**
   * Track audio generation
   */
  trackAudioGeneration(userId: string, durationSeconds: number) {
    const metrics = this.getMetrics(userId);
    metrics.apiCalls.audio++;

    // Estimate cost based on processing time (~₹1 per minute of audio)
    const cost = (durationSeconds / 60) * 1.0;
    metrics.estimatedCost += cost;
    console.log(`[Usage] ${userId}: Audio gen (${durationSeconds}s) - ₹${cost.toFixed(4)}`);
  }

  /**
   * Track video generation
   */
  trackVideoGeneration(userId: string, durationSeconds: number) {
    const metrics = this.getMetrics(userId);
    metrics.apiCalls.video++;

    // Video is more expensive (~₹2 per minute)
    const cost = (durationSeconds / 60) * 2.0;
    metrics.estimatedCost += cost;
    console.log(`[Usage] ${userId}: Video gen (${durationSeconds}s) - ₹${cost.toFixed(4)}`);
  }

  /**
   * Track bandwidth usage
   */
  trackBandwidth(userId: string, bytesTransferred: number) {
    const metrics = this.getMetrics(userId);
    const gb = bytesTransferred / (1024 * 1024 * 1024);
    
    // Only charge if not using R2 (R2 has free egress)
    const usingR2 = process.env.R2_ENDPOINT !== undefined;
    if (!usingR2) {
      const cost = gb * COST_CONFIG.bandwidth.perGB;
      metrics.estimatedCost += cost;
      console.log(`[Usage] ${userId}: Bandwidth (${gb.toFixed(2)}GB) - ₹${cost.toFixed(4)}`);
    }
  }

  /**
   * Get user's current usage metrics
   */
  getUserMetrics(userId: string): UsageMetrics {
    return this.getMetrics(userId);
  }

  /**
   * Check if user is over budget/limits
   */
  isOverLimit(userId: string, dailyLimitINR: number = 100): boolean {
    const metrics = this.getMetrics(userId);
    const daysInPeriod = Math.max(1, Math.ceil((Date.now() - metrics.periodStart.getTime()) / (24 * 60 * 60 * 1000)));
    const dailyAverage = metrics.estimatedCost / daysInPeriod;
    
    return dailyAverage > dailyLimitINR;
  }

  /**
   * Reset user metrics (e.g., monthly reset)
   */
  resetUserMetrics(userId: string) {
    this.metrics.delete(userId);
    console.log(`[Usage] Reset metrics for ${userId}`);
  }

  /**
   * Get total cost across all users
   */
  getTotalCost(): number {
    let total = 0;
    for (const metrics of this.metrics.values()) {
      total += metrics.estimatedCost;
    }
    return total;
  }

  /**
   * Get usage report
   */
  getReport(): {
    totalUsers: number;
    totalCost: number;
    avgCostPerUser: number;
    topUsers: Array<{ userId: string; cost: number }>;
  } {
    const users = Array.from(this.metrics.values());
    const totalCost = this.getTotalCost();
    const avgCost = users.length > 0 ? totalCost / users.length : 0;
    
    const topUsers = users
      .sort((a, b) => b.estimatedCost - a.estimatedCost)
      .slice(0, 10)
      .map(m => ({ userId: m.userId, cost: m.estimatedCost }));

    return {
      totalUsers: users.length,
      totalCost,
      avgCostPerUser: avgCost,
      topUsers,
    };
  }
}

// Singleton instance
export const usageTracker = new UsageTracker();

/**
 * Rate limit tiers based on usage
 */
export interface RateLimitTier {
  name: string;
  dailyGenerations: number;
  cooldownSeconds: number;
  dailyBudgetINR: number;
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'Free',
    dailyGenerations: 10,
    cooldownSeconds: 60, // 1 minute between generations
    dailyBudgetINR: 20,
  },
  basic: {
    name: 'Basic',
    dailyGenerations: 50,
    cooldownSeconds: 30,
    dailyBudgetINR: 100,
  },
  pro: {
    name: 'Pro',
    dailyGenerations: 200,
    cooldownSeconds: 10,
    dailyBudgetINR: 400,
  },
  unlimited: {
    name: 'Unlimited',
    dailyGenerations: Infinity,
    cooldownSeconds: 0,
    dailyBudgetINR: Infinity,
  },
};
