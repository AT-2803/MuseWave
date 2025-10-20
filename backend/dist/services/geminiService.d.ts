export declare function enhancePrompt(prompt: string): Promise<string>;
export declare function suggestGenres(prompt: string): Promise<string[]>;
export declare function generateMusicPlan(prompt: string, genre: string): Promise<any>;
export declare function auditMusicPlan(plan: any): Promise<string>;
export declare function suggestArtists(prompt: string): Promise<string[]>;
export declare function suggestLanguages(prompt: string): Promise<string[]>;
export declare function enhanceLyrics(lyrics: string): Promise<string>;
