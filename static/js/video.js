document.addEventListener('DOMContentLoaded', function() {
    let player = null;

    // Load YouTube API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.openVideoModal = function(videoId) {
        const modal = document.createElement('div');
        modal.className = 'video-modal';
        modal.innerHTML = `
            <div class="video-container">
                <div id="youtube-player"></div>
                <button class="close-video">&times;</button>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // Create YouTube player
        if (window.YT && window.YT.Player) {
            createPlayer();
        } else {
            // If YT API is not loaded yet, wait for it
            window.onYouTubeIframeAPIReady = createPlayer;
        }

        function createPlayer() {
            player = new YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0
                }
            });
        }

        // Close button handler
        const closeBtn = modal.querySelector('.close-video');
        closeBtn.onclick = closeModal;

        // Close on background click
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeModal();
            }
        };

        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });

        function closeModal() {
            if (player) {
                player.destroy();
                player = null;
            }
            modal.remove();
        }
    };
});