# Contextual Voice Note Mapper

**Never lose context for your voice notes again!**  
A web app that records voice notes with environmental context (location, weather, network conditions) and visualizes them on an interactive map.


## Problem Statement

People frequently record voice notes but often forget the **context** - where they were, what the environment was like, or why they recorded it. Traditional voice memo apps lack:

-  **Location context** (Where was I when I recorded this?)
-  **Environmental data** (What was the weather/temperature?)
-  **Network-aware recording** (Was I in a low-signal area affecting quality?)
-  **Visual mapping** (Where are all my notes clustered geographically?)

This app solves these problems by **automatically capturing rich context** with every voice note.

## Key Features

### Context-Aware Recording
- **Automatic location tagging** using Geolocation API
- **Real-time weather data** (temperature, conditions, humidity)
- **Network quality detection** (adjusts recording based on bandwidth)

### Smart Voice Capture
- **Speech-to-text transcription**
- **Voice pitch visualization** (Canvas API)
- **Background sync** for offline functionality

### Interactive Visualization
- **Map view** of all notes (Google Maps API)
- **Note clustering** by location density
- **Lazy loading** of transcripts (Intersection Observer API)

### Performance Optimizations
- **Adaptive recording quality** based on network conditions
- **Efficient data storage** with localStorage
- **CSV export** for data portability

## APIs Used

| API | Purpose |
|------|---------|
| **Geolocation API** | Tag notes with precise coordinates |
| **Network Information API** | Adjust recording quality dynamically |
| **Web Speech API** | Real-time speech recognition |
| **Canvas API** | Voice pitch visualization |
| **Intersection Observer API** | Lazy load note previews |
| **Google Maps API** | Interactive note mapping |
| **OpenWeather API** | Weather context data |

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Avinashvmetre20/Contextual-Voice-Note-Mapper
   cd Contextual-Voice-Note-Mapper


const GOOGLE_MAPS_API_KEY = 'your-key-here';
const OPENWEATHER_API_KEY = 'your-key-here';


graph TD
    A[User Starts Recording] --> B[Capture Location]
    B --> C[Get Weather Data]
    A --> D[Analyze Network Quality]
    D --> E[Adjust Recording Parameters]
    A --> F[Record Audio + Pitch Visualization]
    F --> G[Transcribe Speech]
    G --> H[Save with Context Metadata]
    H --> I[Display on Map]



    # Common Issues

## Location Not Working
- Ensure browser has location permissions
- Try over HTTPS (required by Geolocation API)

## No Sound Detected
- Check microphone permissions
- Try different microphone in browser settings

## Weather Data Missing
- Verify OpenWeather API key is valid
- Check console for quota exceeded errors

## Map Not Loading
- Confirm Google Maps API key is valid
- Check for "RefererNotAllowed" errors
