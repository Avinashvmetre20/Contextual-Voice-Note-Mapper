// DOM Elements
const toggleBtn = document.getElementById('toggleBtn');
const status = document.getElementById('status');
const table = document.querySelector('#notesTable tbody');
const canvas = document.getElementById('pitchCanvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');

// App State
const STORAGE_KEY = 'voiceNotesAppData';
let isRecording = false;
let audioCtx, analyser, micStream, source;
let recognition;
let locationData = null;
let weatherData = null;
let quality = "unknown";
let observer;
let notes = loadNotes();
let pitchValues = [];

// Initialize
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
initializeObserver();
renderNotes();

// Event Listeners
toggleBtn.addEventListener('click', toggleRecording);
clearBtn.addEventListener('click', clearAllNotes);
exportBtn.addEventListener('click', exportToCSV);

// ============ NOTE STORAGE ============
function loadNotes() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : [];
}

function saveNotes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function clearAllNotes() {
    if (confirm('Are you sure you want to delete all notes?')) {
        notes = [];
        saveNotes();
        renderNotes();
    }
}

// ============ RENDERING ============
function renderNotes() {
    table.innerHTML = '';
    notes.forEach((note, index) => {
        const row = document.createElement('tr');

        // Make location cell clickable and parse coordinates
        const locationContent = note.location && note.location.includes('(')
            ? `<span class="location-link" data-lat="${note.location.match(/\(([-\d.]+),/)[1]}" 
                                  data-lng="${note.location.match(/,\s*([-\d.]+)\)/)[1]}">
                  ${note.location}
               </span>`
            : 'Unknown';

       // In the row.innerHTML template
row.innerHTML = `
    <td class="lazy-note" data-text="${note.text}">Loading preview...</td>
    <td class="location-cell">${locationContent}</td>
    <td>${note.description}</td>
    <td>${note.temp}</td>
    <td>${note.humidity}</td>
    <td>${note.pitch}</td>
    <td>${note.network?.effectiveType || 'Unknown'}</td>
    <td>${note.device?.platform || 'Unknown'}</td>
    <td>${note.time}</td>
    <td class="action-cell">
        <button class="delete-btn" data-index="${index}">
            delete
        </button>
    </td>
`;
        table.appendChild(row);
        observer.observe(row.children[0]);
    });

    // Add delete event listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            deleteNote(index);
        });
    });

    // Add location click handlers
    document.querySelectorAll('.location-link').forEach(location => {
        location.addEventListener('click', (e) => {
            e.stopPropagation();
            const lat = parseFloat(location.dataset.lat);
            const lng = parseFloat(location.dataset.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
                // Clear existing markers
                clearMarkers();

                // Add new marker
                const marker = new google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                    title: `Note: ${location.textContent.split('(')[0].trim()}`
                });
                markers.push(marker);

                // Center and zoom map
                map.setZoom(15);
                map.panTo({ lat, lng });

                // Highlight the row
                const row = location.closest('tr');
                row.style.backgroundColor = 'rgba(234, 67, 53, 0.1)';
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 1000);
            }
        });
    });
}

