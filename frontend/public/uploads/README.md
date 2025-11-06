# Profile Pictures Storage

This directory stores user profile pictures.

## Structure:
- `profiles/` - User profile photos
- Format: `{userId}.{extension}` (e.g., `user123.jpg`)
- Max size: 5MB per image
- Supported formats: JPG, PNG, GIF

## Security Notes:
- Images should be validated server-side
- Consider image optimization/resizing
- Implement proper access controls