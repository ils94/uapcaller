function main() {
  let context;
  let nodes = [];
  let chirpInterval;
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");

  startButton.onclick = () => {
    context = new (window.AudioContext || window.webkitAudioContext)();
    startAudioLayers();
    startButton.disabled = true;
    stopButton.disabled = false;
  };

  stopButton.onclick = () => {
    nodes.forEach((n) => n.stop && n.stop());
    nodes = [];
    clearInterval(chirpInterval);
    startButton.disabled = false;
    stopButton.disabled = true;
  };

  function startAudioLayers() {
    // 1. 7.83 Hz carrier via amplitude-modulated 100 Hz base tone
    {
      const carrier = context.createOscillator();
      carrier.frequency.value = 100;

      const ampGain = context.createGain();
      const lfo = context.createOscillator(); // 7.83 Hz LFO
      const lfoGain = context.createGain();

      lfo.frequency.value = 7.83;
      lfoGain.gain.value = 0.5; // amplitude depth

      lfo.connect(lfoGain);
      lfoGain.connect(ampGain.gain);

      carrier.connect(ampGain);
      ampGain.connect(context.destination);

      lfo.start();
      carrier.start();

      nodes.push(carrier, lfo);
    }

    // 2. 528 Hz harmonic tone
    {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = 528;
      osc.type = "sine";
      gain.gain.value = 0.05;
      osc.connect(gain).connect(context.destination);
      osc.start();
      nodes.push(osc);
    }

    // 3. 17 kHz ultrasonic ping (subtle, pulsed)
    {
      const ping = () => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.frequency.value = 17 * 1000;
        gain.gain.value = 0.1;
        osc.connect(gain).connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.05);
      };

      setInterval(ping, 3 * 1000); // pulse every 3 seconds
    }

    // 4. 2.5 kHz chirps every 10 sec
    {
      chirpInterval = setInterval(() => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.frequency.setValueAtTime(2500, context.currentTime);
        osc.type = "square";
        gain.gain.setValueAtTime(0.2, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          context.currentTime + 0.2
        );
        osc.connect(gain).connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.2);
        nodes.push(osc);
      }, 10000);
    }

    // 5. 432 Hz ambient pad
    {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = 432;
      osc.type = "triangle";
      gain.gain.value = 0.02;
      osc.connect(gain).connect(context.destination);
      osc.start();
      nodes.push(osc);
    }

    // 6. Breath layer - white noise shaped like breath
    {
      const bufferSize = 2 * context.sampleRate;
      const noiseBuffer = context.createBuffer(
        1,
        bufferSize,
        context.sampleRate
      );
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = context.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const noiseGain = context.createGain();
      noiseGain.gain.setValueAtTime(0.03, context.currentTime);

      // Breath-like pulsing
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 0.25; // slow breath rate
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(noiseGain.gain);

      whiteNoise.connect(noiseGain).connect(context.destination);
      whiteNoise.start();
      lfo.start();

      nodes.push(whiteNoise, lfo);
    }
  }
}

function ready(fn) {
  if (document.readyState !== "loading") {
    fn();
    return;
  }
  document.addEventListener("DOMContentLoaded", fn);
}
ready(main);
