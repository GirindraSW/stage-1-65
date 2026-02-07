document.addEventListener("DOMContentLoaded", function () {
    // Get the ID
    const urlParams = new URLSearchParams(window.location.search); //query string
    const projectId = parseInt(urlParams.get('id'));
    //example project-details.html?id=3 taking "?id=3"

    // Load projects from Local Storage
    let projects = JSON.parse(localStorage.getItem("projects"));

    // Find the specific project
    const project = projects.find(p => p.id === projectId);

    // DOM Elements
    const title = document.getElementById("projectTitle");
    const image = document.getElementById("projectImage");
    const date = document.getElementById("projectDate");
    const durationEl = document.getElementById("projectDuration"); //Elements
    const techList = document.getElementById("techList");
    const desc = document.getElementById("projectDescription");

    //(if (project !== null)) undefined/null
    if (project) { 
        // Title & Image
        title.innerText = project.projectName;
        image.src = project.image;

        // Date
        date.innerHTML = `<i class="fa-regular fa-calendar-days me-2"></i> ${project.projectStart} - ${project.projectEnd}`;

        // Duration Calculation
        const duration = getDuration(project.projectStart, project.projectEnd);
        durationEl.innerHTML = `<i class="fa-solid fa-hourglass-half me-2"></i> ${duration}`;

        // Technologies
        techList.innerHTML = "";
        if(project.projectTech && project.projectTech.length > 0) {
            project.projectTech.forEach(tech => {
                // Create a span for each tech (Inline) smh is more clean (p is have padding)
                const span = document.createElement('span');
                span.className = "badge bg-secondary me-2 mb-2 p-2";
                span.innerText = tech;
                techList.appendChild(span);
            });
        } else {
            techList.innerText = "No technologies selected";
        }

        // Description
        desc.innerText = project.projectDesc;

    } else {
        // Handle project not found
        title.innerText = "Project Not Found";
        document.querySelector('.container').innerHTML = `
            <div class="alert alert-danger">Project not found. <a href="index.html">Go back</a></div>
        `;
    }
});

// Calculate duration (Days/Months)
function getDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Calculate in milliseconds
    // positive always
    let diffTime = Math.abs(endDate - startDate);
    
    // Convert milliseconds to days
    // Using Math.floor() bulat ke bawah
    let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); //ms s m h (in a day (86.400.000 millisecond)) 

    //math.ceil() bulat ke atas
    //math.round() terdekat
    
    return `${diffDays} Days`;
}