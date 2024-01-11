import queue
import json
import sys
import os
import sounddevice as sd

from vosk import Model, KaldiRecognizer, SetLogLevel

q = queue.Queue()


# enable the following line if you do not want to see the logging of vosk.
# SetLogLevel(-1)


class STT():
    samplerate = None
    args = ""
    remaining = ""

    def __init__(self):
        device_info = sd.query_devices(mic, "input")
        self.samplerate = int(device_info["default_samplerate"])

        resources_folder = os.path.dirname(sys.argv[0])

        # you can get more models here: https://alphacephei.com/vosk/models
        vosk_model = os.path.join(
        resources_folder, "speech_to_text_models", "vosk-model-small-en-us-0.15"
        )

        self.model = Model(rf"{vosk_model}")
        self.dump_fn = None

        self.q = queue.Queue()
        self.rec = None
        self.is_running = False

    def callback(self, indata, frames, time, status):
        if status:
            print(status, file=sys.stderr)
        self.q.put(bytes(indata))

    def start_recognition(self):
        self.is_running = True

        with sd.RawInputStream(
            samplerate=self.samplerate,
            blocksize=8000,
            device=mic,  # Default microphone
            dtype="int16",
            channels=1,
            callback=self.callback,
        ):
            self.rec = KaldiRecognizer(self.model, self.samplerate)
            while True:
                data = self.q.get()
                if self.rec.AcceptWaveform(data):
                    result = self.rec.Result()
                    result_json = json.loads(str(result))
                    print(result)
                else:
                    partialResult = self.rec.PartialResult()
                    result_json = json.loads(str(partialResult))
                    print(partialResult)

    def stop_recognition(self):
        self.is_running = False


def stream_recognition():
    STT().start_recognition()

if __name__ == "__main__":
    print('{"status":"Started"}')
    mic = sys.argv[1]
    if not mic == -1:
        stream_recognition()
