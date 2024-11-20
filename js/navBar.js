document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

    // Warning Modal functionality
    const modal = document.getElementById('warningModal');
    const checkbox = document.getElementById('agreeCheckbox');
    const continueButton = document.getElementById('continueButton');
    const mainContent = document.getElementById('container');

    checkbox.addEventListener('change', function() {
      continueButton.disabled = !this.checked;
    });

    continueButton.addEventListener('click', function() {
      if (checkbox.checked) {
        modal.style.display = 'none';
        mainContent.style.display = 'block';
      }
    });
});