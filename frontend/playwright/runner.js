import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runPython(script, args = []) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(__dirname, script);

        const p = spawn('pytest', [scriptPath, ...args], { stdio: 'inherit' });

        p.on('error', (err) => {
            console.error(`Error spawning pytest: ${err}`);
            reject(err);
        });

        p.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`pytest exited with code ${code}`));
            }
        });
    });
}

async function run() {
    try {
        runPython('tests/test_queue.py');
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
}

run()


