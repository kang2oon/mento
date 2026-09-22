import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """        }
      }
  };"""

replacement = """        }
      }
    });
  };"""

content = content.replace(target, replacement)

with open('src/App.tsx', 'w') as f:
    f.write(content)
