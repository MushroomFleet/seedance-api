# Seedance Video Generator

A local MVP application for generating high-quality videos from images and text prompts using ByteDance's Seedance AI model via FAL.ai. This application provides a clean interface for image-to-video generation with local storage and gallery management.

## Features

- **Image-to-Video Generation**: Generate 5-10 second videos from uploaded images with descriptive text prompts
- **Multiple Quality Options**: Support for 480p and 720p resolutions
- **Camera Control**: Fixed camera position option for less motion
- **Image Processing**: Automatic image optimization and base64 conversion
- **Local Storage**: Videos automatically saved to `./output/` directory
- **Gallery Management**: Browse, preview, download, and delete generated videos
- **Progress Tracking**: Real-time generation progress with queue updates
- **Cost Effective**: Uses Seedance 1.0 Lite model at $0.18 per 5-second video

## Technology Stack

- **Frontend**: Next.js 15.3.5, React 18, TypeScript, Tailwind CSS
- **API Integration**: FAL.ai client with server-side proxy
- **Storage**: Local file system with JSON metadata
- **State Management**: Zustand for client state, React hooks

## Prerequisites

- Node.js 18+ 
- npm or yarn
- FAL.ai API key

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env.local
   ```

4. Add your FAL.ai API key to `.env.local`:
   ```
   FAL_KEY_SECRET=your_fal_api_key_here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Getting FAL.ai API Key

1. Visit [https://fal.ai/](https://fal.ai/)
2. Sign up for an account
3. Navigate to your dashboard
4. Generate an API key
5. Copy the key to your `.env.local` file

## Usage

### Generating Videos

1. **Upload an image**: Click to upload a PNG, JPG, or WEBP image (up to 10MB)
2. **Enter a descriptive prompt**: Describe how you want the image to move and animate
3. **Adjust settings**:
   - **Duration**: 5s ($0.18) or 10s ($0.36)
   - **Resolution**: 480p or 720p
   - **Camera Fixed**: Enable for less camera movement (more stable)
4. Click "Generate Video"
5. Wait for generation to complete (progress bar shows status)
6. Video is automatically saved to `./output/videos/`

### Managing Videos

- Click "View Gallery" to open the gallery modal
- Browse generated videos in grid view
- Click on a video to preview it
- Download videos directly from the gallery
- Delete unwanted videos
- View metadata including generation parameters

## File Structure

```
/SEEDANCE-FAL/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── fal/proxy/[[...path]]/  # FAL.ai API proxy
│   │   │   └── videos/save/route.ts    # Video storage API
│   │   ├── layout.tsx                  # App layout
│   │   ├── page.tsx                    # Main page
│   │   └── globals.css                 # Global styles
│   ├── components/
│   │   ├── VideoGenerationForm.tsx     # Image-to-video generation form
│   │   └── GalleryModal.tsx            # Video gallery modal
│   ├── lib/
│   │   └── fal-client.ts               # FAL.ai client with retry logic
│   └── types/
│       └── video.ts                    # TypeScript interfaces
├── docs/
│   └── SEEDANCE-DEVTEAM-HANDOFF.md     # Technical specification
├── output/
│   └── videos/                         # Generated video files
├── public/
│   ├── videos/                         # Public video storage
│   └── metadata.json                   # Video metadata
├── package.json
├── next.config.js
├── tailwind.config.js
└── README.md
```

## Configuration

### Environment Variables

- `FAL_KEY_SECRET`: Your FAL.ai API key (required)
- `NODE_ENV`: Set to 'development' for detailed error messages

### Video Settings

- **Model**: Uses `fal-ai/bytedance/seedance/v1/lite/image-to-video`
- **Cost**: $0.18 per 5-second 720p video
- **Formats**: MP4 with H.264 encoding
- **Frame Rate**: 24 FPS

## Local Storage

Videos are stored in the `./output/` directory:
- Video files: `./output/videos/*.mp4`
- Metadata: `./output/metadata.json`

The metadata file contains:
- Video information (title, description, tags)
- Generation parameters
- File paths and timestamps
- Statistics

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Run `npm install` to ensure all dependencies are installed
2. **API errors**: Check that your FAL_KEY_SECRET is correct in `.env.local`
3. **Videos not saving**: Ensure the application has write permissions to the project directory
4. **Generation fails**: Check console logs for detailed error messages

### Error Messages

- **"Upload Image First"**: You must upload an image before generating a video
- **"Add Description"**: Enter a text description of how the image should animate
- **"Failed to download video"**: Network issue or FAL.ai service unavailable
- **"Video not found"**: File may have been moved or deleted manually
- **"Image file size must be less than 10MB"**: Choose a smaller image file
- **"Please select a valid image file"**: Only PNG, JPG, and WEBP formats are supported

## Deployment

For local use only. To deploy:

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

## Cost Considerations

- **5-second videos**: $0.18 each
- **10-second videos**: $0.36 each
- Monitor usage in FAL.ai dashboard
- Videos are generated server-side, no client-side costs

## Contributing

This is a local MVP application. For enhancements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for personal/local use. Check FAL.ai terms for commercial usage.

## Support

- FAL.ai Documentation: [https://docs.fal.ai/](https://docs.fal.ai/)
- Next.js Documentation: [https://nextjs.org/docs](https://nextjs.org/docs)
- Issues: Check console logs for detailed error messages

## Version History

- **v0.1.0**: Initial MVP release with image-to-video generation and gallery features
- **Documentation Updated**: January 2025 - README updated to reflect current implementation
