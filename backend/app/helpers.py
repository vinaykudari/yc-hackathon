import os
import re
from openai import OpenAI


def fetch_instructions(persona_id):
    return {
        "instructions": """
        Apply the accessibility improvements using DOM manipulation.
        """,
        "code_snippet": """
        
        (function() {\n    // Remove any existing high contrast styles\n    const existingStyle = document.getElementById('high-contrast-mode');\n    if (existingStyle) {\n        existingStyle.remove();\n    }\n    \n    // Create and inject high contrast CSS\n    const style = document.createElement('style');\n    style.id = 'high-contrast-mode';\n    style.type = 'text/css';\n    style.innerHTML = `\n        html, body {\n            background-color: #000000 !important;\n            color: #ffffff !important;\n        }\n        \n        * {\n            background-color: #000000 !important;\n            color: #ffffff !important;\n            border-color: #ffffff !important;\n        }\n        \n        a, a:link, a:visited, a:hover, a:active {\n            background-color: #ffff00 !important;\n            color: #000000 !important;\n            text-decoration: underline !important;\n            border: 1px solid #ffffff !important;\n            padding: 2px 4px !important;\n        }\n        \n        button, input[type='button'], input[type='submit'] {\n            background-color: #ffff00 !important;\n            color: #000000 !important;\n            border: 2px solid #ffffff !important;\n            padding: 8px 12px !important;\n        }\n        \n        input, textarea, select {\n            background-color: #ffffff !important;\n            color: #000000 !important;\n            border: 2px solid #ffffff !important;\n        }\n        \n        h1, h2, h3, h4, h5, h6 {\n            color: #ffffff !important;\n            background-color: #000000 !important;\n            border-bottom: 2px solid #ffffff !important;\n        }\n        \n        /* Override any widget styles */\n        #ai-widget-root, #ai-widget-root * {\n            background-color: #000000 !important;\n            color: #ffffff !important;\n        }\n    `;\n    \n    // Ensure it's added to head\n    if (document.head) {\n        document.head.appendChild(style);\n    } else {\n        // Fallback if head isn't ready\n        document.addEventListener('DOMContentLoaded', function() {\n            document.head.appendChild(style);\n        });\n    }\n    \n    console.log('High contrast mode applied successfully');\n})();
        """
    }


def make_code_snippet(code: str, instruction: str) -> str:
    if not os.getenv('OPENAI_API_KEY'):
        return "Error: OPENAI_API_KEY not set in environment variables"

    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    prompt = f"""Create a JavaScript code snippet that transforms an EXISTING webpage for accessibility.

    CRITICAL REQUIREMENTS:
    - DO NOT return or recreate the original HTML
    - Return ONLY executable JavaScript that modifies the current DOM
    - Use document.createElement, document.querySelector, style manipulation
    - Apply accessibility transformations to existing elements
    - Use !important in CSS to override existing styles
    - Work on any website structure
    - Handle high contrast, ADHD focus, color blindness support

    TARGET WEBPAGE STRUCTURE:
    {code}

    TRANSFORMATION NEEDED:
    {instruction}

    Return ONLY the JavaScript transformation code (no HTML, no explanations):"""

    response = client.chat.completions.create(
        model="gpt-5-nano-2025-08-07",
        messages=[
            {"role": "system",
             "content": "You are a web accessibility expert. Return ONLY JavaScript code that transforms existing webpages. Never return HTML."},
            {"role": "user", "content": prompt}
        ],
    )

    snippet = (response.choices[0].message.content or "").strip()

    if "```" in snippet:
        snippet = re.sub(r"^```[a-zA-Z]*\n?", "", snippet)
        snippet = re.sub(r"\n?```$", "", snippet)

    return snippet.strip()

