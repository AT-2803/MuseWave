export interface Caption {
  start: number;
  end: number;
  text: string;
}

export class CaptionGenerator {
  generateCaptions(plan: any, duration: number): Caption[] {
    const captions: Caption[] = [];
    const sections = plan.structure || [];

    let currentTime = 0;

    for (const section of sections) {
      if (currentTime >= duration) break;

      const endTime = Math.min(currentTime + section.duration, duration);

      captions.push({
        start: currentTime,
        end: endTime,
        text: this.generateCaptionText(section),
      });

      currentTime = endTime;
    }

    return captions;
  }

  private generateCaptionText(section: any): string {
    const sectionName = section.section || 'Music';
    const description = section.description || '';

    return `${sectionName}: ${description}`;
  }

  toSRT(captions: Caption[]): string {
    return captions.map((caption, index) => {
      const start = this.formatTime(caption.start);
      const end = this.formatTime(caption.end);

      return `${index + 1}\n${start} --> ${end}\n${caption.text}\n`;
    }).join('\n');
  }

  toVTT(captions: Caption[]): string {
    const lines = ['WEBVTT\n'];

    for (const caption of captions) {
      const start = this.formatTime(caption.start);
      const end = this.formatTime(caption.end);

      lines.push(`${start} --> ${end}`);
      lines.push(caption.text);
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
}

export const captionGenerator = new CaptionGenerator();