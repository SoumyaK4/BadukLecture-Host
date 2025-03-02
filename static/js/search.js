document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const topicFilter = document.getElementById('topic-filter');
    const tagFilter = document.getElementById('tag-filter');
    const rankFilter = document.getElementById('rank-filter');
    const sortSelect = document.getElementById('sort-select');
    const resultsContainer = document.getElementById('results-container');
    const loadMoreBtn = document.getElementById('load-more');

    let currentPage = 1;
    let isLoading = false;
    let debounceTimer;

    // Debounce function
    function debounce(func, wait) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, wait);
    }

    // Reset search
    function resetSearch() {
        currentPage = 1;
        resultsContainer.innerHTML = '';
        loadMoreBtn.style.display = 'none';
    }

    // Search function
    function performSearch(resetPage = true) {
        if (isLoading) return;
        isLoading = true;

        if (resetPage) {
            resetSearch();
        }

        const searchQuery = searchInput.value;
        const selectedTopic = topicFilter.value;
        const selectedTag = tagFilter.value;
        const selectedRank = rankFilter.value;
        const sortBy = sortSelect.value;

        let url = `/api/search?page=${currentPage}&q=${encodeURIComponent(searchQuery)}&sort=${sortBy}`;

        if (selectedTopic) {
            url += `&topics[]=${selectedTopic}`;
        }

        if (selectedTag) {
            url += `&tags[]=${selectedTag}`;
        }

        if (selectedRank) {
            url += `&rank=${selectedRank}`;
        }

        // Show loading state
        if (currentPage === 1) {
            resultsContainer.innerHTML = '<div class="text-center my-5"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                // Remove loading indicator if it's the first page
                if (currentPage === 1) {
                    resultsContainer.innerHTML = '';
                }

                if (data.lectures.length === 0 && currentPage === 1) {
                    resultsContainer.innerHTML = '<div class="col-12 text-center my-5"><p>No lectures found matching your criteria.</p></div>';
                    loadMoreBtn.style.display = 'none';
                    return;
                }

                // Append lectures to the container
                data.lectures.forEach(lecture => {
                    const lectureEl = document.createElement('div');
                    lectureEl.className = 'col-md-4 col-sm-6 mb-4';
                    lectureEl.innerHTML = `
                        <div class="card h-100">
                            <div class="card-img-top position-relative">
                                <img src="${lecture.thumbnail_url}" alt="${lecture.title}" class="img-fluid">
                                <button class="play-btn" data-youtube-id="${lecture.youtube_id}">
                                    <i class="bi bi-play-circle-fill"></i>
                                </button>
                            </div>
                            <div class="card-body">
                                <h5 class="card-title">${lecture.title}</h5>
                                <div class="card-meta">
                                    <small class="text-muted">
                                        ${new Date(lecture.publish_date).toLocaleDateString()}
                                    </small>
                                    ${lecture.rank ? `<span class="badge bg-primary ms-2">${lecture.rank}</span>` : ''}
                                </div>
                                <div class="card-tags mt-2">
                                    ${lecture.topics.map(topic => `<span class="badge bg-secondary me-1">${topic}</span>`).join('')}
                                    ${lecture.tags.map(tag => `<span class="badge bg-info me-1">${tag}</span>`).join('')}
                                </div>
                            </div>
                        </div>
                    `;
                    resultsContainer.appendChild(lectureEl);
                });

                // Show/hide load more button
                if (data.has_next) {
                    loadMoreBtn.style.display = 'inline-block';
                } else {
                    loadMoreBtn.style.display = 'none';
                }

                // Update UI state
                isLoading = false;
            })
            .catch(error => {
                console.error('Search error:', error);
                if (currentPage === 1) {
                    resultsContainer.innerHTML = '<div class="col-12 text-center my-5"><p>An error occurred while fetching results. Please try again.</p></div>';
                }
                isLoading = false;
            });
    }

    // Event listeners
    searchInput.addEventListener('input', () => debounce(() => performSearch(true), 300));
    topicFilter.addEventListener('change', () => performSearch(true));
    tagFilter.addEventListener('change', () => performSearch(true));
    rankFilter.addEventListener('change', () => performSearch(true));
    sortSelect.addEventListener('change', () => performSearch(true));

    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        performSearch(false);
    });

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
    performSearch(true);
});