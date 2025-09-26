// Global variables
let currentDate = new Date();
let currentUser = '';
let events = [];
let tasks = [];
let morphChartData = null;

// PDF Viewer variables
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let currentZoom = 1.0;
let currentPDFUrl = '';
let currentPDFTitle = '';

// Edit mode state
let editMode = {
    events: false,
    links: false,
    tasks: false
};

// Default links with PDFs stored in the repository
let links = {
    course: [
        { title: "Concept Generation Guide", url: "pdfs/Concept Generation Guide.pdf" }
    ],
    technical: [
        { title: "Capacitors and Motors", url: "pdfs/Capacitors and Motors.pdf" }
    ],
    communication: [
        { title: "Discord Server", url: "https://discord.gg/example" },
        { title: "Slack Workspace", url: "https://slack.com/example" },
        { title: "Google Drive", url: "https://drive.google.com/example" }
    ],
    external: [
        { title: "Solar Car Competitions", url: "https://www.worldsolarchallenge.org/" },
        { title: "Engineering Forums", url: "https://www.engineering.com/" }
    ],
    documents: [
        { title: "Project Brief", url: "pdfs/Project Brief.pdf" }
    ]
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Script.js is working');
    loadFromLocalStorage();
    initializeCalendar();
    renderEvents();
    renderTasks();
    renderLinks();
    setupEventListeners();
});

// Load data from localStorage
function loadFromLocalStorage() {
    const savedEvents = localStorage.getItem('solarTruckEvents');
    const savedTasks = localStorage.getItem('solarTruckTasks');
    const savedLinks = localStorage.getItem('solarTruckLinks');
    const savedMorphChart = localStorage.getItem('solarTruckMorphChart');
    
    if (savedEvents) {
        events = JSON.parse(savedEvents);
    }
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
    if (savedLinks) {
        links = JSON.parse(savedLinks);
    }
    if (savedMorphChart) {
        morphChartData = JSON.parse(savedMorphChart);
    }
}

// Save data to localStorage
function saveToLocalStorage() {
    localStorage.setItem('solarTruckEvents', JSON.stringify(events));
    localStorage.setItem('solarTruckTasks', JSON.stringify(tasks));
    localStorage.setItem('solarTruckLinks', JSON.stringify(links));
    if (morphChartData) {
        localStorage.setItem('solarTruckMorphChart', JSON.stringify(morphChartData));
    }
}

// Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.removeItem('solarTruckEvents');
        localStorage.removeItem('solarTruckTasks');
        localStorage.removeItem('solarTruckLinks');
        localStorage.removeItem('solarTruckMorphChart');
        
        events = [];
        tasks = [];
        // Reset to default links with repository PDFs
        links = {
            course: [
                { title: "Concept Generation Guide", url: "pdfs/Concept Generation Guide.pdf" }
            ],
            technical: [
                { title: "Capacitors and Motors", url: "pdfs/Capacitors and Motors.pdf" }
            ],
            communication: [
                { title: "Discord Server", url: "https://discord.gg/example" },
                { title: "Slack Workspace", url: "https://slack.com/example" },
                { title: "Google Drive", url: "https://drive.google.com/example" }
            ],
            external: [
                { title: "Solar Car Competitions", url: "https://www.worldsolarchallenge.org/" },
                { title: "Engineering Forums", url: "https://www.engineering.com/" }
            ],
            documents: [
                { title: "Project Brief", url: "pdfs/Project Brief.pdf" }
            ]
        };
        morphChartData = null;
        
        // Save the reset links to localStorage
        saveToLocalStorage();
        
        renderEvents();
        renderTasks();
        renderLinks();
        
        showNotification('All data cleared and reset to default PDFs!');
    }
}

// User management
function saveUserName() {
    const userName = document.getElementById('userName').value.trim();
    if (userName) {
        currentUser = userName;
        localStorage.setItem('solarTruckUserName', userName);
        showNotification(`Welcome, ${userName}!`);
    }
}

