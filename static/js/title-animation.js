document.addEventListener('DOMContentLoaded', function() {
    // Get all title elements
    const titles = document.querySelectorAll('.text-title');
    
    titles.forEach(title => {
        // Get all words in the title
        const words = title.querySelectorAll('.word');
        let totalChars = 0;
        let capitalCount = 0; // Track capital letters for color alternation
        
        // Process each word
        words.forEach(word => {
            const text = word.textContent.trim();
            word.textContent = ''; // Clear the word
            
            // Create spans for each character
            for (let i = 0; i < text.length; i++) {
                const charSpan = document.createElement('span');
                charSpan.classList.add('char');
                charSpan.textContent = text[i];
                charSpan.dataset.position = totalChars; // Store position for cursor movement
                
                // Check if this is a capital letter to determine color
                if (/[A-Z]/.test(text[i])) {
                    // Alternate colors for capital letters
                    if (capitalCount % 2 === 0) {
                        charSpan.style.color = '#ffffff'; // White for even capitals
                    } else {
                        charSpan.style.color = '#fc4242'; // Red for odd capitals
                    }
                    capitalCount++;
                } else {
                    // For non-capital letters, use the color of the previous capital
                    if (capitalCount > 0) {
                        if ((capitalCount - 1) % 2 === 0) {
                            charSpan.style.color = '#ffffff'; // White
                        } else {
                            charSpan.style.color = '#fc4242'; // Red
                        }
                    } else {
                        // Default color if no capital yet
                        charSpan.style.color = '#ffffff';
                    }
                }
                
                // Calculate delay: 1.5s initial delay (for cursor to blink) + time for previous characters
                const delay = 1.5 + (totalChars * 0.15); // Slower typing speed
                charSpan.style.animationDelay = `${delay}s`;
                
                word.appendChild(charSpan);
                totalChars++;
            }
            
            // Add a space after each word except the last one
            if (word !== words[words.length - 1]) {
                const space = document.createElement('span');
                space.textContent = ' ';
                space.dataset.position = totalChars;
                word.after(space);
                totalChars++;
            }
        });
        
        // Set initial cursor position - make sure it's visible from the start
        title.style.setProperty('--cursor-left', '0px');
        
        // Create a function to move the cursor
        function moveCursor() {
            const visibleChars = title.querySelectorAll('.char');
            if (visibleChars.length === 0) return;
            
            // Find the last visible character
            let lastVisibleChar = null;
            for (let i = visibleChars.length - 1; i >= 0; i--) {
                if (window.getComputedStyle(visibleChars[i]).opacity > 0) {
                    lastVisibleChar = visibleChars[i];
                    break;
                }
            }
            
            if (lastVisibleChar) {
                // Calculate cursor position based on the last visible character
                const charRect = lastVisibleChar.getBoundingClientRect();
                const titleRect = title.getBoundingClientRect();
                const cursorPos = charRect.right - titleRect.left + 5;
                
                // Set cursor position
                title.style.setProperty('--cursor-left', `${cursorPos}px`);
            }
        }
        
        // Start moving the cursor after a delay to let it blink in place first
        setTimeout(() => {
            // Move cursor less frequently for smoother animation
            const cursorInterval = setInterval(moveCursor, 200);
            
            // Stop the interval after all characters have appeared
            setTimeout(() => {
                clearInterval(cursorInterval);
                
                // Final cursor position at the end of text
                const allChars = title.querySelectorAll('.char');
                if (allChars.length > 0) {
                    const lastChar = allChars[allChars.length - 1];
                    const charRect = lastChar.getBoundingClientRect();
                    const titleRect = title.getBoundingClientRect();
                    const cursorPos = charRect.right - titleRect.left + 5;
                    
                    title.style.setProperty('--cursor-left', `${cursorPos}px`);
                }
            }, (totalChars * 150) + 1000);
        }, 1500); // Start moving cursor after 1.5s (matches the initial delay for characters)
    });
}); 