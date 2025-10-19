


import React from 'react';
// FIX: Changed import path to point to .tsx file.
import { GENRES } from '../constants';
import Button from './ui/Button';
import TagInput from './ui/TagInput';
import Slider from './ui/Slider';
import Switch from './ui/Switch';
// FIX: Changed import path to point to .tsx file.
import { useToast } from '../hooks/useToast';
import type { VideoStyle } from '../lib/types';
// FIX: Changed import path to point to .tsx file.
import { cn } from '../lib/utils';

// Icon for AI suggestions
const WandIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2m0 16v-2m-7.5-13.5L6 4m9 1.5L16.5 4M3 12h2m14 0h2M6.5 19.5L8 18m6.5 1.5l-1.5-1.5M12 7a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5z"/></svg>
);
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);


export type FormState = {
  prompt: string;
  genres: string[];
  duration: number;
  artists: string[];
  lyrics: string;
  languages: string[];
  generateVideo: boolean;
  videoStyles: VideoStyle[];
};

export type EnhancingField = 'prompt' | 'genres' | 'artists' | 'lyrics' | 'languages' | null;

interface MuseForgeFormProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
  onSuggestion: (field: EnhancingField) => void;
  isLoading: boolean;
  enhancingField: EnhancingField;
}

const MuseForgeForm = ({
  formState,
  setFormState,
  onSubmit,
  onSuggestion,
  isLoading,
  enhancingField,
}: MuseForgeFormProps) => {
  const { toast } = useToast();

  const handleFieldChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };
  
  const handleVideoStyleChange = (style: VideoStyle) => {
    const currentStyles = formState.videoStyles;
    const newStyles = currentStyles.includes(style)
        ? currentStyles.filter(s => s !== style)
        : [...currentStyles, style];
    handleFieldChange('videoStyles', newStyles);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!formState.prompt && formState.genres.length === 0) {
      toast('Please provide a prompt or at least one genre to start.', 'error');
      return;
    }
     if (formState.generateVideo && formState.videoStyles.length === 0) {
      toast('Please select at least one video style when video generation is enabled.', 'error');
      return;
    }
    onSubmit();
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${m}:${pad(s)}`;
  };

  const allGenres = GENRES.map(g => g.label);
  const languageOptions = [
    'English',
    'Hindi',
    'Punjabi',
    'Tamil',
    'Telugu',
    'Bengali',
    'Spanish',
    'French',
    'German',
    'Japanese',
    'Korean'
  ];

  const SuggestionButton = ({ field }: { field: EnhancingField }) => (
     <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onSuggestion(field)}
        disabled={isLoading || enhancingField === field}
        className="text-primary hover:text-primary/80 disabled:opacity-50"
        aria-label={`Enhance ${field}`}
    >
        <WandIcon className={`h-5 w-5 ${enhancingField === field ? 'animate-spin' : ''}`} />
    </Button>
  );

  const videoOptions: { value: VideoStyle; title: string; description: string }[] = [
    { value: 'lyrical', title: 'Lyric Video', description: 'Simple video with synchronized lyrics.' },
    { value: 'official', title: 'Official Music Video', description: 'Full video with dynamic visuals.' },
    { value: 'abstract', title: 'Abstract Visualizer', description: 'Beat-reactive, surreal geometric visuals.' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Music Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
            <label htmlFor="music-prompt" className="block text-sm font-medium text-gray-300">
                Music Prompt
            </label>
            <SuggestionButton field="prompt" />
        </div>
        <p className="text-sm text-gray-500">
          Describe the track you want to create, or let the AI suggest an idea for you.
        </p>
        <textarea
          id="music-prompt"
          value={formState.prompt}
          onChange={(e) => handleFieldChange('prompt', e.target.value)}
          rows={3}
          disabled={isLoading}
          className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
          placeholder="e.g., An epic cinematic score for a space battle, with powerful drums and a soaring orchestral melody."
        />
      </div>

      {/* Genres */}
      <div className="space-y-2">
         <div className="flex items-center justify-between">
            <label htmlFor="genres" className="block text-sm font-medium text-gray-300">
                Genres
            </label>
            <SuggestionButton field="genres" />
        </div>
        <p className="text-sm text-gray-500">
          Select or type in genres. The AI will use these to guide the style.
        </p>
        <TagInput
          value={formState.genres}
          onChange={(v) => handleFieldChange('genres', v)}
          placeholder="e.g., Techno, Ambient"
          options={allGenres}
          disabled={isLoading}
        />
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <label htmlFor="duration" className="block text-sm font-medium text-gray-300">
          Duration: <span className="text-primary font-mono">{formatDuration(formState.duration)}</span>
        </label>
        <div className="flex flex-col gap-2">
          <Slider
            value={[formState.duration]}
            onValueChange={(v) => handleFieldChange('duration', v[0])}
            min={15}
            max={72000} // 20 hours
            step={1}
            disabled={isLoading}
          />

          <div className="grid grid-cols-3 gap-2 pt-2">
            <div>
              <label className="block text-xs text-gray-400">Hours</label>
              <input
                type="number"
                aria-label="Hours"
                min={0}
                max={20}
                value={Math.floor(formState.duration / 3600)}
                onChange={(e) => {
                  const h = Math.max(0, Math.min(20, Number(e.target.value || 0)));
                  const m = Math.floor((formState.duration % 3600) / 60);
                  const s = formState.duration % 60;
                  handleFieldChange('duration', h * 3600 + m * 60 + s);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400">Minutes</label>
              <input
                type="number"
                aria-label="Minutes"
                min={0}
                max={59}
                value={Math.floor((formState.duration % 3600) / 60)}
                onChange={(e) => {
                  const m = Math.max(0, Math.min(59, Number(e.target.value || 0)));
                  const h = Math.floor(formState.duration / 3600);
                  const s = formState.duration % 60;
                  handleFieldChange('duration', h * 3600 + m * 60 + s);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400">Seconds</label>
              <input
                type="number"
                aria-label="Seconds"
                min={0}
                max={59}
                value={formState.duration % 60}
                onChange={(e) => {
                  const s = Math.max(0, Math.min(59, Number(e.target.value || 0)));
                  const h = Math.floor(formState.duration / 3600);
                  const m = Math.floor((formState.duration % 3600) / 60);
                  handleFieldChange('duration', h * 3600 + m * 60 + s);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

       {/* Artist Inspiration */}
      <div className="space-y-2">
         <div className="flex items-center justify-between">
            <label htmlFor="artists" className="block text-sm font-medium text-gray-300">
                Artist Inspiration (Optional)
            </label>
            <SuggestionButton field="artists" />
        </div>
        <p className="text-sm text-gray-500">
          Guide the AI with artists whose style you admire.
        </p>
        <TagInput
          value={formState.artists}
          onChange={(v) => handleFieldChange('artists', v)}
          placeholder="e.g., Brian Eno, Aphex Twin"
          disabled={isLoading}
        />
      </div>

      {/* Lyrics / Vocal Theme */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="lyrics" className="block text-sm font-medium text-gray-300">
            Lyrics / Vocal Theme (Optional)
          </label>
          <SuggestionButton field="lyrics" />
        </div>
        <p className="text-sm text-gray-500">
          Provide lyrics or a theme for the AI to create a "sung" vocal melody.
        </p>
        <textarea
          id="lyrics"
          value={formState.lyrics}
          onChange={(e) => handleFieldChange('lyrics', e.target.value)}
          rows={4}
          disabled={isLoading}
          className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:ring-primary disabled:opacity-50"
          placeholder="Verse 1:&#10;Floating through a calm, digital ocean&#10;Chorus:&#10;Under a sky of binary stars..."
        />
      </div>

      {/* Preferred Languages */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="languages" className="block text-sm font-medium text-gray-300">
            Preferred Vocal Languages
          </label>
          <SuggestionButton field="languages" />
        </div>
        <p className="text-sm text-gray-500">
          Specify or let the AI suggest languages that complement the vibe and audience.
        </p>
        <TagInput
          value={formState.languages}
          onChange={(v) => handleFieldChange('languages', v)}
          placeholder="e.g., English, Hindi"
          options={languageOptions}
          disabled={isLoading}
        />
      </div>
      
      {/* Video Generation Toggle */}
      <div className="space-y-4 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="generate-video" className="text-sm font-medium text-gray-300">
              Generate Video
            </label>
            <p className="text-sm text-gray-500">
              Enable to create synchronized videos for your track.
            </p>
          </div>
          <Switch
            id="generate-video"
            checked={formState.generateVideo}
            onCheckedChange={(checked) => handleFieldChange('generateVideo', checked)}
            disabled={isLoading}
          />
        </div>

        {/* Video Generation Options */}
        {formState.generateVideo && (
          <div className="space-y-2 pt-4 animate-in fade-in duration-300">
            <label className="block text-sm font-medium text-gray-300">Video Styles</label>
            <p className="text-sm text-gray-500">
              Select one or more video styles to generate for your audio track.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {videoOptions.map((option) => {
                const isSelected = formState.videoStyles.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => !isLoading && handleVideoStyleChange(option.value)}
                    disabled={isLoading}
                    className={cn(
                      'flex items-start text-left space-x-3 rounded-md border p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      isSelected ? 'border-primary bg-primary/10' : 'border-gray-700 hover:bg-gray-800/50'
                    )}
                    role="checkbox"
                    aria-checked={isSelected}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-sm border mt-0.5',
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-gray-400'
                      )}
                    >
                      {isSelected && <CheckIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{option.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>


      {/* Submit Button */}
      <div>
        <Button type="submit" disabled={isLoading || !!enhancingField} className="w-full">
          {isLoading
            ? 'Forging in the AI fires...'
            : formState.generateVideo 
            ? 'Generate Music & Videos' 
            : 'Generate Music Only'}
        </Button>
      </div>
    </form>
  );
};

export default MuseForgeForm;
