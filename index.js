let isMarkdownMode = true;
let timer;
let timeLeft = 1500; // 25 minutes in seconds
let isTimerRunning = false;

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const dateFilter = document.getElementById('dateFilter');
    dateFilter.valueAsDate = new Date();
    
    // Initial load with date filter
    filterByDate();
});

function filterByDate() {
    filterTasks();
    filterNotes();
}


document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
    
    loadTodos();
    loadNotes();
    updateProgressBar();
    
    document.getElementById('noteContent').addEventListener('input', updatePreview);
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    // Initialize Sortable
    new Sortable(document.getElementById('todoList'), {
        animation: 150,
        handle: '.drag-handle',
        onEnd: () => {
            // Update order in storage
            const items = document.querySelectorAll('#todoList .item');
            const todos = Array.from(items).map(item => {
                return getTodos().find(todo => todo.id === parseInt(item.dataset.id));
            });
            saveTodos(todos);
        }
    });

    new Sortable(document.getElementById('notesList'), {
        animation: 150,
        handle: '.drag-handle',
        onEnd: () => {
            const items = document.querySelectorAll('#notesList .item');
            const notes = Array.from(items).map(item => {
                return getNotes().find(note => note.id === parseInt(item.dataset.noteId));
            });
            saveNotes(notes);
        }
    });
});

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
}

function updatePreview() {
    const content = document.getElementById('noteContent').value;
    const preview = document.getElementById('preview');
    
    if (isMarkdownMode) {
        preview.innerHTML = marked.parse(content);
    } else {
        preview.innerHTML = `<pre><code class="${document.getElementById('codeLanguage').value}">${content}</code></pre>`;
        hljs.highlightAll();
    }
}

function switchTab(tab, mode) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    isMarkdownMode = mode === 'markdown';
    document.getElementById('codeLanguage').style.display = isMarkdownMode ? 'none' : 'block';
    document.getElementById('noteContent').placeholder = isMarkdownMode ? 'Write in Markdown...' : 'Enter code...';
    updatePreview();
}

function addTodo() {
    const input = document.getElementById('todoInput');
    const priority = document.getElementById('taskPriority').value;
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const text = input.value.trim();
    
    if (text && dueDate) {
        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            priority: priority,
            category: category,
            dueDate: dueDate,
            timestamp: new Date().toISOString()
        };

        const todos = getTodos();
        todos.push(todo);
        saveTodos(todos);
        input.value = '';
        filterTasks();
        updateProgressBar();
    }
}

function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const language = document.getElementById('codeLanguage').value;

    if (title && content) {
        const note = {
            id: Date.now(),
            title: title,
            content: content,
            isCode: !isMarkdownMode,
            language: language,
            timestamp: new Date().toISOString()
        };

        const notes = getNotes();
        notes.push(note);
        saveNotes(notes);

        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('preview').innerHTML = '';
        filterNotes();
    }
}

