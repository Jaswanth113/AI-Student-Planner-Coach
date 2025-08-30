/// <reference types="vite/client" />

// Minimal typings for Web Speech API used in Tasks page
type SpeechRecognition = any;
interface Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}
