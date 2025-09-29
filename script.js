// Global variables
let currentDate = new Date();
let currentUser = '';
let events = [];
let tasks = [];
let morphChartData = null;

// Simple Firebase data sync

// Test function to verify script is loaded
function testScriptLoaded() {
    console.log('✅ Script.js is loaded and working!');
    return true;
}

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

// Default links with only your actual PDFs
let links = {
    course: [
        { title: "Concept Generation Guide", url: "pdfs/Concept Generation Guide.pdf" }
    ],
    technical: [
        { title: "Capacitors and Motors", url: "pdfs/Capacitors and Motors.pdf" }
    ],
    communication: [],
    external: [],
    documents: [
        { title: "Project Brief", url: "pdfs/Project Brief.pdf" }
    ]
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Script.js is working');
            initializeFirebaseData();
            loadFromLocalStorage();
    initializeCalendar();
            renderEvents();
            renderTasks();
            renderLinks();
    setupEventListeners();
});

// Initialize Firebase data listeners
function initializeFirebaseData() {
    if (!window.db || !window.firebaseFunctions) {
        console.log('Firebase not available, using localStorage only');
        return;
    }

    const { collection, onSnapshot, query, orderBy } = window.firebaseFunctions;
    
    console.log('Initializing shared Firebase data for all users');
    
    // Set up real-time listeners for events (shared across all users)
    const eventsQuery = query(collection(window.db, 'events'), orderBy('date', 'asc'));
    onSnapshot(eventsQuery, (snapshot) => {
        events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        renderEvents();
        renderCalendar();
    });

    // Set up real-time listeners for tasks (shared across all users)
    const tasksQuery = query(collection(window.db, 'tasks'), orderBy('category', 'asc'));
    onSnapshot(tasksQuery, (snapshot) => {
        tasks = [];
        snapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        renderTasks();
    });

    // Set up real-time listener for links (shared across all users)
    const linksQuery = collection(window.db, 'links');
    onSnapshot(linksQuery, (snapshot) => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const firebaseLinks = doc.data();
            links = firebaseLinks;
            renderLinks();
        } else {
            // If no links in Firebase, save default links
            saveLinksToFirebase();
        }
    });

    // Set up real-time listener for morph chart data (shared across all users)
    const morphQuery = collection(window.db, 'morphChart');
    onSnapshot(morphQuery, (snapshot) => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            morphChartData = doc.data();
            loadMorphChart();
        }
    });
}

// Load data from localStorage (fallback)
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

// Save data to localStorage (fallback)
function saveToLocalStorage() {
    localStorage.setItem('solarTruckEvents', JSON.stringify(events));
    localStorage.setItem('solarTruckTasks', JSON.stringify(tasks));
    localStorage.setItem('solarTruckLinks', JSON.stringify(links));
    if (morphChartData) {
        localStorage.setItem('solarTruckMorphChart', JSON.stringify(morphChartData));
    }
}

// Firebase save functions
async function saveEventToFirebase(eventData) {
    if (!window.db || !window.firebaseFunctions) {
        return false;
    }

    try {
        const { collection, addDoc, doc, updateDoc } = window.firebaseFunctions;
        
        if (eventData.id && eventData.id.toString().length > 10) {
            // Update existing event
            await updateDoc(doc(window.db, 'events', eventData.id), eventData);
        } else {
            // Add new event
            await addDoc(collection(window.db, 'events'), eventData);
        }
        return true;
    } catch (error) {
        console.error('Error saving event to Firebase:', error);
        return false;
    }
}

async function saveTaskToFirebase(taskData) {
    if (!window.db || !window.firebaseFunctions) {
        return false;
    }

    try {
        const { collection, addDoc, doc, updateDoc } = window.firebaseFunctions;
        
        if (taskData.id && taskData.id.toString().length > 10) {
            // Update existing task
            await updateDoc(doc(window.db, 'tasks', taskData.id), taskData);
        } else {
            // Add new task
            await addDoc(collection(window.db, 'tasks'), taskData);
        }
        return true;
    } catch (error) {
        console.error('Error saving task to Firebase:', error);
        return false;
    }
}

