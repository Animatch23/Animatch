import subprocess

def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True).stdout.strip()

current = run(["git", "branch", "--show-current"])

output = run(["git", "branch", "-a"])

branches = []
for line in output.splitlines():
    line = line.strip()
    
    if line.startswith("remotes/origin/") and not line.startswith("remotes/origin/HEAD"):
        name = line.replace("remotes/origin/", "")
        branches.append(name)
        
for branch in branches:
    result = run(["git", "checkout", "-b", branch, f"origin/{branch}"])
    
    print(result)
    
result = run(["git", "switch", current])
print(result)
