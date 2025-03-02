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
function openVideoModal(videoId) {
    // Check if modal already exists, if not create it
    let videoModal = document.getElementById('videoModal');
    
    if (!videoModal) {
        // Create modal structure
        videoModal = document.createElement('div');
        videoModal.id = 'videoModal';
        videoModal.className = 'modal fade';
        videoModal.setAttribute('tabindex', '-1');
        videoModal.setAttribute('aria-labelledby', 'videoModalLabel');
        videoModal.setAttribute('aria-hidden', 'true');
        
        videoModal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="videoModalLabel">Lecture Video</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="ratio ratio-16x9">
                            <iframe id="videoFrame" src="" title="YouTube video player" frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen></iframe>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(videoModal);
    }
    
    // Set the video source
    const videoFrame = document.getElementById('videoFrame');
    videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    
    // Initialize and show the modal
    const modal = new bootstrap.Modal(videoModal);
    modal.show();
    
    // Clean up when modal is closed
    videoModal.addEventListener('hidden.bs.modal', function () {
        videoFrame.src = '';
    });
}
