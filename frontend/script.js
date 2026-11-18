const form = document.querySelector('#task-form');
const title = document.querySelector('#title');
const list = document.querySelector('#tasks');
const error = document.querySelector('#error');

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.error || 'Une erreur est survenue.');
  }
  return response.status === 204 ? null : response.json();
}

function showTask(task) {
  const item = document.createElement('li');
  item.classList.toggle('done', task.done);
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', `Terminer : ${task.title}`);
  const label = document.createElement('span');
  label.textContent = task.title;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = '🗑';
  remove.setAttribute('aria-label', `Supprimer : ${task.title}`);

  checkbox.addEventListener('change', async () => {
    checkbox.disabled = true;
    error.textContent = '';
    try {
      const updated = await request(`/api/tasks/${task.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: checkbox.checked })
      });
      checkbox.checked = updated.done;
      item.classList.toggle('done', updated.done);
    } catch (err) {
      checkbox.checked = !checkbox.checked;
      error.textContent = err.message;
    } finally { checkbox.disabled = false; }
  });
  remove.addEventListener('click', async () => {
    remove.disabled = true;
    error.textContent = '';
    try {
      await request(`/api/tasks/${task.id}`, { method: 'DELETE' });
      item.remove();
    } catch (err) {
      error.textContent = err.message;
      remove.disabled = false;
    }
  });
  item.append(checkbox, label, remove);
  list.append(item);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = title.value.trim();
  if (!value) { error.textContent = 'Saisis un titre pour la tâche.'; return; }
  const button = form.querySelector('button');
  button.disabled = true;
  error.textContent = '';
  try {
    const task = await request('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: value })
    });
    showTask(task);
    form.reset();
    title.focus();
  } catch (err) { error.textContent = err.message; }
  finally { button.disabled = false; }
});

request('/api/tasks').then(tasks => tasks.forEach(showTask))
  .catch(err => { error.textContent = err.message; });

request('/api/info').then(data => {
  document.querySelector('#result').textContent = data.msg;
}).catch(() => {
  document.querySelector('#result').textContent = 'Impossible de charger les informations.';
});
