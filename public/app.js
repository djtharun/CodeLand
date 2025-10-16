AFRAME.registerComponent('upload-handler', {
  init: function () {
    this.el.addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.querySelector('#uploadBtn');
  if (uploadBtn) uploadBtn.setAttribute('upload-handler', '');

  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const code = event.target.result;
      updatePanel("Sending code to AI...");

      try {
        const res = await fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        updatePanel(data.suggestions || "No response from AI.");
      } catch (err) {
        updatePanel("Error contacting AI API.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  });
});

function updatePanel(text) {
  const aiResponse = document.querySelector('#aiResponse');
  aiResponse?.setAttribute('value', text);
}
