import fs from 'node:fs'
import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        host: true, // allow LAN access
        port: 5173, // fixed port
        https: {
            key: fs.readFileSync('./certs/devkey.pem'),
            cert: fs.readFileSync('./certs/devcert.pem'),
        }
    }
})
