import {App} from './app.js';


const app = new App({container: document.getElementById('app')});
app.start();


// Expose for console debugging
window.__app = app;