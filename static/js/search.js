document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const topicFilters = document.querySelectorAll('.topic-filter');
    const tagFilters = document.querySelectorAll('.tag-filter');
    const rankFilter = document.getElementById('rank-filter');
    const sortSelect = document.getElementById('sort-select');
    const resultsContainer = document.getElementById('results-container');
    
    let debounceTimer;
    
    // Debounce function
    function debounce(func, wait) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, wait);
    }
    
    // Search function
    function performSearch() {
        const searchQuery = searchInput.value;
        const selectedTopics = Array.from(topicFilters)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const selectedTags = Array.from(tagFilters)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const selectedRank = rankFilter.value;
        const sortBy = sortSelect.value;
        
        const queryParams = new URLSearchParams();
        queryParams.set('q', searchQuery);
        selectedTopics.forEach(topic => queryParams.append('topics[]', topic));
        selectedTags.forEach(tag => queryParams.append('tags[]', tag));
        if (selectedRank) queryParams.set('rank', selectedRank);
        queryParams.set('sort', sortBy);
        
        fetch(`/api/search?${queryParams.toString()}`)
            .then(response => response.json())
            .then(lectures => {
                resultsContainer.innerHTML = '';
                lectures.forEach(lecture => {
                    const card = createLectureCard(lecture);
                    resultsContainer.appendChild(card);
                });
            })
            .catch(error => console.error('Search error:', error));
    }
    
    // Create lecture card
    function createLectureCard(lecture) {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="lecture-card">
                <div class="lecture-thumbnail" data-video-id="${lecture.youtube_id}">
                    <img src="${lecture.thumbnail_url}" alt="${lecture.title}">
                    <i class="fas fa-play-circle play-button"></i>
                </div>
                <h3 class="lecture-title">${lecture.title}</h3>
                <div class="lecture-meta">
                    ${lecture.topics.map(topic => `<span class="badge bg-primary me-1">${topic}</span>`).join('')}
                    ${lecture.rank ? `<span class="badge bg-secondary">${lecture.rank}</span>` : ''}
                </div>
            </div>
        `;
        
        card.querySelector('.lecture-thumbnail').addEventListener('click', function() {
            const videoId = this.dataset.videoId;
            openVideoModal(videoId);
        });
        
        return card;
    }
    
    // Event listeners
    searchInput.addEventListener('input', () => debounce(performSearch, 300));
    topicFilters.forEach(cb => cb.addEventListener('change', performSearch));
    tagFilters.forEach(cb => cb.addEventListener('change', performSearch));
    rankFilter.addEventListener('change', performSearch);
    sortSelect.addEventListener('change', performSearch);
    
    // Initial search
    performSearch();
});