function loadUserData() {
    const savedUser = localStorage.getItem('solarTruckUserName');
    if (savedUser) {
        currentUser = savedUser;
        document.getElementById('userName').value = savedUser;
    }
}

// PDF Viewer Functions
function openPDFViewer(pdfUrl, title) {
    currentPDFUrl = pdfUrl;
    currentPDFTitle = title;
    document.getElementById('pdfModal').style.display = 'block';
    document.getElementById('pdfTitle').textContent = title;
    loadPDF(pdfUrl);
}

function closePDFViewer() {
    document.getElementById('pdfModal').style.display = 'none';
    pdfDoc = null;
    currentPage = 1;
    totalPages = 0;
    currentZoom = 1.0;
    currentPDFUrl = '';
    currentPDFTitle = '';
}

function loadPDF(url) {
    const loading = document.getElementById('pdfLoading');
    const error = document.getElementById('pdfError');
    const canvas = document.getElementById('pdfCanvas');
    
    loading.style.display = 'block';
    error.style.display = 'none';
    canvas.style.display = 'none';
    
    pdfjsLib.getDocument(url).promise.then(function(pdf) {
        pdfDoc = pdf;
        totalPages = pdf.numPages;
        currentPage = 1;
        renderPage(currentPage);
        updatePageInfo();
        updateNavigationButtons();
        updateZoomLevel();
        
        loading.style.display = 'none';
        canvas.style.display = 'block';
    }).catch(function(error) {
        console.error('Error loading PDF:', error);
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = 'Error loading PDF: ' + error.message;
    });
}

function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    pdfDoc.getPage(pageNum).then(function(page) {
        const canvas = document.getElementById('pdfCanvas');
        const ctx = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: currentZoom });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        page.render(renderContext);
    });
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
        updatePageInfo();
        updateNavigationButtons();
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
        updatePageInfo();
        updateNavigationButtons();
    }
}

function zoomIn() {
    currentZoom = Math.min(currentZoom * 1.2, 3.0);
    renderPage(currentPage);
    updateZoomLevel();
}

function zoomOut() {
    currentZoom = Math.max(currentZoom / 1.2, 0.5);
    renderPage(currentPage);
    updateZoomLevel();
}

function updatePageInfo() {
    document.getElementById('pdfPageInfo').textContent = `${currentPage} / ${totalPages}`;
}

function updateNavigationButtons() {
    document.getElementById('pdfPrevBtn').disabled = currentPage <= 1;
    document.getElementById('pdfNextBtn').disabled = currentPage >= totalPages;
}

function updateZoomLevel() {
    document.getElementById('pdfZoomLevel').textContent = Math.round(currentZoom * 100) + '%';
}

function downloadPDF() {
    if (currentPDFUrl) {
        const link = document.createElement('a');
        link.href = currentPDFUrl;
        link.download = currentPDFTitle + '.pdf';
        link.click();
    }
}

function isPDFUrl(url) {
    return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');
}

// Edit Mode Functions
function toggleEditMode(section) {
    editMode[section] = !editMode[section];
    updateEditModeUI(section);
    
    // Re-render the appropriate section
    if (section === 'events') {
        renderEvents();
    } else if (section === 'links') {
        renderLinks();
    } else if (section === 'tasks') {
        renderTasks();
    }
}

function updateEditModeUI(section) {
    const button = document.querySelector(`[onclick="toggleEditMode('${section}')"]`);
    if (button) {
        if (editMode[section]) {
            button.textContent = 'Done';
            button.classList.add('edit-active');
        } else {
            button.textContent = 'Edit';
            button.classList.remove('edit-active');
        }
    }
}

function isEditModeActive(section) {
    return editMode[section];
}