function deleteNote(index) {
    if (confirm('Are you sure you want to delete this note?')) {
        // Get location data before deleting
        const note = notes[index];
        let coords = null;

        if (note.location && note.location.includes('(')) {
            const lat = parseFloat(note.location.match(/\(([-\d.]+),/)[1]);
            const lng = parseFloat(note.location.match(/,\s*([-\d.]+)\)/)[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
                coords = { lat, lng };
            }
        }

        // Remove the note
        notes.splice(index, 1);
        saveNotes();
        renderNotes();

        // If this note was showing on map, clear the marker
        if (coords && markers.length > 0) {
            const markerPosition = markers[0].getPosition();
            if (markerPosition.lat() === coords.lat &&
                markerPosition.lng() === coords.lng) {
                clearMarkers();
            }
        }
    }
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// ============ INTERSECTION OBSERVER ============
function initializeObserver() {
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const text = entry.target.getAttribute('data-text');
                entry.target.textContent = text;
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
}

// ============ VOICE PITCH VISUALIZATION ============
function drawPitch() {
    if (!analyser) return;
    requestAnimationFrame(drawPitch);

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#4285f4";
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    let totalAmplitude = 0;

    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        totalAmplitude += Math.abs(v - 1);

        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    const avgAmplitude = totalAmplitude / bufferLength;
    pitchValues.push(avgAmplitude.toFixed(4));
}

// ============ WEATHER API ============
async function getWeather(lat, lon) {
    const API_KEY = 'a82a8c569ba30078634abab297814de3';
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        return {
            location: data.name,
            description: data.weather[0].description,
            temp: data.main.temp,
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            windSpeed: data.wind.speed
        };
    } catch (error) {
        console.error("Weather API error:", error);
        return null;
    }
}

// ============ RECORDING FUNCTIONS ============
async function startRecording() {
    try {
        // Get network quality
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        quality = connection?.downlink < 1.5 ? "low" : "high";

        // Get location
        locationData = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    lat: pos.coords.latitude.toFixed(4),
                    lon: pos.coords.longitude.toFixed(4)
                }),
                (err) => {
                    console.error("Geolocation error:", err);
                    resolve(null);
                }
            );
        });

        // Get weather if location available
        weatherData = locationData ? await getWeather(locationData.lat, locationData.lon) : null;

        // Initialize audio context and analyzer
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source = audioCtx.createMediaStreamSource(micStream);
        source.connect(analyser);
        drawPitch();

        // Initialize speech recognition
        if (!SpeechRecognition) {
            throw new Error("SpeechRecognition not supported");
        }

        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onstart = () => {
            status.textContent = " Listening...";
        };

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            const time = new Date().toLocaleTimeString();

            const avgPitch = pitchValues.length > 0
                ? (pitchValues.reduce((sum, val) => sum + parseFloat(val), 0) / pitchValues.length).toFixed(4)
                : "0.0000";

            pitchValues = [];

            // Update in the recognition.onresult handler
const note = {
    text: transcript.trim(),
    location: locationData
        ? `${weatherData?.location || 'Unknown'} (${locationData.lat}, ${locationData.lon})`
        : "Unknown",
    description: weatherData?.description || "Unknown",
    temp: weatherData?.temp ?? "—",
    humidity: weatherData?.humidity ?? "—",
    pressure: weatherData?.pressure ?? "—",
    wind: weatherData?.windSpeed ?? "—",
    pitch: avgPitch,
    time,
    quality,
    network: getNetworkInfo(),
    device: getDeviceInfo()
};

            notes.unshift(note);
            saveNotes();
            renderNotes();
        };

        recognition.onerror = (event) => {
            status.textContent = `Error: ${event.error}`;
        };

        recognition.start();
    } catch (error) {
        console.error("Recording error:", error);
        status.textContent = `Error: ${error.message}`;
        stopRecording();
    }
}

function stopRecording() {
    if (recognition) recognition.stop();
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    if (audioCtx) audioCtx.close();

    analyser = null;
    audioCtx = null;
    source = null;
    micStream = null;

    status.textContent = "Ready to record";
}

// ============ TOGGLE RECORDING ============
function toggleRecording() {
    if (!isRecording) {
        isRecording = true;
        toggleBtn.textContent = "⏹️ Stop Recording";
        toggleBtn.classList.add('recording');
        startRecording();
    } else {
        isRecording = false;
        toggleBtn.textContent = " Start Recording";
        toggleBtn.classList.remove('recording');
        stopRecording();
    }
}

// ============ SPEECH SYNTHESIS ============
table.addEventListener('click', (event) => {
    const target = event.target;

    // Handle transcript clicks (speech synthesis)
    if (target.classList.contains('lazy-note')) {
        const text = target.textContent || target.dataset.text;
        if (text && speechSynthesis) {
            // Stop any currently playing speech
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';

            const row = target.closest('tr');
            row.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';

            utterance.onend = () => {
                row.style.backgroundColor = '';
            };

            speechSynthesis.speak(utterance);
        }
    }

    // Handle location clicks (map pin)
    else if (target.classList.contains('location-link') || target.closest('.location-link')) {
        const locationCell = target.classList.contains('location-link') ? target : target.closest('.location-link');
        const locationText = locationCell.textContent;

        // Extract coordinates from text like "New York (40.7128, -74.0060)"
        const coordsMatch = locationText.match(/\(([-\d.]+),\s*([-\d.]+)\)/);

        if (coordsMatch && map) {
            const lat = parseFloat(coordsMatch[1]);
            const lng = parseFloat(coordsMatch[2]);
            const position = { lat, lng };

            // Clear existing markers
            clearMarkers();

            // Add new marker
            const marker = new google.maps.Marker({
                position: position,
                map: map,
                title: `Note from ${locationText.split('(')[0].trim()}`
            });
            markers.push(marker);

            // Center and zoom map
            map.setZoom(15);
            map.panTo(position);

            // Highlight the row temporarily
            const row = locationCell.closest('tr');
            row.style.backgroundColor = 'rgba(234, 67, 53, 0.1)';
            setTimeout(() => {
                row.style.backgroundColor = '';
            }, 1000);
        }
    }
});

