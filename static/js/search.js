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
        const selectedTopics = Array.from(topicFilter.selectedOptions).map(option => option.value);
        const selectedTags = Array.from(tagFilter.selectedOptions).map(option => option.value);
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
                            `<span class="badge bg-primary me-1" onclick="selectTopic('${topic}')" style="cursor: pointer;">${topic}</span>`
                        ).join('')}
                    </div>
                    <div class="tags mb-1">
                        ${lecture.tags.map(tag => 
                            `<span class="badge bg-info me-1" onclick="selectTag('${tag}')" style="cursor: pointer;">${tag}</span>`
                        ).join('')}
                    </div>
                    ${lecture.rank ? 
                        `<div class="rank mb-1">
                            <span class="badge bg-secondary">${lecture.rank}</span>
                        </div>` : ''
                    }
                </div>
            </div>
        `;
        return card;
    }

    // Filter by topic/tag
    window.selectTopic = function(topicName) {
        const option = Array.from(topicFilter.options).find(opt => opt.text === topicName);
        if (option) {
            option.selected = true;
            performSearch();
        }
    };

    window.selectTag = function(tagName) {
        const option = Array.from(tagFilter.options).find(opt => opt.text === tagName);
        if (option) {
            option.selected = true;
            performSearch();
        }
    };

    // Event listeners
    searchInput.addEventListener('input', () => debounce(performSearch, 300));
    topicFilter.addEventListener('change', performSearch);
    tagFilter.addEventListener('change', performSearch);
    rankFilter.addEventListener('change', performSearch);
    sortSelect.addEventListener('change', performSearch);

    // Initial search
    performSearch();
});