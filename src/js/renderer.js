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

// Create Python backend -----------------------------------------------------
const spawn = require('child_process').spawn;
const sttResult = document.querySelector('#result');
const sttPartial = document.querySelector('#partial');
let selectedMic = null;

// Start and capture output of python process
const createBackendServer = () =>
  new Promise((resolve) => {
    // Spawn python process and send the selected mic as argument
    python = spawn('python', ['-u', './src/python/stt.py', selectedMic]);

    // Capture the stdout of the Python process
    python.stdout.on('data', (data) => {
      result = JSON.parse(data);
      console.log(result);
      if (result.status === 'started') {
        // Successfully started backend
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
      console.error(`${data}`);
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
    createBackendServer(selectedMic).then(() => {
      // Do something after the python process started
    });
  } catch (error) {
    console.error('Error during backend initialization:', error);
  }
});
