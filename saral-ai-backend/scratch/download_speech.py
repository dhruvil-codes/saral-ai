import urllib.request
import os
import subprocess

url = "https://github.com/voxserv/audio_quality_testing_samples/raw/master/testaudio/16000/test01_20s.wav"
dest_temp = "d:\\saral-ai\\assets\\temp_speech.wav"
dest_final = "d:\\saral-ai\\assets\\real_voice.wav"

os.makedirs("d:\\saral-ai\\assets", exist_ok=True)

print(f"Downloading {url}...")
urllib.request.urlretrieve(url, dest_temp)
print("Downloaded temp file.")

print("Converting to 16kHz mono WAV via ffmpeg...")
cmd = ["ffmpeg", "-y", "-i", dest_temp, "-acodec", "pcm_s16le", "-ac", "1", "-ar", "16000", dest_final]
subprocess.run(cmd, check=True)
print("Conversion successful. Final file saved at:", dest_final)

if os.path.exists(dest_temp):
    os.remove(dest_temp)
