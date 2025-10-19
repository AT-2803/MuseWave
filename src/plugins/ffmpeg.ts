import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import { logger } from '../logger';

export interface FfmpegRunOptions {
  timeoutMs?: number;
  inputStream?: Readable;
}

export interface FfmpegResult {
  stdout: string;
  stderr: string;
  code: number;
}

async function runCommand(cmd: string, args: string[], options: FfmpegRunOptions = {}): Promise<FfmpegResult> {
  return new Promise((resolve, reject) => {
    const child: ChildProcessWithoutNullStreams = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    if (options.inputStream) {
      options.inputStream.pipe(child.stdin);
    } else {
      child.stdin.end();
    }

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    let timeoutHandle: NodeJS.Timeout | null = null;
    if (options.timeoutMs) {
      timeoutHandle = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`${cmd} timed out after ${options.timeoutMs}ms`));
      }, options.timeoutMs);
    }

    child.on('error', (error) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      reject(error);
    });

    child.on('close', (code) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (code && code !== 0) {
        const error = new Error(`${cmd} exited with code ${code}: ${stderr}`);
        Object.assign(error, { stdout, stderr, code });
        reject(error);
      } else {
        resolve({ stdout, stderr, code: code ?? 0 });
      }
    });
  });
}

export function runFfmpeg(args: string[], options?: FfmpegRunOptions) {
  logger.debug({ args }, 'Running ffmpeg');
  return runCommand('ffmpeg', args, options);
}

export async function ffprobe(filePath: string): Promise<any> {
  const result = await runCommand('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height',
    '-of',
    'json',
    filePath,
  ]);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    logger.warn({ error, stdout: result.stdout }, 'Failed to parse ffprobe output');
    return null;
  }
}

export async function ensureFfmpeg(): Promise<boolean> {
  try {
    await runCommand('ffmpeg', ['-version']);
    await runCommand('ffprobe', ['-version']);
    return true;
  } catch (error) {
    logger.warn({ error }, 'ffmpeg/ffprobe not available');
    return false;
  }
}
