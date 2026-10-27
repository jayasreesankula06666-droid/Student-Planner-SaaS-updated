const STORAGE_KEYS = { tasks: 'studyspace_tasks_v1', schedule: 'studyspace_schedule_v1', exams: 'studyspace_exams_v1' };
const $ = (selector) => document.querySelector(selector);
const load = (key, fallback = []) => {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
let tasks = load(STORAGE_KEYS.tasks);
let schedule = load(STORAGE_KEYS.schedule, [
  { id: 's1', time: '08:30', subject: 'Morning revision' },
  { id: 's2', time: '16:00', subject: 'Homework and practice' },
  { id: 's3', time: '19:00', subject: 'Read class notes' }
]);
let exams = load(STORAGE_KEYS.exams);
let currentFilter = 'all';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateLabel = (dateString) => {
  if (!dateString) return 'No due date';
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
const today = new Date();
$('#today-label').textContent = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

function renderTasks() {
  const list = $('#task-list');
  const visible = tasks.filter(task => currentFilter === 'all' || (currentFilter === 'active' ? !task.done : task.done));
  list.innerHTML = visible.map(task => `
    <div class="task-row ${task.done ? 'done' : ''}">
      <input class="check-task" type="checkbox" data-toggle-task="${escapeHtml(task.id)}" ${task.done ? 'checked' : ''} aria-label="Mark ${escapeHtml(task.title)} completed">
      <div class="task-info">
        <div class="task-name">${escapeHtml(task.title)}</div>
        <div class="task-meta">${escapeHtml(task.subject || 'General')} · ${escapeHtml(dateLabel(task.due))}</div>
      </div>
      <div class="task-actions"><button class="tiny-btn" data-delete-task="${escapeHtml(task.id)}" aria-label="Delete task">✕</button></div>
    </div>`).join('');
  $('#empty-tasks').classList.toggle('hidden', visible.length > 0);
  $('#completed-count').textContent = tasks.filter(t => t.done).length;
  $('#remaining-count').textContent = tasks.filter(t => !t.done).length;
  const percent = tasks.length ? Math.round(tasks.filter(t => t.done).length / tasks.length * 100) : 0;
  $('#progress-percent').textContent = percent + '%';
  $('#progress-ring').style.background = `conic-gradient(var(--purple) ${percent}%, #efedf7 ${percent}%)`;
  $('#progress-message').textContent = tasks.length === 0 ? 'Start with one small task. You’ve got this!' : percent === 100 ? 'Amazing! All your tasks are complete. 🎉' : percent >= 50 ? 'You are making good progress. Keep going! ✨' : 'Every completed task is a step forward. 🌱';
}
function renderSchedule() {
  schedule.sort((a, b) => a.time.localeCompare(b.time));
  $('#schedule-list').innerHTML = schedule.map(item => `
    <div class="schedule-item"><div class="schedule-time">${escapeHtml(item.time)}</div><div class="schedule-subject">${escapeHtml(item.subject)}</div><button class="tiny-btn" data-delete-schedule="${escapeHtml(item.id)}" aria-label="Delete schedule item">✕</button></div>
  `).join('') || '<p class="empty-state">Add a study session to plan your day.</p>';
}
function renderExams() {
  exams.sort((a, b) => a.date.localeCompare(b.date));
  $('#exam-list').innerHTML = exams.map(exam => {
    const date = exam.date ? new Date(exam.date + 'T12:00:00') : null;
    const day = date ? date.getDate() : '—';
    const month = date ? date.toLocaleDateString(undefined, { month: 'short' }) : 'DATE';
    return `<div class="exam-item"><div class="date-tile"><strong>${day}</strong><span>${escapeHtml(month)}</span></div><div class="exam-details"><strong>${escapeHtml(exam.title)}</strong><small>${escapeHtml(exam.subject || 'General')} · ${escapeHtml(dateLabel(exam.date))}</small></div><button class="delete-exam" data-delete-exam="${escapeHtml(exam.id)}" aria-label="Delete deadline">✕</button></div>`;
  }).join('') || '<p class="empty-state">No deadlines yet. Add an exam date above.</p>';
  const todayString = new Date().toISOString().slice(0, 10);
  $('#exam-count').textContent = exams.filter(exam => exam.date >= todayString).length;
}
function renderAll() { renderTasks(); renderSchedule(); renderExams(); }

$('#open-task-form').addEventListener('click', () => {
  $('#task-form').classList.toggle('hidden');
  if (!$('#task-form').classList.contains('hidden')) $('#task-title').focus();
});
$('#cancel-task').addEventListener('click', () => $('#task-form').classList.add('hidden'));
$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const title = $('#task-title').value.trim();
  if (!title) return;
  tasks.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title, subject: $('#task-subject').value.trim(), due: $('#task-date').value, done: false });
  save(STORAGE_KEYS.tasks, tasks);
  event.target.reset();
  $('#task-form').classList.add('hidden');
  currentFilter = 'all';
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === 'all'));
  renderTasks();
});
document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
  currentFilter = btn.dataset.filter;
  document.querySelectorAll('.filter-btn').forEach(item => item.classList.toggle('active', item === btn));
  renderTasks();
}));
$('#task-list').addEventListener('change', (event) => {
  const id = event.target.dataset.toggleTask;
  if (!id) return;
  tasks = tasks.map(task => task.id === id ? { ...task, done: event.target.checked } : task);
  save(STORAGE_KEYS.tasks, tasks);
  renderTasks();
});
$('#task-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-task]');
  if (!button) return;
  tasks = tasks.filter(task => task.id !== button.dataset.deleteTask);
  save(STORAGE_KEYS.tasks, tasks);
  renderTasks();
});
$('#schedule-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const time = $('#schedule-time').value;
  const subject = $('#schedule-subject').value.trim();
  if (!time || !subject) return;
  schedule.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), time, subject });
  save(STORAGE_KEYS.schedule, schedule);
  event.target.reset();
  renderSchedule();
});
$('#schedule-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-schedule]');
  if (!button) return;
  schedule = schedule.filter(item => item.id !== button.dataset.deleteSchedule);
  save(STORAGE_KEYS.schedule, schedule);
  renderSchedule();
});
$('#exam-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const title = $('#exam-title').value.trim();
  const date = $('#exam-date').value;
  if (!title || !date) return;
  exams.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title, subject: $('#exam-subject').value.trim(), date });
  save(STORAGE_KEYS.exams, exams);
  event.target.reset();
  renderExams();
});
$('#exam-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-exam]');
  if (!button) return;
  exams = exams.filter(exam => exam.id !== button.dataset.deleteExam);
  save(STORAGE_KEYS.exams, exams);
  renderExams();
});
renderAll();
