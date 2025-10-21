import { runFfmpeg } from './ffmpeg';

export interface VocalConfig {
  text: string;
  pitch: number; // semitones
  speed: number; // 1.0 = normal
  robot: boolean;
  language?: string;
}

export async function generateVocals(config: VocalConfig, output: string): Promise<void> {
  // Use Google Cloud Text-to-Speech API for production-quality vocals
  // Requires GOOGLE_APPLICATION_CREDENTIALS environment variable set
  
  try {
    const textToSpeech = await import('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient();

    const languageCode = mapLanguageCode(config.language || 'en');
    
    const request = {
      input: { text: config.text },
      voice: {
        languageCode,
        ssmlGender: 'NEUTRAL' as const,
      },
      audioConfig: {
        audioEncoding: 'LINEAR16' as const,
        sampleRateHertz: 24000,
        pitch: config.pitch,
        speakingRate: config.speed,
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('No audio content received from TTS');
    }

    // Write TTS output to temporary file
    const fs = await import('fs/promises');
    const tempTtsPath = `${output}.tts.wav`;
    await fs.writeFile(tempTtsPath, response.audioContent as Buffer);

    // Apply robot effect if requested using ffmpeg
    const filters = [];
    
    if (config.robot) {
      filters.push('afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75');
    }
    
    if (filters.length > 0) {
      await runFfmpeg([
        '-i', tempTtsPath,
        '-af', filters.join(','),
        '-y',
        output
      ]);
      // Clean up temp file
      await fs.unlink(tempTtsPath);
    } else {
      // Just rename temp file to output
      await fs.rename(tempTtsPath, output);
    }
    
  } catch (error) {
    console.error('TTS generation failed:', error);
    
    // Fallback to espeak-ng (requires installation: brew install espeak-ng)
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const tempPath = `${output}.espeak.wav`;
      const lang = mapEspeakLanguage(config.language || 'en');
      const pitch = 50 + config.pitch * 5; // Convert semitones to espeak range
      const speed = Math.floor(175 * config.speed); // Words per minute
      
      await execAsync(`espeak-ng -v${lang} -p${pitch} -s${speed} -w "${tempPath}" "${config.text}"`);
      
      // Apply effects with ffmpeg
      const filters = [];
      if (config.robot) {
        filters.push('afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75');
      }
      
      if (filters.length > 0) {
        await runFfmpeg(['-i', tempPath, '-af', filters.join(','), '-y', output]);
      } else {
        const fs = await import('fs/promises');
        await fs.rename(tempPath, output);
      }
      
    } catch (espeakError) {
      console.error('Espeak fallback failed:', espeakError);
      // Last resort: generate silence
      await runFfmpeg([
        '-f', 'lavfi',
        '-i', 'anullsrc=d=1',
        '-y',
        output
      ]);
    }
  }
}

function mapLanguageCode(lang: string): string {
  const mapping: Record<string, string> = {
    'en': 'en-US',
    'english': 'en-US',
    'es': 'es-ES',
    'spanish': 'es-ES',
    'fr': 'fr-FR',
    'french': 'fr-FR',
    'de': 'de-DE',
    'german': 'de-DE',
    'ja': 'ja-JP',
    'japanese': 'ja-JP',
    'ko': 'ko-KR',
    'korean': 'ko-KR',
    'zh': 'zh-CN',
    'mandarin': 'zh-CN',
    'hi': 'hi-IN',
    'hindi': 'hi-IN',
    'pt': 'pt-BR',
    'portuguese': 'pt-BR',
    'it': 'it-IT',
    'italian': 'it-IT',
    'ru': 'ru-RU',
    'russian': 'ru-RU',
    'ar': 'ar-XA',
    'arabic': 'ar-XA',
  };
  
  const normalized = lang.toLowerCase().trim();
  return mapping[normalized] || 'en-US';
}

function mapEspeakLanguage(lang: string): string {
  const mapping: Record<string, string> = {
    'en': 'en',
    'english': 'en',
    'es': 'es',
    'spanish': 'es',
    'fr': 'fr',
    'french': 'fr',
    'de': 'de',
    'german': 'de',
    'ja': 'ja',
    'japanese': 'ja',
    'ko': 'ko',
    'korean': 'ko',
    'zh': 'zh',
    'mandarin': 'zh',
    'hi': 'hi',
    'hindi': 'hi',
    'pt': 'pt',
    'portuguese': 'pt',
    'it': 'it',
    'italian': 'it',
    'ru': 'ru',
    'russian': 'ru',
    'ar': 'ar',
    'arabic': 'ar',
  };
  
  const normalized = lang.toLowerCase().trim();
  return mapping[normalized] || 'en';
}
