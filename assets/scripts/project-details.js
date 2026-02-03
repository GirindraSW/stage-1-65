document.addEventListener("DOMContentLoaded", function () {
    // Get the ID
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = parseInt(urlParams.get('id'));

    // Load projects from Local Storage
    let projects = JSON.parse(localStorage.getItem("projects"));

    // Find the specific project
    const project = projects.find(p => p.id === projectId);

    // DOM Elements
    const titleEl = document.getElementById("projectTitle");
    const imageEl = document.getElementById("projectImage");
    const dateEl = document.getElementById("projectDate");
    const durationEl = document.getElementById("projectDuration");
    const techListEl = document.getElementById("techList");
    const descEl = document.getElementById("projectDescription");

    if (project) { 
        // Title & Image
        titleEl.innerText = project.projectName;
        imageEl.src = project.image;

        // Date
        dateEl.innerHTML = `<i class="fa-regular fa-calendar-days me-2"></i> ${formatDate(project.projectStart)} - ${formatDate(project.projectEnd)}`;

        // Duration Calculation
        const duration = getDuration(project.projectStart, project.projectEnd);
        durationEl.innerHTML = `<i class="fa-solid fa-hourglass-half me-2"></i> ${duration}`;

        // Technologies
        techListEl.innerHTML = "";
        if(project.projectTech && project.projectTech.length > 0) {
            project.projectTech.forEach(tech => {
                // Create a span for each tech
                const span = document.createElement('span');
                span.className = "badge bg-secondary me-2 mb-2 p-2";
                span.innerText = tech;
                techListEl.appendChild(span);
            });
        } else {
            techListEl.innerText = "No technologies selected";
        }

        // Description
        descEl.innerText = project.projectDesc;

    } else {
        // Handle project not found
        titleEl.innerText = "Project Not Found";
        document.querySelector('.container').innerHTML = `
            <div class="alert alert-danger">Project not found. <a href="index.html">Go back</a></div>
        `;
    }
});

// Calculate duration (Days/Months)
function getDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Calculate difference in time
    let diffTime = Math.abs(endDate - startDate);
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays < 30) {
        return `${diffDays} Day(s)`;
    } else {
        let months = Math.floor(diffDays / 30);
        return `${months} Month(s)`;
    }
}

// Format Date string YYYY-MM-DD
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}