// Calendar Functions
function initializeCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    let calendarHTML = `
        <div class="calendar-header">
            <h3>${monthNames[currentMonth]} ${currentYear}</h3>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-header">Sun</div>
            <div class="calendar-day-header">Mon</div>
            <div class="calendar-day-header">Tue</div>
            <div class="calendar-day-header">Wed</div>
            <div class="calendar-day-header">Thu</div>
            <div class="calendar-day-header">Fri</div>
            <div class="calendar-day-header">Sat</div>
    `;
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = getEventsOnDate(dateString);
        const hasEvents = dayEvents.length > 0;
        const hasDetailedEvents = dayEvents.some(event => event.time || event.location);
        
        calendarHTML += `
            <div class="calendar-day ${hasEvents ? 'has-events' : ''} ${hasDetailedEvents ? 'has-detailed-event' : ''}" 
                 onclick="showDayEvents('${dateString}')">
                ${day}
                ${hasEvents ? `<div class="event-indicator"></div>` : ''}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    calendar.innerHTML = calendarHTML;
}

function getEventsOnDate(dateString) {
    return events.filter(event => event.date === dateString);
}

function showDayEvents(dateString) {
    const dayEvents = getEventsOnDate(dateString);
    if (dayEvents.length > 0) {
        let eventsList = 'Events for ' + new Date(dateString).toLocaleDateString() + ':\n\n';
        dayEvents.forEach(event => {
            eventsList += `• ${event.title}`;
            if (event.time) eventsList += ` (${event.time})`;
            if (event.location) eventsList += ` @ ${event.location}`;
            eventsList += '\n';
        });
        alert(eventsList);
    }
}

// Event Functions
function renderEvents() {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    
    eventsList.innerHTML = '';
    
    if (events.length === 0) {
        eventsList.innerHTML = '<p class="no-events">No events scheduled. Add your first event below!</p>';
        return;
    }
    
    events.forEach((event, index) => {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event-item';
        
        let eventHTML = `
            <div class="event-content">
                <h4>${event.title}</h4>
                <p class="event-date">${new Date(event.date).toLocaleDateString()}</p>
        `;
        
        if (event.time) {
            eventHTML += `<p class="event-time"><i class="fas fa-clock"></i> ${event.time}</p>`;
        }
        
        if (event.location) {
            eventHTML += `<p class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</p>`;
        }
        
        if (event.description) {
            eventHTML += `<p class="event-description">${event.description}</p>`;
        }
        
        eventHTML += '</div>';
        
        if (editMode.events) {
            eventHTML += `
                <div class="event-actions">
                    <button class="edit-event-btn" onclick="editEvent(${index})" title="Edit event">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-event-btn" onclick="deleteEvent(${index})" title="Delete event">
                        <i class="fas fa-trash"></i>
                    </button>
            </div>
        `;
        }
        
        eventDiv.innerHTML = eventHTML;
        eventsList.appendChild(eventDiv);
    });
}

async function addEvent() {
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value;
    const description = document.getElementById('eventDescription').value;
    
    if (!title || !date) {
        showNotification('Please fill in at least the title and date.');
        return;
    }
    
    const eventData = {
        id: Date.now(),
        title: title,
        date: date,
        time: time || '',
        location: location || '',
        description: description || '',
        createdBy: currentUser || 'Anonymous'
    };
    
    // Check if we're editing an existing event
    const editIndex = document.getElementById('addEventForm').getAttribute('data-edit-index');
    if (editIndex !== null) {
        events[editIndex] = eventData;
        document.getElementById('addEventForm').removeAttribute('data-edit-index');
    } else {
        events.push(eventData);
    }
    
    // Clear form
    document.getElementById('addEventForm').reset();
    
    // Save and render
    saveToLocalStorage();
    renderEvents();
    renderCalendar();
    
    showNotification('Event saved successfully!');
    
    // Close the add event section
    toggleAddEventSection();
}

function deleteEvent(index) {
    if (confirm('Are you sure you want to delete this event?')) {
        events.splice(index, 1);
        saveToLocalStorage();
        renderEvents();
        renderCalendar();
        showNotification('Event deleted successfully!');
    }
}

function editEvent(index) {
    const event = events[index];
    
    // Populate form with event data
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDate').value = event.date;
    document.getElementById('eventTime').value = event.time || '';
    document.getElementById('eventLocation').value = event.location || '';
    document.getElementById('eventDescription').value = event.description || '';
    
    // Mark form as editing
    document.getElementById('addEventForm').setAttribute('data-edit-index', index);
    
    // Open the add event section
    toggleAddEventSection();
}

// Task Functions
function renderTasks() {
    const categories = ['design', 'research', 'assembly', 'testing'];
    
    categories.forEach(category => {
        const taskList = document.getElementById(category + 'Tasks');
        if (!taskList) return;
            
            const categoryTasks = tasks.filter(task => task.category === category);
        
        taskList.innerHTML = '';
        
        if (categoryTasks.length === 0) {
            taskList.innerHTML = '<p class="no-tasks">No tasks yet. Add your first task below!</p>';
            return;
        }
        
        categoryTasks.forEach((task, index) => {
            const taskDiv = document.createElement('div');
            taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            let taskHTML = `
                <div class="task-content">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="toggleTask('${category}', ${index})">
                    <span class="task-title">${task.title}</span>
                </div>
            `;
            
            if (editMode.tasks) {
                taskHTML += `
                    <button class="delete-task-btn" onclick="deleteTask('${category}', ${index})" title="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }
            
            taskDiv.innerHTML = taskHTML;
            taskList.appendChild(taskDiv);
        });
    });
}

