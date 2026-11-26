const feedback = document.querySelector('[role="status"]');
if (!feedback) throw new Error('Fixture feedback is missing');

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-choice]')) {
  button.addEventListener('click', () => {
    feedback.textContent = button.dataset.choice === 'square' ? 'Solved!' : 'Try again.';
  });
}
