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
                <div class="close-video">&times;</div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Create YouTube player
        player = new YT.Player('youtube-player', {
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                modestbranding: 1,
                rel: 0
            }
        });
        
        // Close button handler
        const closeBtn = modal.querySelector('.close-video');
        closeBtn.onclick = function() {
            if (player) {
                player.destroy();
                player = null;
            }
            modal.remove();
        };
        
        // Close on background click
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeBtn.click();
            }
        };
        
        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeBtn.click();
            }
        });
    };
});
