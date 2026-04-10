import sys
import argparse
import re
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

def get_video_id(url):
    """
    Extracts the video ID from a YouTube URL.
    Supports various YouTube URL formats.
    """
    # Regular expression to find the video ID in different YouTube URL formats
    regex = r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})'
    match = re.search(regex, url)
    if match:
        return match.group(1)
    return url  # Assume it's already a video ID if no URL pattern matches

def download_transcript(video_id, languages=['en']):
    """
    Downloads the transcript for a given video ID.
    """
    try:
        # Fetch the transcript
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
        return transcript
    except Exception as e:
        print(f"Error downloading transcript for video {video_id}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Download YouTube video transcripts.")
    parser.add_argument("url", help="The YouTube video URL or video ID.")
    parser.add_argument("-o", "--output", help="Output file path (optional). If not provided, prints to console.")
    parser.add_argument("-l", "--languages", nargs='+', default=['en'], help="List of language codes to try (default: en).")
    
    args = parser.parse_args()
    
    video_id = get_video_id(args.url)
    
    if not video_id or len(video_id) != 11:
        print(f"Error: Could not extract a valid 11-character video ID from '{args.url}'")
        sys.exit(1)
        
    print(f"Processing video ID: {video_id}")
    
    transcript = download_transcript(video_id, args.languages)
    
    if transcript:
        # Use TextFormatter to get a clean text output
        formatter = TextFormatter()
        formatted_transcript = formatter.format_transcript(transcript)
        
        if args.output:
            try:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(formatted_transcript)
                print(f"Successfully saved transcript to: {args.output}")
            except IOError as e:
                print(f"Error saving to file: {e}")
        else:
            print("\n--- Transcript Start ---\n")
            print(formatted_transcript)
            print("\n--- Transcript End ---")
    else:
        print("Failed to retrieve transcript. Ensure the video has captions enabled for the requested languages.")

if __name__ == "__main__":
    main()
