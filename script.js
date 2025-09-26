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

// Edit mode variables
let editMode = {
    events: false,
    links: false,
    tasks: false
};

// Initialize with default tasks if Firebase is not available
const defaultTasks = [
    { id: 1, title: "Create initial CAD model", category: "design", completed: true },
    { id: 2, title: "Calculate power requirements", category: "design", completed: true },
    { id: 3, title: "Design solar panel mounting", category: "design", completed: false },
    { id: 4, title: "Create wiring diagram", category: "design", completed: false },
    { id: 5, title: "Research solar panel suppliers", category: "procurement", completed: false },
    { id: 6, title: "Order motor controller", category: "procurement", completed: false },
    { id: 7, title: "Purchase battery pack", category: "procurement", completed: false },
    { id: 8, title: "Build chassis frame", category: "assembly", completed: false },
    { id: 9, title: "Install motor system", category: "assembly", completed: false },
    { id: 10, title: "Mount solar panels", category: "assembly", completed: false }
];

let links = {
    course: [],
    technical: [],
    communication: [],
    external: [],
    documents: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeCalendar();
    setupEventListeners();
    loadUserData();
    
    // Wait for Firebase to load, then initialize data
    setTimeout(() => {
        if (window.db) {
            initializeFirebaseData();
        } else {
            // Fallback to local storage if Firebase not available
            loadFromLocalStorage();
            renderEvents();
            renderTasks();
            renderLinks();
            loadMorphChart();
        }
    }, 1000);
    
    // Always render content on page load to override any static HTML
    setTimeout(() => {
        renderEvents();
        renderTasks();
        renderLinks();
    }, 100);
});

// Firebase Integration Functions
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

function initializeFirebaseData() {
    if (!window.db || !window.firebaseFunctions) {
        console.log('Firebase not available, using local storage');
        return;
    }

    const { collection, onSnapshot, query, orderBy } = window.firebaseFunctions;
    
    // Set up real-time listeners for events
    const eventsQuery = query(collection(window.db, 'events'), orderBy('date', 'asc'));
    onSnapshot(eventsQuery, (snapshot) => {
        events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        renderEvents();
    });

    // Set up real-time listeners for tasks
    const tasksQuery = query(collection(window.db, 'tasks'), orderBy('category', 'asc'));
    onSnapshot(tasksQuery, (snapshot) => {
        tasks = [];
        snapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        renderTasks();
    });

    // Set up real-time listener for links
    const linksQuery = collection(window.db, 'links');
    onSnapshot(linksQuery, (snapshot) => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const firebaseLinks = doc.data();
            links = firebaseLinks;
            renderLinks();
        } else {
            // If no links in Firebase, start with empty links
            links = {
                course: [],
                technical: [],
                communication: [],
                external: [],
                documents: []
            };
            renderLinks();
        }
    });

    // Set up real-time listener for morph chart
    const morphQuery = collection(window.db, 'morphChart');
    onSnapshot(morphQuery, (snapshot) => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            morphChartData = doc.data();
            loadMorphChartFromFirebase();
        }
    });
}

