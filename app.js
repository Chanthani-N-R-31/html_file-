document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    const flowchartImage = document.getElementById('flowchart-image');
    const currentFlowTitle = document.getElementById('current-flow-title');
    const panContainer = document.getElementById('pan-container');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnReset = document.getElementById('btn-reset');
    const mainContent = document.querySelector('.main-content');
    const viewerArea = document.getElementById('viewer-area');
    const panWrapper = document.getElementById('pan-wrapper');
    const flowDescriptionPanel = document.getElementById('flow-description');

    // Add a global toggle button that works when sidebar is hidden
    const globalToggleBtn = document.createElement('button');
    globalToggleBtn.className = 'icon-btn global-toggle';
    globalToggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    globalToggleBtn.setAttribute('aria-label', 'Open Sidebar');
    mainContent.appendChild(globalToggleBtn);

    // Sidebar Toggle Logic
    const toggleSidebar = () => {
        sidebar.classList.toggle('collapsed');
    };

    toggleBtn.addEventListener('click', toggleSidebar);
    globalToggleBtn.addEventListener('click', toggleSidebar);

    const footerTabs = document.querySelectorAll('.footer-tab');
    const sections = {
        'user-flows-section': document.getElementById('user-flows-section'),
        'feeder-flows-section': document.getElementById('feeder-flows-section')
    };

    // Sidebar Footer Logic
    footerTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Expand sidebar if collapsed
            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
            }

            footerTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.getAttribute('data-target');
            Object.keys(sections).forEach(key => {
                if (key === target) {
                    sections[key].style.display = 'block';
                    sections[key].setAttribute('open', ''); // ensure it's expanded
                } else {
                    sections[key].style.display = 'none';
                }
            });
        });
    });

    // Initialize to show only user flows initially
    sections['feeder-flows-section'].style.display = 'none';

    // Initial flow load
    const loadFlow = (flowName, imgFile) => {
        // Update Title
        currentFlowTitle.textContent = flowName;

        flowchartImage.style.opacity = '0';

        setTimeout(() => {
            if (imgFile) {
                flowchartImage.onload = () => {
                    flowchartImage.style.opacity = '1';
                    resetView();
                };
                flowchartImage.onerror = () => {
                    flowchartImage.style.opacity = '1';
                };
                flowchartImage.src = imgFile;
                if (flowchartImage.complete) {
                    flowchartImage.style.opacity = '1';
                    resetView();
                }
            } else {
                // Using a high-resolution placeholder with realistic dimensions (1920x1080)
                const urlText = flowName.replace(/\s+/g, '+');
                flowchartImage.onload = () => {
                    flowchartImage.style.opacity = '1';
                    resetView();
                };
                flowchartImage.src = `https://placehold.co/1920x1080/e2e8f0/334155?text=${urlText}`;
                if (flowchartImage.complete) {
                    flowchartImage.style.opacity = '1';
                    resetView();
                }
            }
        }, 200);
    };

    // Navigation Logic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add to clicked
            e.currentTarget.classList.add('active');

            // Get Flow Name
            const flowName = e.currentTarget.getAttribute('data-flow');
            const imgFile = e.currentTarget.getAttribute('data-img');
            const descId = e.currentTarget.getAttribute('data-desc');

            loadFlow(flowName, imgFile);

            // Handle Description Panel
            if (descId) {
                const hiddenDesc = document.getElementById(descId);
                if (hiddenDesc) {
                    flowDescriptionPanel.innerHTML = hiddenDesc.innerHTML;
                    flowDescriptionPanel.style.display = 'block';
                }
            } else {
                flowDescriptionPanel.style.display = 'none';
                flowDescriptionPanel.innerHTML = '';
            }

            // Auto-collapse on mobile after selection
            if (window.innerWidth <= 768) {
                sidebar.classList.add('collapsed');
            }
        });
    });

    // Event delegation for internal module tabs
    flowDescriptionPanel.addEventListener('click', (e) => {
        if (e.target.classList.contains('module-tab')) {
            // Scope to the nearest tab group container to prevent nested tab conflicts
            const tabsGroup = e.target.closest('.module-tabs');
            if (!tabsGroup) return;

            // Deactivate only tabs that belong in this specific group
            const tabs = tabsGroup.querySelectorAll('.module-tab');
            tabs.forEach(t => t.classList.remove('active'));

            // Hide only the contents targeted by tabs in this specific group
            tabs.forEach(t => {
                const id = t.getAttribute('data-target');
                if (id) {
                    const el = flowDescriptionPanel.querySelector(`#${id}`);
                    if (el) {
                        el.classList.remove('active');
                        el.style.display = 'none';
                    }
                }
            });

            // Activate the clicked tab
            e.target.classList.add('active');

            // Show corresponding text directly linked to this clicked tab
            const targetId = e.target.getAttribute('data-target');
            const targetContent = flowDescriptionPanel.querySelector(`#${targetId}`);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
            }

            // Update image safely if exists
            const newImg = e.target.getAttribute('data-img');
            if (newImg) {
                flowchartImage.style.opacity = '0';
                setTimeout(() => {
                    flowchartImage.onload = () => {
                        flowchartImage.style.opacity = '1';
                    };
                    flowchartImage.onerror = () => {
                        flowchartImage.style.opacity = '1';
                    };
                    flowchartImage.src = newImg;
                    if (flowchartImage.complete) {
                        flowchartImage.style.opacity = '1';
                    }
                }, 200);
            }
        }
    });

    // --- Image Viewer Logic (Pan & Zoom) ---
    let scale = 1;
    let pointX = 0;
    let pointY = 0;
    let startX = 0;
    let startY = 0;
    let isPanning = false;

    // Set transform on container
    const updateTransform = () => {
        panContainer.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    };

    // Reset View to Center
    const resetView = () => {
        scale = 1;
        pointX = 0;
        pointY = 0;

        panContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        updateTransform();

        // Remove transition after animation to allow smooth panning
        setTimeout(() => {
            panContainer.style.transition = '';
        }, 300);
    };

    // Zoom Functions
    const zoom = (direction, cursorX = null, cursorY = null) => {
        const zoomFactor = 0.15;
        let newScale = scale * (1 + (direction * zoomFactor));

        // Boundaries
        if (newScale < 0.2) newScale = 0.2;
        if (newScale > 5) newScale = 5;

        // If zooming via button, zoom towards center of the viewer wrapper
        if (cursorX === null || cursorY === null) {
            cursorX = panWrapper.clientWidth / 2;
            cursorY = panWrapper.clientHeight / 2;
        }

        // Calculate offset to keep zoom centered on pointer/center
        pointX = cursorX - (cursorX - pointX) * (newScale / scale);
        pointY = cursorY - (cursorY - pointY) * (newScale / scale);
        scale = newScale;

        updateTransform();
    };

    // Event Listeners for Viewer Tools
    btnZoomIn.addEventListener('click', () => zoom(1));
    btnZoomOut.addEventListener('click', () => zoom(-1));
    btnReset.addEventListener('click', resetView);

    // Mouse Wheel Zoom
    panWrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        // Determine direction
        const direction = e.deltaY < 0 ? 1 : -1;

        // Get mouse coordinates relative to pan wrapper
        const rect = panWrapper.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        zoom(direction, cursorX, cursorY);
    });

    // Panning (Drag)
    panWrapper.addEventListener('mousedown', (e) => {
        // Only trigger on left click (button 0)
        if (e.button !== 0) return;

        e.preventDefault();
        isPanning = true;

        // Record starting position incorporating current translation
        startX = e.clientX - pointX;
        startY = e.clientY - pointY;

        panContainer.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        e.preventDefault();

        // Calculate new position
        pointX = e.clientX - startX;
        pointY = e.clientY - startY;

        updateTransform();
    });

    const stopPanning = () => {
        if (!isPanning) return;
        isPanning = false;
        panContainer.style.cursor = 'grab';
    };

    window.addEventListener('mouseup', stopPanning);
    window.addEventListener('mouseleave', stopPanning);

    // Touch events for mobile/tablet panning
    panWrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isPanning = true;
            startX = e.touches[0].clientX - pointX;
            startY = e.touches[0].clientY - pointY;
            panContainer.style.transition = ''; // Prevent delayed movement
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isPanning) {
            e.preventDefault(); // Prevent native scroll
            pointX = e.touches[0].clientX - startX;
            pointY = e.touches[0].clientY - startY;
            updateTransform();
        }
    }, { passive: false });

    window.addEventListener('touchend', stopPanning);
});
