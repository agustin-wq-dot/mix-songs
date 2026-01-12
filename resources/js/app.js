import './bootstrap'
import '../css/app.css'
import { createApp } from 'vue'
import Mixer from './pages/Mixer.vue'

const app = createApp(Mixer)
app.mount('#app')