function addTask() {
    const title = document.getElementById('taskTitle').value;
    const category = document.getElementById('taskCategory').value;
    
    if (!title || !category) {
        showNotification('Please fill in both title and category.');
        return;
    }
    
    tasks.push({
        id: Date.now(),
        title: title,
        category: category,
        completed: false,
        createdBy: currentUser || 'Anonymous'
    });
    
    document.getElementById('addTaskForm').reset();
    
            saveToLocalStorage();
    renderTasks();
    
    showNotification('Task added successfully!');
}

function toggleTask(category, index) {
    const categoryTasks = tasks.filter(task => task.category === category);
    const task = categoryTasks[index];
    task.completed = !task.completed;
    
    saveToLocalStorage();
    renderTasks();
}

function deleteTask(category, index) {
    if (confirm('Are you sure you want to delete this task?')) {
        const categoryTasks = tasks.filter(task => task.category === category);
        const taskToDelete = categoryTasks[index];
        const globalIndex = tasks.findIndex(task => task.id === taskToDelete.id);
        
        if (globalIndex !== -1) {
            tasks.splice(globalIndex, 1);
            saveToLocalStorage();
            renderTasks();
            showNotification('Task deleted successfully!');
        }
    }
}

// Link Functions
function renderLinks() {
    const linksGrid = document.getElementById('linksGrid');
    if (!linksGrid) {
        console.error('Links grid not found!');
        return;
    }
    
    // Completely clear the grid
    linksGrid.innerHTML = '';
    
    // Define category display names
    const categoryNames = {
        course: 'Course Materials',
        technical: 'Technical Resources',
        communication: 'Team Communication',
        external: 'External Resources',
        documents: 'Project Documents'
    };
    
    let hasAnyLinks = false;
    
    // Render each category
    Object.keys(links).forEach(category => {
        if (links[category] && links[category].length > 0) {
            hasAnyLinks = true;
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'link-category';
            categoryDiv.innerHTML = `
                <h4>${categoryNames[category] || category}</h4>
                <ul>
                    ${links[category].map((link, index) => {
                        const isPDF = isPDFUrl(link.url);
                        const deleteButton = editMode.links ? 
                            `<button class="delete-link-btn" onclick="deleteLink('${category}', ${index})" title="Delete link">
                                <i class="fas fa-trash"></i>
                            </button>` : '';
                        
                        return `<li>
                            <a href="${link.url}" target="_blank">${link.title}</a>
                            ${isPDF ? `<a href="#" class="pdf-link" onclick="openPDFViewer('${link.url}', '${link.title}'); return false;" title="View PDF">
                                <i class="fas fa-eye"></i> View PDF
                            </a>` : ''}
                            ${deleteButton}
                        </li>`;
                    }).join('')}
                </ul>
            `;
            linksGrid.appendChild(categoryDiv);
        }
    });
    
    if (!hasAnyLinks) {
        linksGrid.innerHTML = '<p class="no-links">No links yet. Add your first link below!</p>';
    }
}

