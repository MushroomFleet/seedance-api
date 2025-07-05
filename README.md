# Seedance Video Generator

A local MVP application for generating high-quality videos from text prompts using ByteDance's Seedance AI model via FAL.ai. This application provides a clean interface for video generation with local storage and gallery management.

## Features

- **Text-to-Video Generation**: Generate 5-10 second videos from descriptive prompts
- **Multiple Quality Options**: Support for 480p and 720p resolutions
- **Flexible Aspect Ratios**: 16:9, 9:16, and 1:1 aspect ratio support
- **Motion Control**: Adjustable motion intensity (0.0 - 1.0)
- **Local Storage**: Videos automatically saved to `./output/` directory
- **Gallery Management**: Browse, preview, download, and delete generated videos
- **Progress Tracking**: Real-time generation progress with queue updates
- **Cost Effective**: Uses Seedance 1.0 Lite model at $0.18 per 5-second video

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **API Integration**: FAL.ai client with server-side proxy
- **Storage**: Local file system with JSON metadata
- **State Management**: React hooks with local state

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
   cp .env.example .env.local
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

1. Enter a descriptive prompt in the text area
2. Adjust settings:
   - **Duration**: 5s ($0.18) or 10s ($0.36)
   - **Resolution**: 480p or 720p
   - **Aspect Ratio**: 16:9 (landscape), 9:16 (portrait), or 1:1 (square)
   - **Motion Intensity**: 0.0 (subtle) to 1.0 (dynamic)
   - **Prompt Optimizer**: Enable for enhanced prompts
3. Click "Generate Video"
4. Wait for generation to complete (progress bar shows status)
5. Video is automatically saved to `./output/videos/`

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
│   │   ├── api/fal/proxy/route.ts     # FAL.ai API proxy
│   │   ├── api/videos/save/route.ts   # Video storage API
│   │   ├── layout.tsx                 # App layout
│   │   ├── page.tsx                   # Main page
│   │   └── globals.css                # Global styles
│   ├── components/
│   │   ├── VideoGenerationForm.tsx    # Generation form
│   │   └── GalleryModal.tsx           # Video gallery
│   ├── lib/
│   │   ├── fal-client.ts              # FAL.ai client
│   │   └── file-manager.ts            # Local file management
│   └── types/
│       └── video.ts                   # TypeScript interfaces
├── output/
│   ├── videos/                        # Generated video files
│   └── metadata.json                  # Video metadata
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

- **Model**: Uses `fal-ai/seedance/v1/lite/image-to-video`
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

- **"Prompt is required"**: Enter a text description before generating
- **"Failed to download video"**: Network issue or FAL.ai service unavailable
- **"Video not found"**: File may have been moved or deleted manually

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

- **v1.0.0**: Initial MVP release with core video generation and gallery features
