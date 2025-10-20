import { PrismaClient } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { AuthedRequest } from './auth';
export declare function initRateLimiter(prisma: PrismaClient): void;
export declare function rateLimiter(prisma: PrismaClient): (req: AuthedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
