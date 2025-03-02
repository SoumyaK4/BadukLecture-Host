document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const topicFilter = document.getElementById('topic-filter');
    const tagFilter = document.getElementById('tag-filter');
    const rankFilter = document.getElementById('rank-filter');
    const sortSelect = document.getElementById('sort-select');
    const resultsContainer = document.getElementById('results-container');
    const loadMoreBtn = document.getElementById('load-more');

    let currentPage = 1;
    let debounceTimer;

    // Debounce function
    function debounce(func, wait) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, wait);
    }

    // Search function
    function performSearch(resetPage = true) {
        if (resetPage) {
            currentPage = 1;
        }

        const searchQuery = searchInput.value;
        const selectedTopic = topicFilter.value;
        const selectedTag = tagFilter.value;
        const selectedRank = rankFilter.value;
        const sortBy = sortSelect.value;

        const queryParams = new URLSearchParams();
        queryParams.set('q', searchQuery);
        queryParams.set('page', currentPage);
        if (selectedTopic) queryParams.append('topics[]', selectedTopic);
        if (selectedTag) queryParams.append('tags[]', selectedTag);
        if (selectedRank) queryParams.set('rank', selectedRank);
        queryParams.set('sort', sortBy);

        fetch(`/api/search?${queryParams.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (resetPage) {
                    resultsContainer.innerHTML = '';
                }

                data.lectures.forEach(lecture => {
                    const card = createLectureCard(lecture);
                    resultsContainer.appendChild(card);
                });

                loadMoreBtn.style.display = data.has_next ? 'block' : 'none';
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
                            `<span class="badge bg-primary me-1" onclick="window.location.href='/search?topic=${topic}'">${topic}</span>`
                        ).join('')}
                    </div>
                    <div class="tags mb-1">
                        ${lecture.tags.map(tag => 
                            `<span class="badge bg-info me-1" onclick="window.location.href='/search?tag=${tag}'">${tag}</span>`
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
let currentPage = 1;
let hasMore = false;
let isLoading = false;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize search
    performSearch();

    // Add event listeners
    document.getElementById('search-input').addEventListener('input', debounce(function() {
        resetSearch();
        performSearch();
    }, 300));

    document.getElementById('topic-filter').addEventListener('change', function() {
        resetSearch();
        performSearch();
    });

    document.getElementById('tag-filter').addEventListener('change', function() {
        resetSearch();
        performSearch();
    });

    document.getElementById('rank-filter').addEventListener('change', function() {
        resetSearch();
        performSearch();
    });

    document.getElementById('sort-select').addEventListener('change', function() {
        resetSearch();
        performSearch();
    });

    document.getElementById('load-more').addEventListener('click', function() {
        currentPage++;
        performSearch(true);
    });
});

function resetSearch() {
    currentPage = 1;
    document.getElementById('results-container').innerHTML = '';
    document.getElementById('load-more').style.display = 'none';
}

function performSearch(append = false) {
    if (isLoading) return;
    isLoading = true;

    const query = document.getElementById('search-input').value;
    const topicId = document.getElementById('topic-filter').value;
    const tagId = document.getElementById('tag-filter').value;
    const rankId = document.getElementById('rank-filter').value;
    const sortBy = document.getElementById('sort-select').value;

    let url = `/api/search?page=${currentPage}&q=${encodeURIComponent(query)}&sort=${sortBy}`;
    
    if (topicId) {
        url += `&topics[]=${topicId}`;
    }
    
    if (tagId) {
        url += `&tags[]=${tagId}`;
    }
    
    if (rankId) {
        url += `&rank=${rankId}`;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.lectures && data.lectures.length > 0) {
                displayResults(data.lectures, append);
                hasMore = data.has_next;
                document.getElementById('load-more').style.display = hasMore ? 'block' : 'none';
            } else if (!append) {
                document.getElementById('results-container').innerHTML = '<div class="col-12 text-center"><p>No lectures found.</p></div>';
                document.getElementById('load-more').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Search error:', error);
        })
        .finally(() => {
            isLoading = false;
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
                        `<span class="badge bg-primary me-1">${topic}</span>`
                    ).join('')}
                </div>
                <div class="tags mb-1">
                    ${lecture.tags.map(tag => 
                        `<span class="badge bg-info me-1">${tag}</span>`
                    ).join('')}
                </div>
                ${lecture.rank ? 
                    `<div class="rank mb-1">
                        <span class="badge bg-secondary">${lecture.rank}</span>
                    </div>` : ''}
                <div class="date text-muted small">
                    ${new Date(lecture.publish_date).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
                </div>
            </div>
        </div>
    `;
    return card;
}

function displayResults(lectures, append) {
    const container = document.getElementById('results-container');
    
    if (!append) {
        container.innerHTML = '';
    }
    
    lectures.forEach(lecture => {
        const card = createLectureCard(lecture);
        container.appendChild(card);
    });
}

// Debounce function to limit how often a function can be called
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
