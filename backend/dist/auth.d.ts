import { PrismaClient } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
export interface AuthedRequest extends Request {
    apiKeyRecord?: {
        id: string;
        rateLimitPerMin: number;
        key: string;
    };
}
export declare function apiAuth(prisma: PrismaClient): (req: AuthedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
