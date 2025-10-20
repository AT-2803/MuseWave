export class ExternalVideoProvider {
    apiUrl;
    apiKey;
    constructor(apiUrl, apiKey) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
    }
    async generateVideo(audioBuffer, plan, duration) {
        // TODO: Implement external API call
        throw new Error('External video provider not implemented');
    }
}
