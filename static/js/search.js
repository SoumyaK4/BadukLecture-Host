document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const topicFilter = document.getElementById('topic-filter');
    const tagFilter = document.getElementById('tag-filter');
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
        const selectedTopic = topicFilter.value;
        const selectedTag = tagFilter.value;
        const selectedRank = rankFilter.value;
        const sortBy = sortSelect.value;

        const queryParams = new URLSearchParams();
        queryParams.set('q', searchQuery);
        if (selectedTopic) queryParams.append('topics[]', selectedTopic);
        if (selectedTag) queryParams.append('tags[]', selectedTag);
        if (selectedRank) queryParams.set('rank', selectedRank);
        queryParams.set('sort', sortBy);

        fetch(`/api/search?${queryParams.toString()}`)
            .then(response => response.json())
            .then(lectures => {
                resultsContainer.innerHTML = '';
                if (lectures.length === 0) {
                    resultsContainer.innerHTML = '<div class="col-12"><div class="alert alert-info">No lectures found matching your criteria.</div></div>';
                    return;
                }
                lectures.forEach(lecture => {
                    const card = createLectureCard(lecture);
                    resultsContainer.appendChild(card);
                });
            })
            .catch(error => {
                console.error('Search error:', error);
                resultsContainer.innerHTML = '<div class="col-12"><div class="alert alert-danger">Error loading lectures. Please try again.</div></div>';
            });
    }

    // Create lecture card
    function createLectureCard(lecture) {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="lecture-card">
                <div class="lecture-thumbnail" onclick="openVideoModal('${lecture.youtube_id}')" style="cursor: pointer;">
                    <img src="${lecture.thumbnail_url}" alt="${lecture.title}">
                    <i class="fas fa-play-circle play-button"></i>
                </div>
                <h3 class="lecture-title" onclick="openVideoModal('${lecture.youtube_id}')" style="cursor: pointer;">
                    ${lecture.title}
                </h3>
                <div class="lecture-meta">
                    <div class="topics mb-1">
                        ${lecture.topics.map(topic => 
                            `<span class="badge bg-primary me-1" onclick="window.location.href='/search?topic=${encodeURIComponent(topic)}'" style="cursor: pointer;">${topic}</span>`
                        ).join('')}
                    </div>
                    <div class="tags mb-1">
                        ${lecture.tags.map(tag => 
                            `<span class="badge bg-info me-1" onclick="window.location.href='/search?tag=${encodeURIComponent(tag)}'" style="cursor: pointer;">${tag}</span>`
                        ).join('')}
                    </div>
                    ${lecture.rank ? 
                        `<div class="rank mb-1">
                            <span class="badge bg-secondary">${lecture.rank}</span>
                        </div>` : ''
                    }
                    <div class="date text-muted small">
                        ${new Date(lecture.publish_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    // Event listeners
    searchInput.addEventListener('input', () => debounce(performSearch, 300));
    topicFilter.addEventListener('change', performSearch);
    tagFilter.addEventListener('change', performSearch);
    rankFilter.addEventListener('change', performSearch);
    sortSelect.addEventListener('change', performSearch);

    // Get URL parameters and set initial filter values
    const urlParams = new URLSearchParams(window.location.search);
    const topic = urlParams.get('topic');
    const tag = urlParams.get('tag');

    if (topic) {
        const option = Array.from(topicFilter.options).find(opt => opt.text === topic);
        if (option) option.selected = true;
    }
    if (tag) {
        const option = Array.from(tagFilter.options).find(opt => opt.text === tag);
        if (option) option.selected = true;
    }

    // Initial search
    performSearch();
});