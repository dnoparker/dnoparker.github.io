const tones = [
    {
      name: "PEARL",
      hex: "#deba9d",
      texture: "./images/textures/pearl_texture.webp"
    },
    {
      name: "UDAY",
      hex: "#ad856b",
      texture: "./images/textures/uday_texture.webp"
    },
    {
      name: "RAVEN",
      hex: "#947a5e",
      texture: "./images/textures/raven_texture.webp"
    },
    {
      name: "BOJANGLES",
      hex: "#5d4b3c",
      texture: "./images/textures/bojangles_texture.webp"
    }
  ];

let currentSelectedToneIndex = null;

function createToneCircles() {
  const toneCirclesContainer = document.getElementById('tone-circles');
  
  tones.forEach((tone, index) => {
    const circleContainer = document.createElement('div');
    circleContainer.className = 'tone-circle-container';
    circleContainer.dataset.toneIndex = index;

    const circleWrapper = document.createElement('div');
    circleWrapper.className = 'tone-circle-wrapper';

    const circle = document.createElement('div');
    circle.className = 'tone-circle';
    circle.style.backgroundImage = `url(${tone.texture})`;
    circle.title = tone.name;

    const nameLabel = document.createElement('span');
    nameLabel.className = 'tone-name';
    nameLabel.textContent = tone.name;

    circleWrapper.appendChild(circle);
    circleWrapper.appendChild(nameLabel);
    
    circleContainer.appendChild(circleWrapper);
    
    circleContainer.addEventListener('click', () => {
      selectTone(index);
      console.log(`Selected tone: ${tone.name}`);
    });
    
    toneCirclesContainer.appendChild(circleContainer);
  });
}

function selectTone(index) {
    currentSelectedToneIndex = index;
    
    // Remove previous user selection
    document.querySelectorAll('.tone-circle-container').forEach(container => {
        container.classList.remove('user-selected');
    });
    
    // Add user selected class to the new selection
    const selectedContainer = document.querySelector(`.tone-circle-container[data-tone-index="${index}"]`);
    selectedContainer.classList.add('user-selected');
    
    updateUISelection(index);
    console.log('Tone selected:', index, tones[index].name);

  // Instead of letting the tooltip time out, update its text to indicate the chosen tone.
  const tooltip = document.getElementById('swipe-tooltip');
  if (tooltip) {
    tooltip.classList.add('visible'); // Ensure it stays visible
    const tooltipSpan = tooltip.querySelector('span');
    if (tooltipSpan) {
      tooltipSpan.innerHTML = `You have choosen <span class="selected-tone">${tones[index].name}</span>`;
    } else {
      tooltip.innerHTML = `You have choosen <span class="selected-tone">${tones[index].name}</span>`;
    }
    
    // Hide the icon within the tooltip
    const tooltipIcon = tooltip.querySelector('i');
    if (tooltipIcon) {
      tooltipIcon.style.display = 'none';
    }
  }

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

  // Update the next button state when a tone is selected
  if (typeof window.updateNextButtonState === 'function') {
    window.updateNextButtonState(true);
  }
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
    if (currentSelectedToneIndex === null) {
        return {
            index: null,
            tone: null
        };
    }
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
