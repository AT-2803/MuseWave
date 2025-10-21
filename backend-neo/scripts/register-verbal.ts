// Implement Verbal API call to register action
// Since Verbal API is not documented, output curl instructions

const VERBAL_API_TOKEN = process.env.VERBAL_API_TOKEN!;
const VERBAL_PROJECT_ID = process.env.VERBAL_PROJECT_ID!;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL!;
const DEFAULT_API_KEY = process.env.DEFAULT_API_KEY!;

console.log(`curl -X POST https://api.verbal.com/projects/${VERBAL_PROJECT_ID}/actions \\
  -H "Authorization: Bearer ${VERBAL_API_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Generate Music + Video",
    "method": "POST",
    "url": "${PUBLIC_BASE_URL}/api/generate/pipeline",
    "headers": {"Authorization": "Bearer ${DEFAULT_API_KEY}"},
    "bodySchema": {
      "musicPrompt": {"type": "string", "required": true},
      "genres": {"type": "array", "items": {"type": "string"}},
      "durationSec": {"type": "number", "default": 90},
      "artistInspiration": {"type": "array", "items": {"type": "string"}},
      "lyrics": {"type": "string"},
      "generateVideo": {"type": "boolean", "default": true},
      "videoStyle": {"type": "string", "enum": ["lyric", "official", "abstract"], "default": "lyric"}
    }
  }'`);