def make_code_snippet(code, instruction):
    res = """
    (() => {
  // Inject a small CSS stylesheet with important overrides for accessibility features
  const acStyle = document.createElement('style');
  acStyle.id = 'ac-styles';
  acStyle.textContent = `
    /* High contrast mode overrides */
    .ac-high-contrast, .ac-high-contrast * {
      color: #ffffff !important;
      background-color: #000000 !important;
      border-color: #ffffff !important;
    }
    .ac-high-contrast a, .ac-high-contrast a:visited {
      color: #4aa3ff !important;
      text-decoration: underline !important;
    }

    /* Color-safe palette (color blindness friendly) */
    .ac-color-safe, .ac-color-safe * {
      color: #111111 !important;
      background-color: #ffffff !important;
    }
    .ac-color-safe a, .ac-color-safe a:visited {
      color: #1a4f8b !important;
      text-decoration: underline !important;
    }

    /* Focus ring enhancements for ADHD focus support */
    .ac-focus :focus {
      outline: 3px solid #ffb300 !important;
      outline-offset: 2px !important;
      border-radius: 4px !important;
    }

    /* Reduce motion / animation-free mode */
    .ac-reduce-motion * {
      animation: none !important;
      transition: none !important;
    }

    /* Gentle boost for readability when needed */
    body.ac-visual-boost { background-color: #ffffff !important; color: #000000 !important; }
  `;
  document.head.appendChild(acStyle);

  // Create a minimal accessible toolbar
  const toolbar = document.createElement('div');
  toolbar.id = 'ac-toolbar';
  Object.assign(toolbar.style, {
    position: 'fixed',
    top: '12px',
    right: '12px',
    zIndex: '99999',
    background: '#ffffff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial',
  });

  // Button factory
  const makeBtn = (label, onClick, title) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.title = title || label;
    Object.assign(btn.style, {
      padding: '6px 10px',
      fontSize: '12px',
      borderRadius: '6px',
      border: '1px solid #888',
      background: '#f7f7f7',
      cursor: 'pointer',
    });
    btn.addEventListener('mouseenter', () => btn.style.background = '#eee');
    btn.addEventListener('mouseleave', () => btn.style.background = '#f7f7f7');
    btn.addEventListener('click', onClick);
    return btn;
  };

  // State and toggles
  let highContrastEnabled = false;
  const toggleHighContrast = () => {
    highContrastEnabled = !highContrastEnabled;
    if (highContrastEnabled) {
      document.body.classList.add('ac-high-contrast');
      document.documentElement.classList.add('ac-high-contrast');
    } else {
      document.body.classList.remove('ac-high-contrast');
      document.documentElement.classList.remove('ac-high-contrast');
    }
  };

  let colorSafeEnabled = false;
  const toggleColorSafe = () => {
    colorSafeEnabled = !colorSafeEnabled;
    if (colorSafeEnabled) {
      document.body.classList.add('ac-color-safe');
      document.querySelectorAll('*').forEach(el => el.classList.add('ac-color-safe'));
    } else {
      document.body.classList.remove('ac-color-safe');
      document.querySelectorAll('*').forEach(el => el.classList.remove('ac-color-safe'));
    }
  };

  let focusEnabled = true;
  const toggleFocus = () => {
    focusEnabled = !focusEnabled;
    if (focusEnabled) {
      document.documentElement.classList.add('ac-focus');
    } else {
      document.documentElement.classList.remove('ac-focus');
    }
  };

  let reduceMotionEnabled = false;
  const toggleReduceMotion = () => {
    reduceMotionEnabled = !reduceMotionEnabled;
    if (reduceMotionEnabled) {
      document.documentElement.classList.add('ac-reduce-motion');
      document.body.classList.add('ac-reduce-motion');
    } else {
      document.documentElement.classList.remove('ac-reduce-motion');
      document.body.classList.remove('ac-reduce-motion');
    }
  };

  // Toolbar buttons
  const btnContrast = makeBtn('High Contrast', toggleHighContrast, 'Toggle high contrast mode');
  const btnColorSafe = makeBtn('Color Safe', toggleColorSafe, 'Toggle color-safe palette for color blindness');
  const btnFocus = makeBtn('Focus Ring', toggleFocus, 'Toggle stronger focus outlines');
  const btnReduceMotion = makeBtn('Reduce Motion', toggleReduceMotion, 'Toggle reduced motion (animations)');

  // Initialize focus enhancement by default
  document.documentElement.classList.add('ac-focus');

  toolbar.appendChild(btnContrast);
  toolbar.appendChild(btnColorSafe);
  toolbar.appendChild(btnFocus);
  toolbar.appendChild(btnReduceMotion);
  document.body.appendChild(toolbar);

  // Skip to content anchor
  const skipLink = document.createElement('a');
  skipLink.href = '#ac-main-content';
  skipLink.id = 'ac-skip';
  skipLink.textContent = 'Skip to content';
  Object.assign(skipLink.style, {
    position: 'absolute',
    top: '-40px',
    left: '8px',
    padding: '6px 8px',
    background: '#111',
    color: '#fff',
    borderRadius: '4px',
    textDecoration: 'none',
    zIndex: '100000',
  });
  skipLink.addEventListener('focus', () => { skipLink.style.top = '8px'; });
  skipLink.addEventListener('blur', () => { skipLink.style.top = '-40px'; });

  // Determine a main content target
  let mainContent = document.querySelector('main');
  if (!mainContent) {
    mainContent = document.querySelector('[role="main"]') || document.body;
  }
  if (!document.getElementById('ac-main-content')) {
    const target = mainContent || document.body;
    target.id = target.id || 'ac-main-content';
  }

  document.body.insertBefore(skipLink, document.body.firstChild);

  // Keyboard shortcuts (Ctrl/Cmd + H/C/F/M)
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 'h') toggleHighContrast();
    else if (e.key.toLowerCase() === 'c') toggleColorSafe();
    else if (e.key.toLowerCase() === 'f') toggleFocus();
    else if (e.key.toLowerCase() === 'm') toggleReduceMotion();
  });

  // Improve accessibility of main region
  if (mainContent && !mainContent.getAttribute('role')) {
    mainContent.setAttribute('role', 'main');
  }
  if (mainContent && !mainContent.hasAttribute('tabindex')) {
    mainContent.setAttribute('tabindex', '-1');
  }

  // Skip-to-content behavior
  skipLink.addEventListener('click', (ev) => {
    ev.preventDefault();
    const target = document.getElementById('ac-main-content') || document.querySelector('main') || document.body;
    if (target) {
      target.focus();
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });

  // Accessibility landmark for toolbar
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Accessibility toolbar');
})();
    """
    return res
