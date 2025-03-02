import os
import requests
from urllib.parse import urlparse, parse_qs
from datetime import datetime
from app import app
import logging

def get_youtube_video_info(url):
    logging.debug(f"Processing YouTube URL: {url}")

    # Extract video ID from URL
    parsed_url = urlparse(url)
    video_id = None

    try:
        if parsed_url.hostname == 'youtu.be':
            # Handle youtu.be short URLs
            video_id = parsed_url.path.lstrip('/').split('?')[0]
            logging.debug(f"Extracted video ID from youtu.be URL: {video_id}")
        elif parsed_url.hostname in ['www.youtube.com', 'youtube.com']:
            # Handle regular youtube.com URLs
            if 'v' in parse_qs(parsed_url.query):
                video_id = parse_qs(parsed_url.query)['v'][0]
            elif 'live' in parsed_url.path:
                # Handle live URLs
                video_id = parsed_url.path.split('/live/')[1].split('?')[0]
            logging.debug(f"Extracted video ID from youtube.com URL: {video_id}")
        else:
            logging.error(f"Unsupported URL hostname: {parsed_url.hostname}")
            raise Exception('Invalid YouTube URL')

    except Exception as e:
        logging.error(f"Error parsing YouTube URL: {str(e)}")
        raise Exception('Could not extract video ID from URL')

    if not video_id:
        logging.error("No video ID found in URL")
        raise Exception('Could not extract video ID from URL')

    # Get video info from YouTube API
    api_key = app.config['YOUTUBE_API_KEY']
    api_url = f'https://www.googleapis.com/youtube/v3/videos?id={video_id}&key={api_key}&part=snippet'

    logging.debug(f"Fetching video info for ID: {video_id}")
    try:
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        logging.error(f"YouTube API request error: {str(e)}")
        raise Exception(f'Failed to fetch video info from YouTube API: {str(e)}')

    if response.status_code != 200:
        logging.error(f"YouTube API error: {response.status_code} - {response.text}")
        raise Exception(f'YouTube API responded with code {response.status_code}')

    data = response.json()
    if not data.get('items'):
        logging.error(f"No video found for ID: {video_id}")
        raise Exception('Video not found')

    video_data = data['items'][0]['snippet']
    logging.debug(f"Successfully retrieved video data for ID: {video_id}")

    return {
        'youtube_id': video_id,
        'thumbnail_url': video_data['thumbnails']['high']['url'],
        'publish_date': datetime.strptime(video_data['publishedAt'], '%Y-%m-%dT%H:%M:%SZ')
    }