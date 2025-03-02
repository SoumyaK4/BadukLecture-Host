import os
import requests
from urllib.parse import urlparse, parse_qs
from datetime import datetime
from app import app

def get_youtube_video_info(url):
    # Extract video ID from URL
    parsed_url = urlparse(url)
    if parsed_url.hostname == 'youtu.be':
        # Handle youtu.be short URLs
        path_parts = parsed_url.path.split('/')
        video_id = path_parts[1].split('?')[0]  # Remove any query parameters
    else:
        # Handle regular youtube.com URLs
        query_params = parse_qs(parsed_url.query)
        video_id = query_params.get('v', [''])[0]

    if not video_id:
        raise Exception('Could not extract video ID from URL')

    # Get video info from YouTube API
    api_key = app.config['YOUTUBE_API_KEY']
    api_url = f'https://www.googleapis.com/youtube/v3/videos?id={video_id}&key={api_key}&part=snippet'

    response = requests.get(api_url)
    if response.status_code != 200:
        raise Exception('Failed to fetch video info from YouTube API')

    data = response.json()
    if not data.get('items'):
        raise Exception('Video not found')

    video_data = data['items'][0]['snippet']

    return {
        'youtube_id': video_id,
        'thumbnail_url': video_data['thumbnails']['high']['url'],
        'publish_date': datetime.strptime(video_data['publishedAt'], '%Y-%m-%dT%H:%M:%SZ')
    }