async function saveLinksToFirebase() {
    if (!window.db || !window.firebaseFunctions) {
        return false;
    }

    try {
        const { collection, addDoc, doc, updateDoc, getDocs } = window.firebaseFunctions;
        
        // Check if links already exist in Firebase
        const linksSnapshot = await getDocs(collection(window.db, 'links'));
        if (linksSnapshot.empty) {
            // Create new document with default links
            await addDoc(collection(window.db, 'links'), links);
        } else {
            // Update existing document
            const docId = linksSnapshot.docs[0].id;
            await updateDoc(doc(window.db, 'links', docId), links);
        }
        
        return true;
    } catch (error) {
        console.error('Error saving links to Firebase:', error);
        return false;
    }
}

async function saveMorphChartToFirebase(morphData) {
    if (!window.db || !window.firebaseFunctions) {
        return false;
    }

    try {
        const { collection, addDoc, doc, updateDoc, getDocs } = window.firebaseFunctions;
        
        // Check if morph chart already exists in Firebase
        const morphSnapshot = await getDocs(collection(window.db, 'morphChart'));
        if (morphSnapshot.empty) {
            // Create new document
            await addDoc(collection(window.db, 'morphChart'), morphData);
        } else {
            // Update existing document
            const docId = morphSnapshot.docs[0].id;
            await updateDoc(doc(window.db, 'morphChart', docId), morphData);
        }
        
        return true;
    } catch (error) {
        console.error('Error saving morph chart to Firebase:', error);
        return false;
    }
}

async function deleteEventFromFirebase(eventId) {
    if (!window.db || !window.firebaseFunctions) {
        return false;
    }

    try {
        const { doc, deleteDoc } = window.firebaseFunctions;
        
        await deleteDoc(doc(window.db, 'events', eventId));
        return true;
    } catch (error) {
        console.error('Error deleting event from Firebase:', error);
        return false;
    }
}

async function deleteTaskFromFirebase(taskId) {
    if (!window.db || !window.firebaseFunctions) {
        return false;
    }

    try {
        const { doc, deleteDoc } = window.firebaseFunctions;
        
        await deleteDoc(doc(window.db, 'tasks', taskId));
        return true;
    } catch (error) {
        console.error('Error deleting task from Firebase:', error);
        return false;
    }
}

// Clear all data
async function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        // Clear localStorage
        localStorage.removeItem('solarTruckEvents');
        localStorage.removeItem('solarTruckTasks');
        localStorage.removeItem('solarTruckLinks');
        localStorage.removeItem('solarTruckMorphChart');
        
        // Reset to default links with only your actual PDFs
        links = {
            course: [
                { title: "Concept Generation Guide", url: "pdfs/Concept Generation Guide.pdf" }
            ],
            technical: [
                { title: "Capacitors and Motors", url: "pdfs/Capacitors and Motors.pdf" }
            ],
            communication: [],
            external: [],
            documents: [
                { title: "Project Brief", url: "pdfs/Project Brief.pdf" }
            ]
        };
        
        events = [];
        tasks = [];
        morphChartData = null;
        
        // Save the reset links to Firebase
        await saveLinksToFirebase();
        
        renderEvents();
        renderTasks();
        renderLinks();
        
        //showNotification('All data cleared and reset to default PDFs!');
    }
}