function renderTodo(todo) {
    const li = document.createElement('li');
    li.className = `item priority-${todo.priority}`;
    li.setAttribute('data-id', todo.id);
    
    const dueDateStr = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : '';
    const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
    
    li.innerHTML = `
        <span class="drag-handle">⋮</span>
        <input type="checkbox" ${todo.completed ? 'checked' : ''} 
            onclick="toggleTodo(${todo.id})">
        <span style="${todo.completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${todo.text}</span>
        <span class="tag">${todo.priority}</span>
        <span class="tag">${todo.category}</span>
        ${dueDateStr ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">${dueDateStr}</span>` : ''}
        <button onclick="deleteTodo(${todo.id})">Delete</button>
    `;
    
    document.getElementById('todoList').prepend(li);
}

function renderNote(note) {
    const div = document.createElement('div');
    div.className = 'item';
    div.setAttribute('data-note-id', note.id);
    
    let content = note.isCode 
        ? `<pre><code class="${note.language}">${note.content}</code></pre>`
        : marked.parse(note.content);

    div.innerHTML = `
        <span class="drag-handle">⋮</span>
        <div style="flex-grow: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>${note.title}</h3>
                <button onclick="deleteNote(${note.id})">Delete</button>
            </div>
            <div class="${note.isCode ? 'code-preview' : 'markdown-preview'}">${content}</div>
            <div style="margin-top: 10px;">
                <span class="tag">${note.isCode ? note.language : 'markdown'}</span>
                <span class="tag">${new Date(note.timestamp).toLocaleDateString()}</span>
            </div>
        </div>
    `;
    
    document.getElementById('notesList').prepend(div);
    if (note.isCode) hljs.highlightAll();
}

function filterTasks() {
    const selectedDate = document.getElementById('dateFilter').value;
    const priority = document.getElementById('priorityFilter').value;
    const category = document.getElementById('categoryFilter').value;
    const search = document.getElementById('searchTasks').value.toLowerCase();
    const todos = getTodos();

    document.getElementById('todoList').innerHTML = '';
    todos.filter(todo => {
        const matchesPriority = priority === 'all' || todo.priority === priority;
        const matchesCategory = category === 'all' || todo.category === category;
        const matchesSearch = todo.text.toLowerCase().includes(search);
        const matchesDate = todo.dueDate === selectedDate;
        return matchesPriority && matchesCategory && matchesSearch && matchesDate;
    }).forEach(todo => renderTodo(todo));
}

function toggleTimer() {
    if (isTimerRunning) {
        clearInterval(timer);
        document.getElementById('timerBtn').textContent = 'Start';
    } else {
        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft === 0) {
                clearInterval(timer);
                celebrate();
                alert('Time is up! Take a break.');
                resetTimer();
            }
        }, 1000);
        document.getElementById('timerBtn').textContent = 'Pause';
    }
    isTimerRunning = !isTimerRunning;
}

function resetTimer() {
    clearInterval(timer);
    const workDuration = parseInt(document.getElementById('workDuration').value) || 25;
    timeLeft = workDuration * 60;
    isTimerRunning = false;
    document.getElementById('timerBtn').textContent = 'Start';
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getTodos() {
    return JSON.parse(localStorage.getItem('todos') || '[]');
}

function getNotes() {
    return JSON.parse(localStorage.getItem('notes') || '[]');
}

function saveTodos(todos) {
    localStorage.setItem('todos', JSON.stringify(todos));
    updateProgressBar();
}

function saveNotes(notes) {
    localStorage.setItem('notes', JSON.stringify(notes));
}

function toggleTodo(id) {
    const todos = getTodos();
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos(todos);
        if (todo.completed) {
            celebrate();
        }
        filterTasks();
    }
}

function deleteTodo(id) {
    const todos = getTodos().filter(t => t.id !== id);
    saveTodos(todos);
    filterTasks();
}

function deleteNote(id) {
    const notes = getNotes().filter(n => n.id !== id);
    saveNotes(notes);
    loadNotes();
}

function loadTodos() {
    document.getElementById('todoList').innerHTML = '';
    const todos = getTodos();
    todos.forEach(todo => renderTodo(todo));
}

function loadNotes() {
    document.getElementById('notesList').innerHTML = '';
    const notes = getNotes();
    notes.forEach(note => renderNote(note));
}

function updateProgressBar() {
    const todos = getTodos();
    if (todos.length === 0) {
        document.getElementById('taskProgress').style.width = '0%';
        return;
    }
    const completed = todos.filter(todo => todo.completed).length;
    const progress = (completed / todos.length) * 100;
    document.getElementById('taskProgress').style.width = `${progress}%`;
}

function celebrate() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

function exportData() {
    const data = {
        todos: getTodos(),
        notes: getNotes()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'developer-workbench-data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.todos) saveTodos(data.todos);
                if (data.notes) saveNotes(data.notes);
                loadTodos();
                loadNotes();
                alert('Data imported successfully!');
            } catch (error) {
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }
}

function filterNotes() {
    const selectedDate = document.getElementById('dateFilter').value;
    const notes = getNotes();
    
    document.getElementById('notesList').innerHTML = '';
    notes.filter(note => {
        const noteDate = new Date(note.timestamp).toISOString().split('T')[0];
        return noteDate === selectedDate;
    }).forEach(note => renderNote(note));
}

function setPlaceholder(input) {
    if (!input.value) {
        input.style.color = "#aaa";
        input.type = "text";
        input.value = "Due Date";
    }
}

document.getElementById("taskDueDate").addEventListener("focus", function() {
    if (this.value === "Due Date") {
        this.value = "";
        this.type = "date";
        this.style.color = "#000";
    }
});

setPlaceholder(document.getElementById("taskDueDate"));
