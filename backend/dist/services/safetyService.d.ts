export interface SafetyResult {
    safe: boolean;
    reason?: string;
    suggestions?: string[];
}
export declare class SafetyService {
    private genAI?;
    constructor();
    checkContent(prompt: string): Promise<SafetyResult>;
    private mockSafetyCheck;
}
export declare const safetyService: SafetyService;