// User management
function saveUserName() {
    const userName = document.getElementById('userName').value.trim();
    if (userName) {
        currentUser = userName;
        localStorage.setItem('solarTruckUserName', userName);
        //showNotification(`Welcome, ${userName}!`);
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
    const button = document.querySelector(`[data-edit-target='${section}']`);
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
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthElement = document.getElementById('currentMonth');
    if (!calendarGrid) return;
    
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Update the month display
    if (currentMonthElement) {
        currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
    
    let calendarHTML = `
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
                 data-date="${dateString}">
                ${day}
                ${hasEvents ? `<div class="event-indicator"></div>` : ''}
            </div>
        `;
    }
    
    calendarGrid.innerHTML = calendarHTML;
    
    // Add event listeners to calendar days
    const calendarDays = calendarGrid.querySelectorAll('.calendar-day[data-date]');
    calendarDays.forEach(day => {
        day.addEventListener('click', function() {
            const dateString = this.getAttribute('data-date');
            showDayEvents(dateString);
        });
    });
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

// Calendar navigation functions
function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
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
                    <button class="edit-event-btn" data-event-index="${index}" title="Edit event">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-event-btn" data-event-index="${index}" title="Delete event">
                        <i class="fas fa-trash"></i>
                    </button>
            </div>
        `;
        }
        
        eventDiv.innerHTML = eventHTML;
        
        // Add event listeners to edit/delete buttons if in edit mode
        if (editMode.events) {
            const editBtn = eventDiv.querySelector('.edit-event-btn');
            const deleteBtn = eventDiv.querySelector('.delete-event-btn');
            
            if (editBtn) {
                editBtn.addEventListener('click', function() {
                    const eventIndex = parseInt(this.getAttribute('data-event-index'));
                    editEvent(eventIndex);
                });
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    const eventIndex = parseInt(this.getAttribute('data-event-index'));
                    deleteEvent(eventIndex);
                });
            }
        }
        
        eventsList.appendChild(eventDiv);
    });
}

async function addEvent() {
    console.log('addEvent function called');
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value;
    const description = document.getElementById('eventDescription').value;
    
    console.log('Event data:', { title, date, time, location, description });
    
    if (!title || !date) {
        //showNotification('Please fill in at least the title and date.');
        return;
    }
    
    // Check if we're editing an existing event
    const editIndex = document.getElementById('addEventForm').getAttribute('data-edit-index');
    let eventData;
    
    if (editIndex !== null) {
        // Editing existing event - keep the Firebase document ID
        eventData = {
            id: events[editIndex].id, // Keep the existing Firebase document ID
            title: title,
            date: date,
            time: time || '',
            location: location || '',
            description: description || '',
            createdBy: currentUser || 'Anonymous'
        };
        document.getElementById('addEventForm').removeAttribute('data-edit-index');
    } else {
        // New event - don't set an ID, let Firebase generate one
        eventData = {
            title: title,
            date: date,
            time: time || '',
            location: location || '',
            description: description || '',
            createdBy: currentUser || 'Anonymous'
        };
    }
    
    // Clear form
    document.getElementById('addEventForm').reset();
    
    // Try Firebase first, fallback to localStorage
    const firebaseSuccess = await saveEventToFirebase(eventData);
    
    if (!firebaseSuccess) {
        // Fallback to local storage
        if (editIndex !== null) {
            events[editIndex] = eventData;
        } else {
            eventData.id = Date.now(); // Add local ID for localStorage
            events.push(eventData);
        }
        saveToLocalStorage();
        renderEvents();
        renderCalendar();
    }
    
    //showNotification('Event saved successfully!');
    
    // Close the add event section
    toggleAddEventSection();
}

async function deleteEvent(index) {
    if (confirm('Are you sure you want to delete this event?')) {
        const event = events[index];
        
        // Try Firebase first, fallback to localStorage
        if (event.id && event.id.toString().length > 10) {
            const firebaseSuccess = await deleteEventFromFirebase(event.id);
            if (firebaseSuccess) {
                events.splice(index, 1);
                // Firebase listeners will handle re-rendering
                return;
            }
        }
        
        // Fallback to local storage
        events.splice(index, 1);
        saveToLocalStorage();
        renderEvents();
        renderCalendar();
        //showNotification('Event deleted successfully!');
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
                           data-task-category="${category}" data-task-index="${index}">
                    <span class="task-title">${task.title}</span>
                </div>
            `;
            
            if (editMode.tasks) {
                taskHTML += `
                    <button class="delete-task-btn" data-task-category="${category}" data-task-index="${index}" title="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }
            
            taskDiv.innerHTML = taskHTML;
            
            // Add event listeners to checkbox and delete button
            const checkbox = taskDiv.querySelector('input[type="checkbox"]');
            const deleteBtn = taskDiv.querySelector('.delete-task-btn');
            
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    const taskCategory = this.getAttribute('data-task-category');
                    const taskIndex = parseInt(this.getAttribute('data-task-index'));
                    toggleTask(taskCategory, taskIndex);
                });
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    const taskCategory = this.getAttribute('data-task-category');
                    const taskIndex = parseInt(this.getAttribute('data-task-index'));
                    deleteTask(taskCategory, taskIndex);
                });
            }
            
            taskList.appendChild(taskDiv);
        });
    });
}

async function addTask() {
    const title = document.getElementById('taskTitle').value;
    const category = document.getElementById('taskCategory').value;
    
    if (!title || !category) {
        //showNotification('Please fill in both title and category.');
        return;
    }
    
    const taskData = {
        title: title,
        category: category,
        completed: false,
        createdBy: currentUser || 'Anonymous'
    };
    
    document.getElementById('addTaskForm').reset();
    
    // Try Firebase first, fallback to localStorage
    const firebaseSuccess = await saveTaskToFirebase(taskData);
        
    if (!firebaseSuccess) {
        // Fallback to local storage
        taskData.id = Date.now(); // Add local ID for localStorage
        tasks.push(taskData);
        saveToLocalStorage();
        renderTasks();
    }
    
    //showNotification('Task added successfully!');
}

async function toggleTask(category, index) {
    const categoryTasks = tasks.filter(task => task.category === category);
    const task = categoryTasks[index];
    task.completed = !task.completed;
    
    // Try Firebase first, fallback to localStorage
    const firebaseSuccess = await saveTaskToFirebase(task);
    
    if (!firebaseSuccess) {
        // Fallback to local storage
        saveToLocalStorage();
        renderTasks();
    }
}

async function deleteTask(category, index) {
    if (confirm('Are you sure you want to delete this task?')) {
        const categoryTasks = tasks.filter(task => task.category === category);
        const taskToDelete = categoryTasks[index];
        const globalIndex = tasks.findIndex(task => task.id === taskToDelete.id);
        
        if (globalIndex !== -1) {
            // Try Firebase first, fallback to localStorage
            if (taskToDelete.id && taskToDelete.id.toString().length > 10) {
                const firebaseSuccess = await deleteTaskFromFirebase(taskToDelete.id);
                if (firebaseSuccess) {
                    tasks.splice(globalIndex, 1);
                    // Firebase listeners will handle re-rendering
                    return;
                }
            }
            
            // Fallback to local storage
            tasks.splice(globalIndex, 1);
            saveToLocalStorage();
            renderTasks();
            //showNotification('Task deleted successfully!');
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
                            `<button class="delete-link-btn" data-link-category="${category}" data-link-index="${index}" title="Delete link">
                                <i class="fas fa-trash"></i>
                            </button>` : '';
                        
                        return `<li>
                            <a href="${link.url}" target="_blank">${link.title}</a>
                            ${deleteButton}
                        </li>`;
                    }).join('')}
                </ul>
            `;
            
            // Add event listeners to delete buttons if in edit mode
            if (editMode.links) {
                const deleteButtons = categoryDiv.querySelectorAll('.delete-link-btn');
                deleteButtons.forEach(btn => {
                    btn.addEventListener('click', function() {
                        const linkCategory = this.getAttribute('data-link-category');
                        const linkIndex = parseInt(this.getAttribute('data-link-index'));
                        deleteLink(linkCategory, linkIndex);
                    });
                });
            }
            
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
        // showNotification('Error: Link form not found. Please refresh the page.');
        return;
    }
    
    const title = titleElement.value.trim();
    const url = urlElement.value.trim();
    const category = categoryElement.value;
    
    if (!title || !url || !category) {
        //showNotification('Please fill in all fields.');
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
    
    // Try Firebase first, fallback to localStorage
    const firebaseSuccess = await saveLinksToFirebase();
    
    if (!firebaseSuccess) {
        // Fallback to local storage
        saveToLocalStorage();
    renderLinks();
    }
    
    // Show success message
    //showNotification('Link added successfully!');
    
    // Close the add link section
    toggleAddLinkSection();
}

// Delete link function
async function deleteLink(category, index) {
    if (confirm('Are you sure you want to delete this link?')) {
        if (links[category] && links[category][index]) {
            const deletedLink = links[category].splice(index, 1)[0];
            
            // Try Firebase first, fallback to localStorage
            const firebaseSuccess = await saveLinksToFirebase();
            
            if (!firebaseSuccess) {
                // Fallback to local storage
                saveToLocalStorage();
                renderLinks();
            }
            
           // showNotification('Link deleted successfully!');
        }
    }
}

// Upload PDF function
async function uploadPDF() {
    const title = document.getElementById('pdfTitle').value.trim();
    const fileInput = document.getElementById('pdfFile');
    const category = document.getElementById('pdfCategory').value;
    
    if (!title || !fileInput.files[0] || !category) {
        //showNotification('Please fill in all fields and select a PDF file.');
        return;
    }
    
    const file = fileInput.files[0];
    if (file.type !== 'application/pdf') {
        //showNotification('Please select a valid PDF file.');
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
    
    // Try Firebase first, fallback to localStorage
    const firebaseSuccess = await saveLinksToFirebase();
    
    if (!firebaseSuccess) {
        // Fallback to local storage
        saveToLocalStorage();
        renderLinks();
    }
    
    //showNotification('PDF uploaded successfully! You can now view it directly in the browser.');
    
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
// Modal Functions
function openProjectHub() {
    document.getElementById('projectHub').style.display = 'block';
    // Initialize the first tab by directly showing it
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById('links').style.display = 'block';
    
    // Set the first tab button as active
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    if (tabButtons[0]) {
        tabButtons[0].classList.add('active');
    }
    
    // Render content
    renderEvents();
    renderTasks();
    renderLinks();
}

function closeProjectHub() {
    document.getElementById('projectHub').style.display = 'none';
}

// Tab Functions
function openTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName).style.display = 'block';
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Re-render content when switching tabs
    if (tabName === 'links') {
        renderEvents();
        renderTasks();
        renderLinks();
    } else if (tabName === 'calendar') {
        renderCalendar();
        renderEvents();
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

async function saveMorphChart() {
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
    
    // Try Firebase first, fallback to localStorage
    const firebaseSuccess = await saveMorphChartToFirebase(morphData);
    
    if (!firebaseSuccess) {
        // Fallback to local storage
        saveToLocalStorage();
    }
    
    //showNotification('Morph chart saved successfully!');
}

// Morph Chart Functions
function addMorphColumn() {
    const table = document.getElementById('morphTable');
    const headerRow = table.querySelector('thead tr');
    const bodyRows = table.querySelectorAll('tbody tr');
    
    // Add header
    const newHeader = document.createElement('th');
    newHeader.className = 'morph-header';
    newHeader.textContent = headerRow.children.length;
    headerRow.appendChild(newHeader);
    
    // Add cells to each row
    bodyRows.forEach(row => {
        const newCell = document.createElement('td');
        newCell.className = 'morph-cell';
        newCell.contentEditable = 'true';
        row.appendChild(newCell);
    });
}

function addMorphRow() {
    const table = document.getElementById('morphTable');
    const tbody = table.querySelector('tbody');
    const headerCount = table.querySelector('thead tr').children.length;
    
    const newRow = document.createElement('tr');
    const functionCell = document.createElement('td');
    functionCell.className = 'morph-function';
    functionCell.contentEditable = 'true';
    functionCell.textContent = 'New Function';
    newRow.appendChild(functionCell);
    
    for (let i = 1; i < headerCount; i++) {
        const newCell = document.createElement('td');
        newCell.className = 'morph-cell';
        newCell.contentEditable = 'true';
        newRow.appendChild(newCell);
    }
    
    tbody.appendChild(newRow);
}

function deleteMorphColumn() {
    const table = document.getElementById('morphTable');
    const headerRow = table.querySelector('thead tr');
    const bodyRows = table.querySelectorAll('tbody tr');
    
    if (headerRow.children.length > 2) {
        // Remove last header
        headerRow.removeChild(headerRow.lastChild);
        
        // Remove last cell from each row
        bodyRows.forEach(row => {
            if (row.children.length > 1) {
                row.removeChild(row.lastChild);
            }
        });
    }
}

function deleteMorphRow() {
    const tbody = document.getElementById('morphTable').querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    
    if (rows.length > 1) {
        tbody.removeChild(rows[rows.length - 1]);
    }
}

/* Notification system
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
} */

// Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Main Project Hub button
    const openProjectHubBtn = document.getElementById('openProjectHubBtn');
    if (openProjectHubBtn) {
        openProjectHubBtn.addEventListener('click', openProjectHub);
        console.log('Open Project Hub button event listener attached');
    } else {
        console.error('Open Project Hub button not found!');
    }
    
    // Close Project Hub button
    const closeProjectHubBtn = document.getElementById('closeProjectHubBtn');
    if (closeProjectHubBtn) {
        closeProjectHubBtn.addEventListener('click', closeProjectHub);
        console.log('Close Project Hub button event listener attached');
    } else {
        console.error('Close Project Hub button not found!');
    }
    
    // Project Hub Modal close on outside click
    const projectHubModal = document.getElementById('projectHub');
    if (projectHubModal) {
        projectHubModal.addEventListener('click', function(e) {
            if (e.target === projectHubModal) {
                closeProjectHub();
            }
        });
        console.log('Project Hub modal event listener attached');
    } else {
        console.error('Project Hub modal not found!');
    }
    
    // Clear All Data button
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');
    if (clearAllDataBtn) {
        clearAllDataBtn.addEventListener('click', clearAllData);
        console.log('Clear All Data button event listener attached');
    } else {
        console.error('Clear All Data button not found!');
    }
    
    // Save User Name button
    const saveUserNameBtn = document.getElementById('saveUserNameBtn');
    if (saveUserNameBtn) {
        saveUserNameBtn.addEventListener('click', saveUserName);
        console.log('Save User Name button event listener attached');
    } else {
        console.error('Save User Name button not found!');
    }
    
    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            openTab(tabName);
        });
    });
    console.log('Tab buttons event listeners attached');
    
    // Edit mode buttons
    const editModeButtons = document.querySelectorAll('[data-edit-target]');
    editModeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-edit-target');
            toggleEditMode(target);
        });
    });
    console.log('Edit mode buttons event listeners attached');
    
    // PDF Modal close
    const pdfModal = document.getElementById('pdfViewerModal');
    if (pdfModal) {
        pdfModal.addEventListener('click', function(e) {
            if (e.target === pdfModal) {
                closePDFViewer();
            }
        });
        console.log('PDF modal event listener attached');
    } else {
        console.error('PDF modal not found!');
    }
    
    // Form submissions
    const addEventForm = document.getElementById('addEventForm');
    if (addEventForm) {
        addEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Event form submitted');
            try {
                addEvent();
            } catch (error) {
                console.error('Error adding event:', error);
                //showNotification('Error adding event: ' + error.message);
            }
        });
        console.log('Event form event listener attached');
    } else {
        console.error('Event form not found!');
    }
    
    const addTaskForm = document.getElementById('addTaskForm');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Task form submitted');
            try {
                addTask();
            } catch (error) {
                console.error('Error adding task:', error);
                //showNotification('Error adding task: ' + error.message);
            }
        });
        console.log('Task form event listener attached');
    } else {
        console.error('Task form not found!');
    }
    
    const addLinkForm = document.getElementById('addLinkForm');
    if (addLinkForm) {
        addLinkForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Link form submitted');
            try {
                addLink();
            } catch (error) {
                console.error('Error adding link:', error);
                //showNotification('Error adding link: ' + error.message);
            }
        });
        console.log('Link form event listener attached');
    } else {
        console.error('Link form not found!');
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
    
    // Add remaining event listeners
    setupAdditionalEventListeners();
    
    /* Retry setting up event listeners if forms weren't found
    setTimeout(() => {
        const addEventForm = document.getElementById('addEventForm');
        const addTaskForm = document.getElementById('addTaskForm');
        const addLinkForm = document.getElementById('addLinkForm');
        
        if (!addEventForm || !addTaskForm || !addLinkForm) {
            console.log('Retrying to set up form event listeners...');
            setupFormEventListeners();
        }
    }, 1000); */
}

