const form = document.querySelector('#task-form');
const title = document.querySelector('#title');
const list = document.querySelector('#tasks');
const error = document.querySelector('#error');
const counter = document.querySelector('#counter');
const filter = document.querySelector('#task-filter');
const addButton = form.querySelector('button');
const pending = new Set();
let tasks = [];

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.error || 'Une erreur est survenue.');
  }
  return response.status === 204 ? null : response.json();
}

function renderTasks() {
  const completed = tasks.filter(task => task.done).length;
  counter.textContent = `${tasks.length - completed} à faire · ${completed} terminées`;
  const visible = tasks.filter(task => {
    if (filter.value === 'todo') return !task.done;
    if (filter.value === 'done') return task.done;
    return true;
  });
  list.replaceChildren(...visible.map(taskItem));
}

function taskItem(task) {
  const item = document.createElement('li');
  item.classList.toggle('done', task.done);
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.disabled = pending.has(task.id);
  checkbox.setAttribute('aria-label', `Terminer : ${task.title}`);
  const label = document.createElement('span');
  label.textContent = task.title;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.disabled = pending.has(task.id);
  remove.textContent = '🗑';
  remove.setAttribute('aria-label', `Supprimer : ${task.title}`);

  checkbox.addEventListener('change', async () => {
    pending.add(task.id);
    checkbox.disabled = true;
    remove.disabled = true;
    error.textContent = '';
    try {
      const updated = await request(`/api/tasks/${task.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: checkbox.checked })
      });
      task.done = updated.done;
    } catch (err) {
      error.textContent = err.message;
    } finally {
      pending.delete(task.id);
      renderTasks();
    }
  });
  remove.addEventListener('click', async () => {
    pending.add(task.id);
    checkbox.disabled = true;
    remove.disabled = true;
    error.textContent = '';
    try {
      await request(`/api/tasks/${task.id}`, { method: 'DELETE' });
      tasks = tasks.filter(entry => entry.id !== task.id);
    } catch (err) {
      error.textContent = err.message;
    } finally {
      pending.delete(task.id);
      renderTasks();
    }
  });
  item.append(checkbox, label, remove);
  return item;
}

filter.addEventListener('change', renderTasks);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = title.value.trim();
  if (!value) { error.textContent = 'Saisis un titre pour la tâche.'; return; }
  addButton.disabled = true;
  error.textContent = '';
  try {
    const task = await request('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: value })
    });
    tasks.push(task);
    renderTasks();
    form.reset();
    title.focus();
  } catch (err) { error.textContent = err.message; }
  finally { addButton.disabled = false; }
});

request('/api/tasks').then(initialTasks => {
  tasks = initialTasks;
  renderTasks();
  addButton.disabled = false;
})
  .catch(err => { error.textContent = err.message; });

request('/api/info').then(data => {
  document.querySelector('#result').textContent = data.msg;
}).catch(() => {
  document.querySelector('#result').textContent = 'Impossible de charger les informations.';
});
