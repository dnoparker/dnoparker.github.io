const tones = [
    {
      name: "PEARL",
      hex: "#DEB99C"
    },
    {
      name: "UDAY",
      hex: "#AD846B"
    },
    {
      name: "RAVEN",
      hex: "#967759"
    },
    {
      name: "BOJANGLES",
      hex: "#5E4E3E"
    }
  ];

let currentSelectedToneIndex = 0;

function createToneCircles() {
  const toneCirclesContainer = document.getElementById('tone-circles');
  
  tones.forEach((tone, index) => {
    const circleContainer = document.createElement('div');
    circleContainer.className = 'tone-circle-container';
    circleContainer.dataset.toneIndex = index;

    const circle = document.createElement('div');
    circle.className = 'tone-circle';
    circle.style.backgroundColor = tone.hex;
    circle.title = tone.name;

    const nameLabel = document.createElement('span');
    nameLabel.className = 'tone-name';
    nameLabel.textContent = tone.name;

    circleContainer.appendChild(circle);
    circleContainer.appendChild(nameLabel);
    
    circleContainer.addEventListener('click', () => {
      selectTone(index);
      console.log(`Selected tone: ${tone.name}`);
    });
    
    toneCirclesContainer.appendChild(circleContainer);
  });
}

function selectTone(index) {
    currentSelectedToneIndex = index;
    updateUISelection(index);
    console.log('Tone selected:', index, tones[index].name);

    // Dispatch the 'toneSelected' event
    const event = new CustomEvent('toneSelected', { detail: { index } });
    document.dispatchEvent(event);
}

function updateUISelection(index) {
  document.querySelectorAll('.tone-circle-container').forEach(c => {
    c.classList.remove('selected');
    if (parseInt(c.dataset.toneIndex) === index) {
      c.classList.add('selected');
    }
  });
}

function highlightAISuggestedTone(suggestedToneName) {
  suggestedToneName = suggestedToneName.toUpperCase();
  document.querySelectorAll('.tone-circle-container').forEach(container => {
    const nameLabel = container.querySelector('.tone-name');
    
    if (nameLabel.textContent === suggestedToneName) {
      container.classList.add('ai-suggested');
      console.log('Highlighted tone: ' + suggestedToneName);
    } else {
      container.classList.remove('ai-suggested');
      console.log('Unhighlighted tone: ' + nameLabel.textContent);
    }
  });
}

function getCurrentTone() {
    return {
        index: currentSelectedToneIndex,
        tone: tones[currentSelectedToneIndex]
    };
}

export { 
    tones, 
    createToneCircles, 
    highlightAISuggestedTone, 
    selectTone, 
    updateUISelection,
    getCurrentTone 
};