async function addLink() {
    const titleElement = document.getElementById('linkTitle');
    const urlElement = document.getElementById('linkUrl');
    const categoryElement = document.getElementById('linkCategory');
    
    // Check if elements exist
    if (!titleElement || !urlElement || !categoryElement) {
        console.error('Link form elements not found!');
        showNotification('Error: Link form not found. Please refresh the page.');
        return;
    }
    
    const title = titleElement.value.trim();
    const url = urlElement.value.trim();
    const category = categoryElement.value;
    
    if (!title || !url || !category) {
        showNotification('Please fill in all fields.');
        return;
    }
    
    if (!links[category]) {
        links[category] = [];
    }
    
    links[category].push({ title, url });
    
    // Clear form
    const form = document.getElementById('addLinkForm');
    if (form) {
        form.reset();
    } else {
        // Manual reset if form not found
        titleElement.value = '';
        urlElement.value = '';
        categoryElement.value = '';
    }
    
    // Save and render
    saveToLocalStorage();
    renderLinks();
    
    // Show success message
    showNotification('Link added successfully!');
    
    // Close the add link section
    toggleAddLinkSection();
}

// Delete link function
async function deleteLink(category, index) {
    if (confirm('Are you sure you want to delete this link?')) {
        if (links[category] && links[category][index]) {
            const deletedLink = links[category].splice(index, 1)[0];
            
            // Save and render
            saveToLocalStorage();
            renderLinks();
            
            showNotification('Link deleted successfully!');
        }
    }
}

// Upload PDF function
async function uploadPDF() {
    const title = document.getElementById('pdfTitle').value.trim();
    const fileInput = document.getElementById('pdfFile');
    const category = document.getElementById('pdfCategory').value;
    
    if (!title || !fileInput.files[0] || !category) {
        showNotification('Please fill in all fields and select a PDF file.');
        return;
    }
    
    const file = fileInput.files[0];
    if (file.type !== 'application/pdf') {
        showNotification('Please select a valid PDF file.');
        return;
    }
    
    // Create object URL for the uploaded file
    const fileUrl = URL.createObjectURL(file);
    
    if (!links[category]) {
        links[category] = [];
    }
    
    links[category].push({
        title: title,
        url: fileUrl,
        isUploaded: true,
        fileName: file.name
    });
    
    // Clear form
    document.getElementById('uploadPDFForm').reset();
    
    // Save and render
        saveToLocalStorage();
    renderLinks();
    
    showNotification('PDF uploaded successfully! You can now view it directly in the browser.');
    
    // Close the upload section
    toggleUploadPDFSection();
}

// Collapsible Section Functions
function toggleAddLinkSection() {
    const section = document.getElementById('addLinkSection');
    const button = document.getElementById('addLinkBtn');
    
    if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
        button.textContent = 'Cancel';
        button.classList.add('active');
        
        // Hide upload PDF section if it's open
        const uploadSection = document.getElementById('uploadPDFSection');
        if (uploadSection.style.display === 'block') {
            toggleUploadPDFSection();
        }
    } else {
        section.style.display = 'none';
        button.textContent = 'Add New Link';
        button.classList.remove('active');
    }
}

function toggleUploadPDFSection() {
    const section = document.getElementById('uploadPDFSection');
    const button = document.getElementById('uploadPDFBtn');
    
    if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
        button.textContent = 'Cancel';
        button.classList.add('active');
        
        // Hide add link section if it's open
        const addLinkSection = document.getElementById('addLinkSection');
        if (addLinkSection.style.display === 'block') {
            toggleAddLinkSection();
        }
    } else {
        section.style.display = 'none';
        button.textContent = 'Upload PDF Document';
        button.classList.remove('active');
    }
}

