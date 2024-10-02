const tones = [
    {
      name: "PEARL",
      hex: "#DEBA9D"
    },
    {
      name: "AILEY",
      hex: "#AE846C"
    },
    {
      name: "RAVEN",
      hex: "#967758"
    },
    {
      name: "BOJANGLES",
      hex: "#5E4F3F"
    }
  ];

function createToneCircles() {
  const toneCirclesContainer = document.getElementById('tone-circles');
  
  tones.forEach(tone => {
    const circleContainer = document.createElement('div');
    circleContainer.className = 'tone-circle-container';

    const circle = document.createElement('div');
    circle.className = 'tone-circle';
    circle.style.backgroundColor = tone.hex;
    circle.title = tone.name;

    const nameLabel = document.createElement('span');
    nameLabel.className = 'tone-name';
    nameLabel.textContent = tone.name;

    const aiSuggestedLabel = document.createElement('span');
    aiSuggestedLabel.className = 'ai-suggested-label';
    aiSuggestedLabel.textContent = 'AI Suggested';
    aiSuggestedLabel.style.display = 'none';

    circleContainer.appendChild(aiSuggestedLabel);
    circleContainer.appendChild(circle);
    circleContainer.appendChild(nameLabel);
    
    circleContainer.addEventListener('click', () => {
      document.querySelectorAll('.tone-circle-container').forEach(c => c.classList.remove('selected'));
      circleContainer.classList.add('selected');
      console.log(`Selected tone: ${tone.name}`);
    });
    
    toneCirclesContainer.appendChild(circleContainer);
  });
}

function highlightAISuggestedTone(suggestedToneName) {
  suggestedToneName = suggestedToneName.toUpperCase();
  document.querySelectorAll('.tone-circle-container').forEach(container => {
    const nameLabel = container.querySelector('.tone-name');
    const aiSuggestedLabel = container.querySelector('.ai-suggested-label');
    
    if (nameLabel.textContent === suggestedToneName) {
      container.classList.add('ai-suggested');
      aiSuggestedLabel.style.display = 'block';
      console.log('Highlighted tone: ' + suggestedToneName);
    } else {
      container.classList.remove('ai-suggested');
      aiSuggestedLabel.style.display = 'none';
      console.log('Unhighlighted tone: ' + nameLabel.textContent);
    }
  });
}

export { tones, createToneCircles, highlightAISuggestedTone };