async function addEventToFirebase(eventData) {
    if (!window.db || !window.firebaseFunctions) {
        return false;
    }

    try {
        const { collection, addDoc } = window.firebaseFunctions;
        await addDoc(collection(window.db, 'events'), {
            ...eventData,
            createdBy: currentUser || 'Anonymous',
            createdAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error adding event to Firebase:', error);
        return false;
    }
}

async function addTaskToFirebase(taskData) {
    if (!window.db || !window.firebaseFunctions) {
        return false;
    }

    try {
        const { collection, addDoc } = window.firebaseFunctions;
        await addDoc(collection(window.db, 'tasks'), {
            ...taskData,
            createdBy: currentUser || 'Anonymous',
            createdAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error adding task to Firebase:', error);
        return false;
    }
}

async function updateTaskInFirebase(taskId, updates) {
    if (!window.db || !window.firebaseFunctions) {
        return false;
    }

    try {
        const { doc, updateDoc } = window.firebaseFunctions;
        await updateDoc(doc(window.db, 'tasks', taskId), {
            ...updates,
            updatedBy: currentUser || 'Anonymous',
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error updating task in Firebase:', error);
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

async function saveMorphChartToFirebase() {
    if (!window.db || !window.firebaseFunctions) {
        return false;
    }

    try {
        const { collection, addDoc, doc, updateDoc, getDocs } = window.firebaseFunctions;
        const table = document.getElementById('morphTable');
        const notes = document.getElementById('morphNotes').value;
        
        // Extract table data
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

        // Check if morph chart already exists
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

function loadMorphChartFromFirebase() {
    if (!morphChartData) return;

    // Load notes
    if (morphChartData.notes) {
        document.getElementById('morphNotes').value = morphChartData.notes;
    }
    
    // Load table data
    if (morphChartData.table && morphChartData.table.length > 0) {
        const tbody = document.getElementById('morphTableBody');
        const rows = tbody.querySelectorAll('tr');
        
        morphChartData.table.forEach((rowData, rowIndex) => {
            if (rows[rowIndex]) {
                const cells = rows[rowIndex].querySelectorAll('td');
                rowData.forEach((cellData, cellIndex) => {
                    if (cells[cellIndex]) {
                        cells[cellIndex].textContent = cellData;
                    }
                });
            }
        });
    }
}

// Modal functions
function openProjectHub() {
    document.getElementById('projectHub').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Ensure form elements are accessible
    setTimeout(() => {
        const titleElement = document.getElementById('linkTitle');
        const urlElement = document.getElementById('linkUrl');
        const categoryElement = document.getElementById('linkCategory');
        
        if (titleElement && urlElement && categoryElement) {
            console.log('Form elements are accessible');
        } else {
            console.error('Form elements not accessible:', {
                titleElement: !!titleElement,
                urlElement: !!urlElement,
                categoryElement: !!categoryElement
            });
        }
    }, 100);
}

function closeProjectHub() {
    document.getElementById('projectHub').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Tab functionality
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    
    // Hide all tab content
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }
    
    // Remove active class from all tab buttons
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    
    // Show the specific tab content and mark button as active
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
    
    // Re-render content when switching tabs
    if (tabName === 'links') {
        renderLinks();
    } else if (tabName === 'calendar') {
        renderEvents();
    } else if (tabName === 'tasks') {
        renderTasks();
    }
}

// Calendar functionality
function initializeCalendar() {
    updateCalendarHeader();
    renderCalendar();
}

function updateCalendarHeader() {
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    document.getElementById('currentMonth').textContent = 
        monthNames[currentDate.getMonth()] + " " + currentDate.getFullYear();
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day';
        dayHeader.style.fontWeight = 'bold';
        dayHeader.style.backgroundColor = '#f0f0f0';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        emptyDay.textContent = '';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Check if it's today
        const today = new Date();
        if (currentDate.getFullYear() === today.getFullYear() &&
            currentDate.getMonth() === today.getMonth() &&
            day === today.getDate()) {
            dayElement.classList.add('today');
        }
        
        // Check if there are events on this day
        const dateString = formatDateForEvents(currentDate.getFullYear(), currentDate.getMonth(), day);
        const eventsOnDate = getEventsOnDate(dateString);
        if (eventsOnDate.length > 0) {
            dayElement.classList.add('has-event');
            
            // Add event details as tooltip
            const eventTitles = eventsOnDate.map(event => event.title).join(', ');
            dayElement.setAttribute('title', `Events: ${eventTitles}`);
            
            // Add visual indicator for events with time/location
            const hasDetailedEvents = eventsOnDate.some(event => event.time || event.location);
            if (hasDetailedEvents) {
                dayElement.classList.add('has-detailed-event');
            }
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendarHeader();
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendarHeader();
    renderCalendar();
}

function formatDateForEvents(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function hasEventOnDate(dateString) {
    return events.some(event => event.date === dateString);
}

function getEventsOnDate(dateString) {
    return events.filter(event => event.date === dateString);
}

// Events functionality
function renderEvents() {
    const eventsList = document.getElementById('eventsList');
    eventsList.innerHTML = '';
    
    // Sort events by date
    const sortedEvents = events.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedEvents.forEach((event, index) => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        
        const deleteButton = editMode.events ? 
            `<button class="delete-event-btn" onclick="deleteEvent(${index})" title="Delete event">
                <i class="fas fa-trash"></i>
            </button>` : '';
        
        const editButton = editMode.events ? 
            `<button class="edit-event-btn" onclick="editEvent(${index})" title="Edit event">
                <i class="fas fa-edit"></i>
            </button>` : '';
        
        const timeInfo = event.time ? `<div class="event-time"><i class="fas fa-clock"></i> ${event.time}</div>` : '';
        const locationInfo = event.location ? `<div class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</div>` : '';
        
        eventElement.innerHTML = `
            <div class="event-date">${formatEventDate(event.date)}</div>
            <div class="event-details">
                <h5>${event.title}</h5>
                <p>${event.description}</p>
                ${timeInfo}
                ${locationInfo}
                ${event.createdBy ? `<small class="event-creator">Added by: ${event.createdBy}</small>` : ''}
            </div>
            <div class="event-actions">
                ${editButton}
                ${deleteButton}
            </div>
        `;
        eventsList.appendChild(eventElement);
    });
}

function deleteEvent(index) {
    if (confirm('Are you sure you want to delete this event?')) {
        events.splice(index, 1);
        renderEvents();
        renderCalendar();
        saveToLocalStorage();
        showNotification('Event deleted successfully!');
    }
}

function editEvent(index) {
    const event = events[index];
    if (!event) return;
    
    // Populate form with existing data
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDate').value = event.date;
    document.getElementById('eventTime').value = event.time || '';
    document.getElementById('eventLocation').value = event.location || '';
    document.getElementById('eventDescription').value = event.description || '';
    
    // Store the index for updating
    document.getElementById('addEventForm').setAttribute('data-edit-index', index);
    
    // Change form button text
    const submitBtn = document.querySelector('#addEventForm button[type="submit"]');
    submitBtn.textContent = 'Update Event';
    
    // Scroll to form
    document.getElementById('addEventForm').scrollIntoView({ behavior: 'smooth' });
    
    showNotification('Event loaded for editing. Make changes and click "Update Event".');
}

function formatEventDate(dateString) {
    const date = new Date(dateString);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

// Tasks functionality
function renderTasks() {
    const categoryContainers = {
        'design': document.getElementById('designTasks'),
        'procurement': document.getElementById('procurementTasks'),
        'assembly': document.getElementById('assemblyTasks')
    };
    
    Object.keys(categoryContainers).forEach(category => {
        const container = categoryContainers[category];
        if (container) {
            container.innerHTML = '';
            
            const categoryTasks = tasks.filter(task => task.category === category);
            categoryTasks.forEach((task, index) => {
                const taskElement = document.createElement('div');
                taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
                
                const deleteButton = editMode.tasks ? 
                    `<button class="delete-task-btn" onclick="deleteTask('${category}', ${index})" title="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>` : '';
                
                taskElement.innerHTML = `
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
                    <span>${task.title}</span>
                    ${deleteButton}
                `;
                container.appendChild(taskElement);
            });
        }
    });
}

function deleteTask(category, index) {
    if (confirm('Are you sure you want to delete this task?')) {
        const categoryTasks = tasks.filter(task => task.category === category);
        const taskToDelete = categoryTasks[index];
        const globalIndex = tasks.findIndex(task => task === taskToDelete);
        
        if (globalIndex !== -1) {
            tasks.splice(globalIndex, 1);
            renderTasks();
            saveToLocalStorage();
            showNotification('Task deleted successfully!');
        }
    }
}

async function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const newCompleted = !task.completed;
        
        // Try Firebase first
        const firebaseSuccess = await updateTaskInFirebase(taskId, { completed: newCompleted });
        
        if (!firebaseSuccess) {
            // Fallback to local storage
            task.completed = newCompleted;
            renderTasks();
            saveToLocalStorage();
        }
    }
}

// Event listeners setup
function setupEventListeners() {
    // Add link form
    document.getElementById('addLinkForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addLink();
    });
    
    // Add event form
    document.getElementById('addEventForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addEvent();
    });
    
    // Add task form
    document.getElementById('addTaskForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addTask();
    });
    
    // Upload PDF form
    document.getElementById('uploadPDFForm').addEventListener('submit', function(e) {
        e.preventDefault();
        uploadPDF();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('projectHub');
        if (e.target === modal) {
            closeProjectHub();
        }
    });
}

// Render links function
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
    
    // If no links to display, show a message
    if (!hasAnyLinks) {
        linksGrid.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No links added yet. Add your first link below!</p>';
    }
    
    console.log('Links grid after rendering:', linksGrid.innerHTML);
}

// Add new link
async function addLink() {
    const titleElement = document.getElementById('linkTitle');
    const urlElement = document.getElementById('linkUrl');
    const categoryElement = document.getElementById('linkCategory');
    
    // Check if elements exist
    if (!titleElement || !urlElement || !categoryElement) {
        alert('Form elements not found. Please refresh the page and try again.');
        console.error('Missing form elements:', {
            titleElement: !!titleElement,
            urlElement: !!urlElement,
            categoryElement: !!categoryElement
        });
        return;
    }
    
    const title = titleElement.value.trim();
    const url = urlElement.value.trim();
    const category = categoryElement.value;
    
    // Debug logging
    console.log('Link form data:', { title, url, category });
    console.log('Form elements found:', {
        titleElement: titleElement,
        urlElement: urlElement,
        categoryElement: categoryElement
    });
    
    if (!title || !url || !category) {
        console.log('Validation failed:', { title, url, category });
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
    
    // Try Firebase first, fallback to local storage
    const firebaseSuccess = await saveLinksToFirebase();
    
    if (!firebaseSuccess) {
        // Fallback to local storage
        saveToLocalStorage();
    }
    
    // Re-render links to show the new addition
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
            
            // Try Firebase first, fallback to local storage
            const firebaseSuccess = await saveLinksToFirebase();
            
            if (!firebaseSuccess) {
                // Fallback to local storage
                saveToLocalStorage();
            }
            
            // Re-render links
            renderLinks();
            
            showNotification('Link deleted successfully!');
        }
    }
}

// Add new event
async function addEvent() {
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value;
    const description = document.getElementById('eventDescription').value;
    
    if (!title || !date) {
        alert('Please fill in required fields');
        return;
    }
    
    const eventData = {
        title,
        date,
        time: time || null,
        location: location || null,
        description: description || 'No description provided'
    };
    
    // Check if we're editing an existing event
    const editIndex = document.getElementById('addEventForm').getAttribute('data-edit-index');
    
    if (editIndex !== null) {
        // Update existing event
        const index = parseInt(editIndex);
        if (events[index]) {
            events[index] = { ...events[index], ...eventData };
            renderEvents();
            renderCalendar();
            saveToLocalStorage();
            showNotification('Event updated successfully!');
        }
        
        // Reset form to add mode
        document.getElementById('addEventForm').removeAttribute('data-edit-index');
        const submitBtn = document.querySelector('#addEventForm button[type="submit"]');
        submitBtn.textContent = 'Add Event';
    } else {
        // Add new event
        const newEvent = { ...eventData, id: events.length + 1 };
        
        // Try Firebase first, fallback to local storage
        const firebaseSuccess = await addEventToFirebase(newEvent);
        
        if (!firebaseSuccess) {
            // Fallback to local storage
            events.push(newEvent);
            renderEvents();
            renderCalendar();
            saveToLocalStorage();
        }
        
        showNotification('Event added successfully!');
    }
    
    // Clear form
    document.getElementById('addEventForm').reset();
    
    // Close the add event section
    toggleAddEventSection();
}

// Add new task
async function addTask() {
    const title = document.getElementById('taskTitle').value;
    const category = document.getElementById('taskCategory').value;
    
    if (!title || !category) {
        alert('Please fill in all fields');
        return;
    }
    
    const newTask = {
        title,
        category,
        completed: false
    };
    
    // Try Firebase first, fallback to local storage
    const firebaseSuccess = await addTaskToFirebase(newTask);
    
    if (!firebaseSuccess) {
        // Fallback to local storage
        newTask.id = tasks.length + 1;
        tasks.push(newTask);
        renderTasks();
        saveToLocalStorage();
    }
    
    // Clear form
    document.getElementById('addTaskForm').reset();
    
    showNotification('Task added successfully!');
}

// Upload PDF function
async function uploadPDF() {
    const title = document.getElementById('pdfTitle').value.trim();
    const fileInput = document.getElementById('pdfFile');
    const category = document.getElementById('pdfCategory').value;
    
    if (!title || !fileInput.files[0] || !category) {
        alert('Please fill in all fields and select a PDF file');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Validate file type
    if (file.type !== 'application/pdf') {
        alert('Please select a valid PDF file');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }
    
    // Create object URL for the uploaded file
    const fileUrl = URL.createObjectURL(file);
    
    // Add to links
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
    
    // Try Firebase first, fallback to local storage
    const firebaseSuccess = await saveLinksToFirebase();
    
    if (!firebaseSuccess) {
        // Fallback to local storage
        saveToLocalStorage();
    }
    
    // Re-render links
    renderLinks();
    
    showNotification('PDF uploaded successfully! You can now view it directly in the browser.');
    
    // Close the upload section
    toggleUploadPDFSection();
}

function toggleAddEventSection() {
    const section = document.getElementById('addEventSection');
    const button = document.getElementById('addEventBtn');
    
    if (section.style.display === 'none' || section.style.display === '') {
        // Show section
        section.style.display = 'block';
        button.innerHTML = '<i class="fas fa-minus"></i> Cancel Add Event';
        button.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('eventTitle').focus();
        }, 100);
    } else {
        // Hide section
        section.style.display = 'none';
        button.innerHTML = '<i class="fas fa-plus"></i> Add New Event';
        button.style.background = 'linear-gradient(135deg, #0066cc, #0080ff)';
        
        // Clear form
        document.getElementById('addEventForm').reset();
        
        // Reset form to add mode if it was in edit mode
        document.getElementById('addEventForm').removeAttribute('data-edit-index');
        const submitBtn = document.querySelector('#addEventForm button[type="submit"]');
        submitBtn.textContent = 'Add Event';
    }
}

// Notification system
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Mobile menu toggle (for responsive design)
function toggleMobileMenu() {
    const nav = document.querySelector('.nav');
    nav.classList.toggle('mobile-active');
}

// Add mobile menu functionality if needed
if (window.innerWidth <= 768) {
    // Add mobile menu button
    const header = document.querySelector('.header .container');
    const mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    mobileMenuBtn.className = 'mobile-menu-btn';
    mobileMenuBtn.style.cssText = `
        display: none;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
    `;
    
    if (window.innerWidth <= 768) {
        mobileMenuBtn.style.display = 'block';
    }
    
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    header.appendChild(mobileMenuBtn);
}

// Local storage functions for persistence
function saveToLocalStorage() {
    localStorage.setItem('solarTruckEvents', JSON.stringify(events));
    localStorage.setItem('solarTruckTasks', JSON.stringify(tasks));
    localStorage.setItem('solarTruckLinks', JSON.stringify(links));
}

function loadFromLocalStorage() {
    const savedEvents = localStorage.getItem('solarTruckEvents');
    const savedTasks = localStorage.getItem('solarTruckTasks');
    const savedLinks = localStorage.getItem('solarTruckLinks');
    
    if (savedEvents) {
        events = JSON.parse(savedEvents);
    }
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
    if (savedLinks) {
        links = JSON.parse(savedLinks);
    }
}

// Load data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    initializeCalendar();
    renderEvents();
    renderTasks();
    setupEventListeners();
});

// Save data when changes are made
function saveData() {
    saveToLocalStorage();
}

// Update the add functions to save data
const originalAddEvent = addEvent;
const originalAddTask = addTask;
const originalAddLink = addLink;

addEvent = function() {
    originalAddEvent();
    saveData();
};

addTask = function() {
    originalAddTask();
    saveData();
};

addLink = function() {
    originalAddLink();
    saveData();
};

// Update toggle task to save data
const originalToggleTask = toggleTask;
toggleTask = function(taskId) {
    originalToggleTask(taskId);
    saveData();
};

// Morph Chart Functions
function addMorphColumn() {
    const table = document.getElementById('morphTable');
    const headerRow = table.querySelector('thead tr');
    const tbody = document.getElementById('morphTableBody');
    
    // Get current column count
    const currentColumns = headerRow.children.length;
    const newColumnNumber = currentColumns;
    
    // Add header cell
    const newHeader = document.createElement('th');
    newHeader.className = 'morph-header';
    newHeader.textContent = newColumnNumber;
    headerRow.appendChild(newHeader);
    
    // Add cells to each row
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const newCell = document.createElement('td');
        newCell.className = 'morph-cell';
        newCell.contentEditable = true;
        newCell.textContent = '';
        row.appendChild(newCell);
    });
    
    showNotification('New column added!');
}