// Additional event listeners for buttons and controls
function setupAdditionalEventListeners() {
    console.log('Setting up additional event listeners...');
    
    // Add Link section toggle
    const addLinkBtn = document.getElementById('addLinkBtn');
    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', toggleAddLinkSection);
        console.log('Add Link button event listener attached');
    }
    
    const closeAddLinkBtn = document.getElementById('closeAddLinkBtn');
    if (closeAddLinkBtn) {
        closeAddLinkBtn.addEventListener('click', toggleAddLinkSection);
        console.log('Close Add Link button event listener attached');
    }
    
    // Upload PDF section toggle
    const uploadPDFBtn = document.getElementById('uploadPDFBtn');
    if (uploadPDFBtn) {
        uploadPDFBtn.addEventListener('click', toggleUploadPDFSection);
        console.log('Upload PDF button event listener attached');
    }
    
    const closeUploadPDFBtn = document.getElementById('closeUploadPDFBtn');
    if (closeUploadPDFBtn) {
        closeUploadPDFBtn.addEventListener('click', toggleUploadPDFSection);
        console.log('Close Upload PDF button event listener attached');
    }
    
    // Add Event section toggle
    const addEventBtn = document.getElementById('addEventBtn');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', toggleAddEventSection);
        console.log('Add Event button event listener attached');
    }
    
    const closeAddEventBtn = document.getElementById('closeAddEventBtn');
    if (closeAddEventBtn) {
        closeAddEventBtn.addEventListener('click', toggleAddEventSection);
        console.log('Close Add Event button event listener attached');
    }
    
    // Calendar navigation
    const previousMonthBtn = document.getElementById('previousMonthBtn');
    if (previousMonthBtn) {
        previousMonthBtn.addEventListener('click', previousMonth);
        console.log('Previous Month button event listener attached');
    }
    
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', nextMonth);
        console.log('Next Month button event listener attached');
    }
    
    // PDF viewer controls
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', previousPage);
        console.log('PDF Previous Page button event listener attached');
    }
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', nextPage);
        console.log('PDF Next Page button event listener attached');
    }
    
    const zoomInBtn = document.getElementById('zoomInBtn');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', zoomIn);
        console.log('PDF Zoom In button event listener attached');
    }
    
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', zoomOut);
        console.log('PDF Zoom Out button event listener attached');
    }
    
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPDF);
        console.log('PDF Download button event listener attached');
    }
    
    const closePDFBtn = document.getElementById('closePDFBtn');
    if (closePDFBtn) {
        closePDFBtn.addEventListener('click', closePDFViewer);
        console.log('PDF Close button event listener attached');
    }
    
    // Morph chart controls
    const addMorphColumnBtn = document.getElementById('addMorphColumnBtn');
    if (addMorphColumnBtn) {
        addMorphColumnBtn.addEventListener('click', addMorphColumn);
        console.log('Add Morph Column button event listener attached');
    }
    
    const addMorphRowBtn = document.getElementById('addMorphRowBtn');
    if (addMorphRowBtn) {
        addMorphRowBtn.addEventListener('click', addMorphRow);
        console.log('Add Morph Row button event listener attached');
    }
    
    const deleteMorphColumnBtn = document.getElementById('deleteMorphColumnBtn');
    if (deleteMorphColumnBtn) {
        deleteMorphColumnBtn.addEventListener('click', deleteMorphColumn);
        console.log('Delete Morph Column button event listener attached');
    }
    
    const deleteMorphRowBtn = document.getElementById('deleteMorphRowBtn');
    if (deleteMorphRowBtn) {
        deleteMorphRowBtn.addEventListener('click', deleteMorphRow);
        console.log('Delete Morph Row button event listener attached');
    }
    
    const saveMorphChartBtn = document.getElementById('saveMorphChartBtn');
    if (saveMorphChartBtn) {
        saveMorphChartBtn.addEventListener('click', saveMorphChart);
        console.log('Save Morph Chart button event listener attached');
    }
}

