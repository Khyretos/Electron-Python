const fs = require('fs');
const spawn = require('child_process').spawn;

// Media devices -------------------------------------------------------------
function getAvailableMediaDevices(type) {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const microphones = devices.filter((device) => device.kind === type);
        resolve(microphones);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

// Microphones
const micSelect = document.querySelector('#microphones');

getAvailableMediaDevices('audioinput')
  .then((microphones) => {
    let tempname = '';
    for (const [index, mic] of microphones.entries()) {
      if (mic.deviceId === 'default') {
        tempname = mic.label.slice(10); // remove "default -" from the label to get the default device name.
      }

      // Don't add default mic nor communications device to prevent duplicates
      // This will make the microphones list equal to the sounddevices list in python
      if (mic.deviceId === 'communications' || mic.label === tempname) {
        continue;
      }

      const option = document.createElement('option');

      // Set the options value and text.
      option.value = index;
      option.innerHTML = `${mic.label}`;

      // Add the option to the voice selector.
      micSelect.appendChild(option);
    }
  })
  .catch((error) => {
    console.error('Error retrieving microphones:', error);
  });

// STT models
const sttSelect = document.querySelector('#models');
fs.readdir('./src/python/speech_to_text_models/', (err, folders) => {
  if (err) {
    console.error(err);
  }

  for (const folder of folders) {
    // Create a new option element.
    const option = document.createElement('option');

    // Set the options value and text.
    option.value = folder;
    option.innerHTML = folder;

    // Add the option to the sound selector.
    sttSelect.appendChild(option);
  }
});

// Create Python backend -----------------------------------------------------

const sttResult = document.querySelector('#result');
const sttPartial = document.querySelector('#partial');
const status = document.querySelector('#status');
let selectedMic = null;
let selectedModel = null;

// Start and capture output of python process
const createBackendServer = () =>
  new Promise((resolve) => {
    // Spawn python process and send the selected mic as argument
    // the -u parameter makes it spawn unbuffered meaning it will recieve all the output of the python process
    python = spawn('python', ['-u', './src/python/stt.py', selectedMic, selectedModel]);

    // Capture the stdout of the Python process
    python.stdout.on('data', (data) => {
      result = JSON.parse(data);
      console.log(result);
      if (result.status === 'Started') {
        // Successfully started STT
        status.innerHTML = '🟩 Started';
        resolve('finished');
      }

      if (result.text) {
        // Set result in textarea with id result
        sttResult.innerHTML = result.text;
      }

      if (result.partial) {
        // Set result in textarea with id partial
        sttPartial.innerHTML = result.partial;
      }
    });

    // Capture the stderr of the Python process
    python.stderr.on('data', (data) => {
      // Sometimes output can be detected as errors. It depends on the python library how they output it
      if (data.toString().startsWith('LOG')) {
        console.info(`${data}`);
      } else {
        status.innerHTML = '🟨 Errors';
        console.error(`${data}`);
      }
    });

    // Listen for the Python process to exit
    python.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
    });

    if (typeof python.pid !== 'number') {
      console.log('failed');
    } else {
      // Python process ID
      console.log(`Spawned subprocess correctly!, PID = ${python.pid}`);
    }
  });

// Button event to start STT
document.body.querySelector('#start-stt').addEventListener('click', () => {
  try {
    selectedMic = document.querySelector('#microphones').value;
    selectedModel = document.querySelector('#models').value;
    createBackendServer().then(() => {
      // Do something after the python process started
    });
  } catch (error) {
    console.error('Error during backend initialization:', error);
  }
});
