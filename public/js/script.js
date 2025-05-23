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

                // If this is a sub-item, make sure it gets the active class
                if (this.parentElement.classList.contains('sub-item')) {
                    // Remove active class from all sub-items
                    document.querySelectorAll('.sidenav .sub-item a').forEach(subLink => {
                        subLink.classList.remove('active-endpoint');
                    });

                    // Add active class to clicked sub-item
                    this.classList.add('active-endpoint');
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

        // Main sections
        const mainSectionLinks = document.querySelectorAll('.sidenav > div > ul > li > a');

        // Find which main section the current hash belongs to
        let activeMainSection = '#overview';
        if (currentHash.includes('scan')) {
            activeMainSection = '#scan-endpoints';
        } else if (currentHash.includes('auth') || currentHash === '#frontend-implementation') {
            activeMainSection = '#auth-endpoints';
        }

        // Set active main section
        mainSectionLinks.forEach(link => {
            if (link.getAttribute('href') === activeMainSection) {
                link.classList.add('active-section');
            }
        });

        // Set active sub-item
        if (currentHash !== '#overview' &&
            currentHash !== '#scan-endpoints' &&
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

            if (window.scrollY >= sectionTop - 100 &&
                window.scrollY < sectionTop + sectionHeight - 100) {
                currentSection = '#' + sectionId;
            }
        });

        if (currentSection && currentSection !== window.location.hash) {
            history.replaceState(null, null, currentSection);
            updateActiveStates();
        }
    });

    console.log('Anevia API Documentation loaded');
});