function addMorphRow() {
    const tbody = document.getElementById('morphTableBody');
    const headerRow = document.querySelector('thead tr');
    const columnCount = headerRow.children.length;
    
    // Create new row
    const newRow = document.createElement('tr');
    
    // Add function cell
    const functionCell = document.createElement('td');
    functionCell.className = 'morph-function';
    functionCell.contentEditable = true;
    functionCell.textContent = 'New Function';
    newRow.appendChild(functionCell);
    
    // Add data cells
    for (let i = 1; i < columnCount; i++) {
        const dataCell = document.createElement('td');
        dataCell.className = 'morph-cell';
        dataCell.contentEditable = true;
        dataCell.textContent = '';
        newRow.appendChild(dataCell);
    }
    
    tbody.appendChild(newRow);
    showNotification('New function row added!');
}

function deleteMorphColumn() {
    const table = document.getElementById('morphTable');
    const headerRow = table.querySelector('thead tr');
    const tbody = document.getElementById('morphTableBody');
    
    if (headerRow.children.length <= 2) {
        alert('Cannot delete the last column. You need at least one data column.');
        return;
    }
    
    if (confirm('Are you sure you want to delete the last column?')) {
        // Remove header cell
        headerRow.removeChild(headerRow.lastElementChild);
        
        // Remove cells from each row
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.children.length > 1) {
                row.removeChild(row.lastElementChild);
            }
        });
        
        showNotification('Column deleted successfully!');
    }
}

