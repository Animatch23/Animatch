import subprocess
import os
import time

def run(cmd, cwd=None):
    p = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd, shell=True)
    return (p.stdout + p.stderr).strip()

current = run(["git", "branch", "--show-current"])

output = run(["git", "branch"])

branches = []
for line in output.splitlines():
    line = line.strip()
    if not line.startswith("*"):
        branches.append(line)
        
branches.append(current)

for branch in branches:
    print(run(["git", "switch", branch]))    
    