// Separate function for form event listeners
function setupFormEventListeners() {
    console.log('Setting up form event listeners...');
    
    // Event form
    const addEventForm = document.getElementById('addEventForm');
    if (addEventForm && !addEventForm.hasAttribute('data-listener-attached')) {
        addEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Event form submitted');
            try {
                addEvent();
            } catch (error) {
                console.error('Error adding event:', error);
                //showNotification('Error adding event: ' + error.message);
            }
        });
        addEventForm.setAttribute('data-listener-attached', 'true');
        console.log('Event form event listener attached (retry)');
    }
    
    // Task form
    const addTaskForm = document.getElementById('addTaskForm');
    if (addTaskForm && !addTaskForm.hasAttribute('data-listener-attached')) {
        addTaskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Task form submitted');
            try {
                addTask();
            } catch (error) {
                console.error('Error adding task:', error);
                //showNotification('Error adding task: ' + error.message);
            }
        });
        addTaskForm.setAttribute('data-listener-attached', 'true');
        console.log('Task form event listener attached (retry)');
    }
    
    // Link form
    const addLinkForm = document.getElementById('addLinkForm');
    if (addLinkForm && !addLinkForm.hasAttribute('data-listener-attached')) {
        addLinkForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Link form submitted');
            try {
                addLink();
        } catch (error) {
                console.error('Error adding link:', error);
                //showNotification('Error adding link: ' + error.message);
            }
        });
        addLinkForm.setAttribute('data-listener-attached', 'true');
        console.log('Link form event listener attached (retry)');
    }
}

// Emergency reset function - can be called from console
function emergencyReset() {
    localStorage.removeItem('solarTruckLinks');
    location.reload();
}

// Initialize PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
