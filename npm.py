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
    gitignore_path = os.path.join("backend", ".gitignore")
    
    if not os.path.exists(gitignore_path):
        with open(gitignore_path, "w") as f:
            f.write("/node_modules\n")
        print(f"backend/.gitignore created for {branch}")
        
    
    print(run(["git", "add", "."]))    
    print(run(["git", "commit", "-m", "Add gitignore for backend node modules"]))
    print(run(["git", "push", "origin/{branch}"]))    
    print("\n")