function deleteMorphRow() {
    const tbody = document.getElementById('morphTableBody');
    const rows = tbody.querySelectorAll('tr');
    
    if (rows.length <= 1) {
        alert('Cannot delete the last row. You need at least one function row.');
        return;
    }
    
    if (confirm('Are you sure you want to delete the last function row?')) {
        tbody.removeChild(tbody.lastElementChild);
        showNotification('Function row deleted successfully!');
    }
}

async function saveMorphChart() {
    // Try Firebase first
    const firebaseSuccess = await saveMorphChartToFirebase();
    
    if (!firebaseSuccess) {
        // Fallback to local storage
        const table = document.getElementById('morphTable');
        const notes = document.getElementById('morphNotes').value;
        
        // Extract table data
        const morphData = {
            table: [],
            notes: notes,
            timestamp: new Date().toISOString()
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
        
        // Save to localStorage
        localStorage.setItem('solarTruckMorphChart', JSON.stringify(morphData));
    }
    
    showNotification('Morph Chart saved successfully!');
}

function loadMorphChart() {
    const savedData = localStorage.getItem('solarTruckMorphChart');
    if (savedData) {
        try {
            const morphData = JSON.parse(savedData);
            
            // Load notes
            if (morphData.notes) {
                document.getElementById('morphNotes').value = morphData.notes;
            }
            
            // Load table data if it exists and matches current structure
            if (morphData.table && morphData.table.length > 0) {
                const tbody = document.getElementById('morphTableBody');
                const rows = tbody.querySelectorAll('tr');
                
                morphData.table.forEach((rowData, rowIndex) => {
                    if (rows[rowIndex]) {
                        const cells = rows[rowIndex].querySelectorAll('td');
                        rowData.forEach((cellData, cellIndex) => {
                            if (cells[cellIndex]) {
                                cells[cellIndex].textContent = cellData;
                            }
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error loading morph chart:', error);
        }
    }
}

// Auto-save morph chart when content changes
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for auto-save
    setTimeout(() => {
        const morphCells = document.querySelectorAll('.morph-cell, .morph-function');
        const morphNotes = document.getElementById('morphNotes');
        
        morphCells.forEach(cell => {
            cell.addEventListener('blur', function() {
                saveMorphChart();
            });
        });
        
        if (morphNotes) {
            morphNotes.addEventListener('blur', function() {
                saveMorphChart();
            });
        }
    }, 1000);
});

// PDF Viewer Functions
function openPDFViewer(pdfUrl, title = 'PDF Document') {
    currentPDFUrl = pdfUrl;
    currentPDFTitle = title;
    
    // Show modal
    document.getElementById('pdfViewerModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Set title
    document.getElementById('pdfTitle').textContent = title;
    
    // Show loading state
    document.getElementById('pdfLoading').style.display = 'flex';
    document.getElementById('pdfError').style.display = 'none';
    document.getElementById('pdfCanvas').innerHTML = '';
    
    // Load PDF
    loadPDF(pdfUrl);
}

function closePDFViewer() {
    document.getElementById('pdfViewerModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset variables
    pdfDoc = null;
    currentPage = 1;
    totalPages = 0;
    currentZoom = 1.0;
    currentPDFUrl = '';
    currentPDFTitle = '';
}

async function loadPDF(url) {
    try {
        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            // Load the PDF
            pdfDoc = await pdfjsLib.getDocument(url).promise;
            totalPages = pdfDoc.numPages;
            currentPage = 1;
            
            // Update UI
            updatePageInfo();
            updateNavigationButtons();
            
            // Render first page
            await renderPage(currentPage);
            
            // Hide loading
            document.getElementById('pdfLoading').style.display = 'none';
        } else {
            throw new Error('PDF.js library not loaded');
        }
    } catch (error) {
        console.error('Error loading PDF:', error);
        document.getElementById('pdfLoading').style.display = 'none';
        document.getElementById('pdfError').style.display = 'flex';
    }
}

async function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Calculate scale based on zoom
        const viewport = page.getViewport({ scale: currentZoom });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render page
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Clear canvas container and add new canvas
        const canvasContainer = document.getElementById('pdfCanvas');
        canvasContainer.innerHTML = '';
        canvasContainer.appendChild(canvas);
        
    } catch (error) {
        console.error('Error rendering page:', error);
        document.getElementById('pdfError').style.display = 'flex';
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        updatePageInfo();
        updateNavigationButtons();
        renderPage(currentPage);
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updatePageInfo();
        updateNavigationButtons();
        renderPage(currentPage);
    }
}

function zoomIn() {
    if (currentZoom < 3.0) {
        currentZoom += 0.25;
        updateZoomLevel();
        renderPage(currentPage);
    }
}

function zoomOut() {
    if (currentZoom > 0.5) {
        currentZoom -= 0.25;
        updateZoomLevel();
        renderPage(currentPage);
    }
}

function updatePageInfo() {
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
}

function updateNavigationButtons() {
    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
}

function updateZoomLevel() {
    document.getElementById('zoomLevel').textContent = `${Math.round(currentZoom * 100)}%`;
    document.getElementById('zoomInBtn').disabled = currentZoom >= 3.0;
    document.getElementById('zoomOutBtn').disabled = currentZoom <= 0.5;
}

function downloadPDF() {
    if (currentPDFUrl) {
        const link = document.createElement('a');
        link.href = currentPDFUrl;
        link.download = currentPDFTitle || 'document.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function isPDFUrl(url) {
    return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');
}

// Edit Mode Functions
function toggleEditMode(section) {
    editMode[section] = !editMode[section];
    updateEditModeUI(section);
    
    // Re-render the affected section
    switch(section) {
        case 'events':
            renderEvents();
            break;
        case 'links':
            renderLinks();
            break;
        case 'tasks':
            renderTasks();
            break;
    }
}

function updateEditModeUI(section) {
    const editBtn = document.getElementById(`${section}EditBtn`);
    if (editBtn) {
        if (editMode[section]) {
            editBtn.innerHTML = '<i class="fas fa-check"></i> Done Editing';
            editBtn.classList.add('edit-active');
        } else {
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            editBtn.classList.remove('edit-active');
        }
    }
}

function isEditModeActive(section) {
    return editMode[section];
}

// Debug function to reset links to defaults
function resetLinksToDefaults() {
    localStorage.removeItem('solarTruckLinks');
    location.reload();
}

// Clear Firebase database (for testing)
async function clearFirebaseDatabase() {
    if (!window.db || !window.firebaseFunctions) {
        console.log('Firebase not available');
        return;
    }

    try {
        const { collection, getDocs, deleteDoc } = window.firebaseFunctions;
        
        // Clear events
        const eventsSnapshot = await getDocs(collection(window.db, 'events'));
        eventsSnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
        
        // Clear tasks
        const tasksSnapshot = await getDocs(collection(window.db, 'tasks'));
        tasksSnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
        
        // Clear links
        const linksSnapshot = await getDocs(collection(window.db, 'links'));
        linksSnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
        
        // Clear morph chart
        const morphSnapshot = await getDocs(collection(window.db, 'morphChart'));
        morphSnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
        
        console.log('Firebase database cleared successfully');
        showNotification('Database cleared successfully!');
        
        // Reload the page to start fresh
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Error clearing Firebase database:', error);
        showNotification('Error clearing database');
    }
}

// Collapsible Section Functions
function toggleAddLinkSection() {
    const section = document.getElementById('addLinkSection');
    const button = document.getElementById('addLinkBtn');
    
    if (section.style.display === 'none' || section.style.display === '') {
        // Show section
        section.style.display = 'block';
        button.innerHTML = '<i class="fas fa-minus"></i> Cancel Add Link';
        button.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
        
        // Hide upload section if it's open
        const uploadSection = document.getElementById('uploadPDFSection');
        const uploadButton = document.getElementById('uploadPDFBtn');
        if (uploadSection.style.display === 'block') {
            uploadSection.style.display = 'none';
            uploadButton.innerHTML = '<i class="fas fa-upload"></i> Upload PDF Document';
            uploadButton.style.background = 'linear-gradient(135deg, #0066cc, #0080ff)';
        }
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('linkTitle').focus();
        }, 100);
    } else {
        // Hide section
        section.style.display = 'none';
        button.innerHTML = '<i class="fas fa-plus"></i> Add New Link';
        button.style.background = 'linear-gradient(135deg, #0066cc, #0080ff)';
        
        // Clear form
        document.getElementById('addLinkForm').reset();
    }
}

function toggleUploadPDFSection() {
    const section = document.getElementById('uploadPDFSection');
    const button = document.getElementById('uploadPDFBtn');
    
    if (section.style.display === 'none' || section.style.display === '') {
        // Show section
        section.style.display = 'block';
        button.innerHTML = '<i class="fas fa-minus"></i> Cancel Upload';
        button.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
        
        // Hide add link section if it's open
        const linkSection = document.getElementById('addLinkSection');
        const linkButton = document.getElementById('addLinkBtn');
        if (linkSection.style.display === 'block') {
            linkSection.style.display = 'none';
            linkButton.innerHTML = '<i class="fas fa-plus"></i> Add New Link';
            linkButton.style.background = 'linear-gradient(135deg, #0066cc, #0080ff)';
        }
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('pdfTitle').focus();
        }, 100);
    } else {
        // Hide section
        section.style.display = 'none';
        button.innerHTML = '<i class="fas fa-upload"></i> Upload PDF Document';
        button.style.background = 'linear-gradient(135deg, #0066cc, #0080ff)';
        
        // Clear form
        document.getElementById('uploadPDFForm').reset();
    }
}

// Close PDF viewer when clicking outside
window.addEventListener('click', function(e) {
    const pdfModal = document.getElementById('pdfViewerModal');
    if (e.target === pdfModal) {
        closePDFViewer();
    }
});

// Keyboard navigation for PDF viewer
document.addEventListener('keydown', function(e) {
    const pdfModal = document.getElementById('pdfViewerModal');
    if (pdfModal.style.display === 'block') {
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                previousPage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextPage();
                break;
            case 'Escape':
                e.preventDefault();
                closePDFViewer();
                break;
            case '+':
            case '=':
                e.preventDefault();
                zoomIn();
                break;
            case '-':
                e.preventDefault();
                zoomOut();
                break;
        }
    }
});