function toggleAddEventSection() {
    const section = document.getElementById('addEventSection');
    const button = document.getElementById('addEventBtn');
    
    if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
        button.textContent = 'Cancel';
        button.classList.add('active');
    } else {
        section.style.display = 'none';
        button.textContent = 'Add New Event';
        button.classList.remove('active');
        
        // Reset form to add mode if it was in edit mode
        const form = document.getElementById('addEventForm');
        if (form) {
            form.removeAttribute('data-edit-index');
            form.reset();
        }
    }
}

// Tab Functions
function openTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName).style.display = 'block';
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Re-render content when switching tabs
    if (tabName === 'projectHub') {
        renderEvents();
        renderTasks();
        renderLinks();
    }
}

// Morph Chart Functions
function loadMorphChart() {
    if (morphChartData) {
        // Load existing data
    const table = document.getElementById('morphTable');
        const notes = document.getElementById('morphNotes');
        
        if (morphChartData.table) {
            const tbody = table.querySelector('tbody');
            tbody.innerHTML = '';
            
            morphChartData.table.forEach(row => {
                const tr = document.createElement('tr');
                row.forEach(cell => {
                    const td = document.createElement('td');
                    td.textContent = cell;
                    td.contentEditable = true;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
        }
        
        if (morphChartData.notes) {
            notes.value = morphChartData.notes;
        }
    }
}

function saveMorphChart() {
        const table = document.getElementById('morphTable');
        const notes = document.getElementById('morphNotes').value;
        
        const morphData = {
            table: [],
            notes: notes,
        updatedBy: currentUser || 'Anonymous',
        updatedAt: new Date().toISOString()
        };
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const rowData = [];
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
                rowData.push(cell.textContent.trim());
            });
            morphData.table.push(rowData);
        });
        
    morphChartData = morphData;
    saveToLocalStorage();
    showNotification('Morph chart saved successfully!');
}

// Notification system
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Event Listeners
function setupEventListeners() {
    // PDF Modal close
    const pdfModal = document.getElementById('pdfModal');
    if (pdfModal) {
        pdfModal.addEventListener('click', function(e) {
            if (e.target === pdfModal) {
                closePDFViewer();
                            }
                        });
                    }
    
    // Form submissions
    const addEventForm = document.getElementById('addEventForm');
    if (addEventForm) {
        addEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addEvent();
        });
    }
    
    const addTaskForm = document.getElementById('addTaskForm');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addTask();
        });
    }
    
    const addLinkForm = document.getElementById('addLinkForm');
    if (addLinkForm) {
        addLinkForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addLink();
        });
    }
    
    const uploadPDFForm = document.getElementById('uploadPDFForm');
    if (uploadPDFForm) {
        uploadPDFForm.addEventListener('submit', function(e) {
            e.preventDefault();
            uploadPDF();
        });
    }
    
    // Load user data
    loadUserData();
    
    // Load morph chart
    loadMorphChart();
}

// Force reset links to repository PDFs
function resetToRepositoryPDFs() {
    links = {
        course: [
            { title: "Concept Generation Guide", url: "pdfs/Concept Generation Guide.pdf" }
        ],
        technical: [
            { title: "Capacitors and Motors", url: "pdfs/Capacitors and Motors.pdf" }
        ],
        communication: [
            { title: "Discord Server", url: "https://discord.gg/example" },
            { title: "Slack Workspace", url: "https://slack.com/example" },
            { title: "Google Drive", url: "https://drive.google.com/example" }
        ],
        external: [
            { title: "Solar Car Competitions", url: "https://www.worldsolarchallenge.org/" },
            { title: "Engineering Forums", url: "https://www.engineering.com/" }
        ],
        documents: [
            { title: "Project Brief", url: "pdfs/Project Brief.pdf" }
        ]
    };
    
    saveToLocalStorage();
    renderLinks();
    showNotification('Links reset to repository PDFs!');
}

// Initialize PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
