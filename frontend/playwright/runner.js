import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runPython(script, args = []) {
    const scriptPath = path.resolve(__dirname, script);

    const p = spawn('pytest', [scriptPath, ...args], { stdio: 'inherit' });

    p.on('error', (err) => {
        console.error(`Error: ${err}`);
    });
}

function run() {
    runPython('tests/test_queue.py');
}

run()


