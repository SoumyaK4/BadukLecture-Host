
document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('search-form');
    const searchResults = document.getElementById('search-results');
    const loadMoreBtn = document.getElementById('load-more');
    
    let currentPage = 1;
    let hasNext = false;
    let currentParams = {};
    
    // Initial load
    fetchLectures();
    
    // Form submission
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        currentPage = 1;
        fetchLectures();
    });
    
    // Load more button
    loadMoreBtn.addEventListener('click', function() {
        currentPage++;
        fetchLectures(true);
    });
    
    function getFormData() {
        const formData = new FormData(searchForm);
        const data = {
            q: formData.get('q') || '',
            sort: formData.get('sort') || 'date',
            page: currentPage
        };
        
        // Handle topics (checkboxes)
        const topics = formData.getAll('topics[]');
        if (topics.length) {
            data['topics[]'] = topics;
        }
        
        // Handle tags (checkboxes)
        const tags = formData.getAll('tags[]');
        if (tags.length) {
            data['tags[]'] = tags;
        }
        
        // Handle rank (select)
        const rank = formData.get('rank');
        if (rank) {
            data.rank = rank;
        }
        
        return data;
    }
    
    function fetchLectures(append = false) {
        // Show loading state
        if (!append) {
            searchResults.innerHTML = '<div class="loading">Loading...</div>';
        }
        loadMoreBtn.style.display = 'none';
        
        // Get form data
        currentParams = getFormData();
        
        // Build query string
        const queryString = new URLSearchParams();
        
        for (const [key, value] of Object.entries(currentParams)) {
            if (Array.isArray(value)) {
                value.forEach(v => queryString.append(key, v));
            } else {
                queryString.append(key, value);
            }
        }
        
        // Fetch lectures
        fetch(`/api/search?${queryString.toString()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Update UI
                updateResults(data, append);
            })
            .catch(error => {
                console.error('Search error:', error);
                searchResults.innerHTML = '<div class="error">An error occurred while searching. Please try again.</div>';
            });
    }
    
    function updateResults(data, append) {
        // Store pagination info
        hasNext = data.has_next;
        
        // Update lectures
        if (data.lectures.length === 0) {
            if (!append) {
                searchResults.innerHTML = '<div class="no-results">No lectures found matching your criteria.</div>';
            }
            return;
        }
        
        // Create HTML for lectures
        const html = data.lectures.map(lecture => {
            return `
            <div class="lecture-card">
                <a href="https://youtu.be/${lecture.youtube_id}" target="_blank">
                    <div class="thumbnail">
                        <img src="${lecture.thumbnail_url}" alt="${lecture.title}">
                    </div>
                    <div class="content">
                        <h3>${lecture.title}</h3>
                        <div class="metadata">
                            <span class="date">${new Date(lecture.publish_date).toLocaleDateString()}</span>
                            ${lecture.rank ? `<span class="rank">${lecture.rank}</span>` : ''}
                        </div>
                        <div class="tags">
                            ${lecture.topics.map(topic => `<span class="topic">${topic}</span>`).join('')}
                            ${lecture.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                </a>
            </div>
            `;
        }).join('');
        
        // Update DOM
        if (append) {
            searchResults.innerHTML += html;
        } else {
            searchResults.innerHTML = html;
        }
        
        // Show/hide load more button
        loadMoreBtn.style.display = hasNext ? 'block' : 'none';
    }
});
