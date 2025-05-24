document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('.sidenav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 20,
                    behavior: 'smooth'
                });

                // Update URL hash without jumping
                history.pushState(null, null, targetId);

                // Update active states
                updateActiveStates();

                // If this is a sub-item, make sure its parent dropdown is open and it gets the active class
                if (this.closest('.dropdown-menu')) {
                    const parentDropdownToggle = this.closest('.dropdown-toggle');
                    if (parentDropdownToggle && !parentDropdownToggle.classList.contains('active')) {
                        parentDropdownToggle.classList.add('active');
                        const dropdownMenu = parentDropdownToggle.querySelector('.dropdown-menu');
                        if (dropdownMenu) {
                            dropdownMenu.classList.add('active');
                        }
                    }
                }
            }
        });
    });

    // Function to highlight main sections and sub-items
    function updateActiveStates() {
        const currentHash = window.location.hash || '#overview';

        // Remove active class from main sections
        document.querySelectorAll('.sidenav > div > ul > li > a').forEach(link => {
            link.classList.remove('active-section');
        });

        // Remove active class from all sub-items
        document.querySelectorAll('.sidenav .sub-item a').forEach(link => {
            link.classList.remove('active-endpoint');
        });

        // Close all dropdowns initially
        document.querySelectorAll('.sidenav .dropdown-toggle').forEach(toggle => {
            toggle.classList.remove('active');
            const menu = toggle.querySelector('.dropdown-menu');
            if (menu) {
                menu.classList.remove('active');
            }
        });

        // Main sections
        const mainSectionLinks = document.querySelectorAll('.sidenav > div > ul > li > a');

        // Find which main section the current hash belongs to
        let activeMainSection = '#overview';
        if (currentHash.includes('scan')) {
            activeMainSection = '#scan-endpoints';
        } else if (currentHash.includes('chat')) { // Added chat endpoints
            activeMainSection = '#chat-endpoints';
        } else if (currentHash.includes('auth') || currentHash === '#frontend-implementation') {
            activeMainSection = '#auth-endpoints';
        }

        // Set active main section and open its dropdown if it's a dropdown toggle
        mainSectionLinks.forEach(link => {
            if (link.getAttribute('href') === activeMainSection) {
                link.classList.add('active-section');
                const parentDropdownToggle = link.closest('.dropdown-toggle');
                if (parentDropdownToggle) {
                    parentDropdownToggle.classList.add('active');
                    const dropdownMenu = parentDropdownToggle.querySelector('.dropdown-menu');
                    if (dropdownMenu) {
                        dropdownMenu.classList.add('active');
                    }
                }
            }
        });

        // Set active sub-item
        if (currentHash !== '#overview' &&
            currentHash !== '#scan-endpoints' &&
            currentHash !== '#chat-endpoints' && // Added chat endpoints
            currentHash !== '#auth-endpoints') {
            const activeEndpointLink = document.querySelector(`.sidenav a[href="${currentHash}"]`);
            if (activeEndpointLink) {
                activeEndpointLink.classList.add('active-endpoint');
            }
        }
    }

    // Initial active state
    updateActiveStates();

    // Update active state on scroll
    window.addEventListener('scroll', function() {
        // Get all sections, endpoints, and subsections with IDs
        const sections = document.querySelectorAll('section[id], div.endpoint[id], div.subsection[id]');
        let currentSection = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            // Adjust scroll threshold for better active state detection
            if (window.scrollY >= sectionTop - 150 &&
                window.scrollY < sectionTop + sectionHeight - 150) {
                currentSection = '#' + sectionId;
            }
        });

        if (currentSection && currentSection !== window.location.hash) {
            history.replaceState(null, null, currentSection);
            updateActiveStates();
        }
    });

    // Dropdown toggle functionality
    document.querySelectorAll('.sidenav .dropdown-toggle > a').forEach(toggleLink => {
        toggleLink.addEventListener('click', function(e) {
            // Prevent default anchor link behavior if it's a dropdown toggle
            // Only prevent if the click is on the main link, not a sub-item
            if (this.parentElement.classList.contains('dropdown-toggle')) {
                e.preventDefault();
            }

            const parentLi = this.parentElement;
            const dropdownMenu = parentLi.querySelector('.dropdown-menu');

            if (parentLi && dropdownMenu) {
                parentLi.classList.toggle('active');
                dropdownMenu.classList.toggle('active');
            }
        });
    });

    console.log('Anevia API Documentation loaded');
});
