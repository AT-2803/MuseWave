export class ExternalAudioProvider {
    apiUrl;
    apiKey;
    constructor(apiUrl, apiKey) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
    }
    async generateAudio(plan, duration) {
        // TODO: Implement external API call
        // For now, throw not implemented
        throw new Error('External audio provider not implemented');
    }
}
