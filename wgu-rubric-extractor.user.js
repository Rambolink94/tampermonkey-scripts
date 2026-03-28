// ==UserScript==
// @name         WGU Rubric Extractor
// @namespace    http://tampermonkey.net/
// @version      2026-03-28
// @description  Extract the a WGU Rubric, turning it into a task list and saving it locally.
// @author       Knight Steele
// @match        https://tasks.wgu.edu/student/*/course/*/task/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wgu.edu
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    const taskId = window.location.pathname.match(/\/task\/([^/]+)/)?.[1];
    if (!taskId) throw new Error('No task ID found in URL');

    const STORAGE_KEY = `rubric-state_${taskId}`;
    console.log(`Initializing rubric task list for Task: ${taskId}`);

	const rubricGrid = await waitForElement('app-rubric-grid');
	const rubricElements = rubricGrid.querySelectorAll('table tr td:nth-child(3) .rubric-result__description');
    createWindow(rubricElements);

	function waitForElement(selector) {
		return new Promise((resolve) => {
			try {
				const existingElement = document.querySelector(selector);
				if (existingElement) {
					resolve(existingElement);
					return;
				}
			} catch {}
			const observer = new MutationObserver(() => {
				try {
					const element = document.querySelector(selector);
					if (element) {
						observer.disconnect();
						removeUrlChangeListener();
						resolve(element);
						return;
					}
				} catch {}
			});

			const handleUrlChange = () => {
				observer.disconnect();
				removeUrlChangeListener();
				resolve(null);
			};

			const removeUrlChangeListener = () => {
				window.removeEventListener("urlchange", handleUrlChange);
			};

			window.addEventListener("urlchange", handleUrlChange);
			observer.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["class"]
			});
		});
	}

    function createWindow(rubricElements) {
        // --- Create container ---
        const win = document.createElement('div');
        win.style.cssText = `
            position: fixed;
            resize: horizontal;
            overflow: hidden;
            bottom: 0px;
            left: 20px;
            height: 500px;
            width: 700px;
            min-width: 150px;
            background: #1e1e1e;
            border: 1px solid #444;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            z-index: 999999;
            font-family: sans-serif;
            color: #fff;
            `;

        // --- Title bar ---
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #40798c;
            border-radius: 8px 8px 0 0;
            user-select: none;
            font-size: 16px;
            `;
        titleBar.innerHTML = `<span>Rubric Task List</span>`;

        // --- Minimize button ---
        const minBtn = document.createElement('button');
        minBtn.textContent = '—';
        minBtn.style.cssText = `
            background: none;
            border: none;
            color: #fff;
            cursor: pointer;
            font-size: 14px;
            padding: 0 4px;
            `;
        titleBar.appendChild(minBtn);

        // --- Content area ---
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 12px;
            height: 100%;
            overflow-y: auto;
            box-sizing: border-box;
            `;

        const rubricState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

        rubricElements.forEach((rubricElement, i) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 4px 20px;
                background: ${i % 2 === 0 ? '#2a2a2a' : 'transparent'};
                `;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'
            checkbox.id = `rubric-task-${i}`;

            checkbox.checked = rubricState[i] ?? false;

            checkbox.addEventListener('change', () => {
                rubricState[i] = checkbox.checked;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(rubricState));
            });

            const label = document.createElement('label');
            label.htmlFor = `rubric-task-${i}`;
            label.textContent = rubricElement.textContent;
            label.style.marginLeft = '6px';

            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            content.appendChild(wrapper);
        });

        win.appendChild(titleBar);
        win.appendChild(content);
        document.body.appendChild(win);

        // --- Minimize logic ---
        let minimized = false;
        let prevHeight = win.style.height;
        let prevBottom = win.style.bottom;
        let prevLeft = win.style.left;

        minBtn.addEventListener('click', () => {
            minimized = !minimized;

            if (minimized) {
                prevHeight = win.style.height;
                prevBottom = win.style.bottom;
                prevLeft = win.style.left;

                content.style.display = 'none';
                win.style.height = 'auto';
                win.style.resize = 'none';

                // Dock to bottom left
                win.style.bottom = '0';
                win.style.left = '20px';
                win.style.top = 'auto';
            } else {
                content.style.display = 'block';
                win.style.height = prevHeight;
                win.style.resize = 'both';

                // Restore original position
                win.style.bottom = prevBottom;
                win.style.left = prevLeft;
            }

            minBtn.textContent = minimized ? '+' : '—';
        });
    }
})();