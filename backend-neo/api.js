export default function handler(request, response) {
  response.status(200).json({
    message: 'Root API is working',
    timestamp: new Date().toISOString()
  });
}