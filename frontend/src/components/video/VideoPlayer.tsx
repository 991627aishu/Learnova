import { useState, memo } from "react";
import { Loader2 } from "lucide-react";

interface VideoPlayerProps {
  videoUrl?: string;
  videoType?: string;
  title?: string;
  className?: string;
}

// Function to extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

export function VideoPlayer({ videoUrl, videoType, title, className = "" }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!videoUrl || !videoType) {
    return (
      <div className={`w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center ${className}`}>
        <p className="text-gray-500">No video available</p>
      </div>
    );
  }

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  if (videoType === "youtube") {
    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      return (
        <div className={`w-full h-64 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center ${className}`}>
          <p className="text-red-600 text-sm">Invalid YouTube URL</p>
        </div>
      );
    }

    return (
      <div className={`relative w-full h-[90vh] bg-black overflow-hidden ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1&autoplay=0`}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={handleLoad}
          onError={handleError}
          title={title || "Video"}
          loading="lazy"
        />
      </div>
    );
  }

  if (videoType === "upload") {
    // Extract lecture ID from URL to use protected endpoint
    const lectureId = videoUrl.includes('/lectures/') ? videoUrl.split('/lectures/')[1].split('/')[0] : null;
    const protectedVideoUrl = lectureId ? `/api/lectures/${lectureId}/video` : videoUrl;

    return (
      <div className={`relative w-full h-[90vh] bg-black overflow-hidden ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        {hasError ? (
          <div className="w-full h-full flex items-center justify-center bg-red-50">
            <p className="text-red-600">Failed to load video</p>
          </div>
        ) : (
          <video
            controls
            className="w-full h-full object-contain"
            onCanPlay={handleCanPlay}
            onLoadedData={handleLoad}
            onError={handleError}
            preload="metadata"
            playsInline
            muted={false}
          >
            <source src={protectedVideoUrl} type="video/mp4" />
            <source src={protectedVideoUrl} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center ${className}`}>
      <p className="text-gray-500">Unsupported video type</p>
    </div>
  );
}

export const VideoPlayerComponent = memo(VideoPlayer);