// Helper function to clear all markers
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// ============ EXPORT FUNCTIONALITY ============
function exportToCSV() {
    if (notes.length === 0) {
        alert("No notes to export");
        return;
    }

    const headers = [
        'text', 'location', 'description', 'temp', 'humidity', 
        'pitch', 'networkType', 'networkSpeed', 'devicePlatform', 
        'deviceCores', 'deviceMemory', 'time'
    ];
    let csv = headers.join(",") + "\n";

    notes.forEach(note => {
        const row = [
            note.text,
            note.location,
            note.description,
            note.temp,
            note.humidity,
            note.pitch,
            note.network?.effectiveType || 'Unknown',
            note.network?.downlink || 'Unknown',
            note.device?.platform || 'Unknown',
            note.device?.cores || 'Unknown',
            note.device?.memory || 'Unknown',
            note.time
        ].map(value => {
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice_notes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

}

let map; // Make map global
let markers = []; // Store all markers

function initMap() {
    // Default to London if geolocation fails
    const defaultLocation = { lat: 51.5074, lng: -0.1278 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 4,
        center: defaultLocation
    });

    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(userLocation);
                addMarker(userLocation, "Your current location");
            },
            () => {
                console.log("Geolocation permission denied");
            }
        );
    }

    // Plot all saved note locations
    plotSavedNotes();
}

function addMarker(position, title) {
    // Clear existing markers
    clearMarkers();

    const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: title
    });

    markers.push(marker);
    map.panTo(position);
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

function plotSavedNotes() {
    notes.forEach(note => {
        if (note.location && typeof note.location === 'string') {
            // Extract coordinates from location string like "New York (40.7128, -74.0060)"
            const coordsMatch = note.location.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
            if (coordsMatch) {
                const lat = parseFloat(coordsMatch[1]);
                const lng = parseFloat(coordsMatch[2]);

                new google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                    title: note.text.substring(0, 30) + (note.text.length > 30 ? "..." : "")
                });
            }
        }
    });
}



// ============ NETWORK & SYSTEM INFO ============
function getNetworkInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return null;
    
    return {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 'unknown',
        rtt: connection.rtt || 'unknown',
        saveData: connection.saveData || false
    };
}

function getDeviceInfo() {
    return {
        platform: navigator.platform || 'unknown',
        userAgent: navigator.userAgent,
        cores: navigator.hardwareConcurrency || 'unknown',
        memory: navigator.deviceMemory || 'unknown',
        touchSupport: 'ontouchstart' in window
    };
}

function updateSystemInfo() {
    const networkInfo = getNetworkInfo();
    const deviceInfo = getDeviceInfo();
    
    const networkElement = document.getElementById('networkStatus');
    const deviceElement = document.getElementById('deviceInfo');
    
    if (networkInfo) {
        networkElement.innerHTML = `
            <strong>Network:</strong> ${networkInfo.effectiveType.toUpperCase()} | 
            <strong>Speed:</strong> ${networkInfo.downlink}Mb/s | 
            <strong>Latency:</strong> ${networkInfo.rtt}ms
        `;
    }
    
    deviceElement.innerHTML = `
        <strong>Device:</strong> ${deviceInfo.platform} | 
        <strong>Cores:</strong> ${deviceInfo.cores} | 
        <strong>Memory:</strong> ${deviceInfo.memory}GB
    `;
}

// Call this during initialization
updateSystemInfo();

// Listen for network changes
if (navigator.connection) {
    navigator.connection.addEventListener('change', updateSystemInfo);
}