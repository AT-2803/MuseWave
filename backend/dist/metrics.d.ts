import { Gauge, Counter } from 'prom-client';
import { FastifyPluginAsync } from 'fastify';
export declare const jobDuration: Gauge<"status">;
export declare const jobCount: Counter<"status">;
export declare const requestCount: Counter<"status" | "method" | "route">;
export declare const queueSize: Gauge<string>;
export declare const rateLimitCounter: Counter<string>;
export declare const ffmpegGauge: Gauge<string>;
export declare const metricsPlugin: FastifyPluginAsync;
