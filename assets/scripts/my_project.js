


//get element
const pform = document.getElementById("pform");
const projectList = document.getElementById("projectList");

//state (temporarry save file)
let projects = [];
let projectId = 1;

// submit form
pform.addEventListener("submit", function (e){
    e.preventDefault();

    let projectName  = document.getElementById("pname").value;
    let projectDesc  = document.getElementById("pdesc").value;
    let projectStart = document.getElementById("pstart").value;
    let projectEnd   = document.getElementById("pend").value;
    const checkedBoxes = document.querySelectorAll('input[name="tech"]:checked');
    let projectTech  = Array.from(checkedBoxes).map(box => box.value);

    //let projectTech  = Array.from(checkedBoxes).map(function(box) {
    // return box.value;
    // });

    const project = {projectName, projectStart, projectEnd, projectDesc, projectTech}

    projects.push(project);
    console.log(projects);



    changeElement();
    renderProjects();

    //reset form
    pform.reset();
})

// notif header about project  submited
function changeElement(){
    document.getElementById("header-project").innerHTML = 
    `<p> project details submited</p>`
}

function renderProjects() {
    projectList.innerHTML = "";

    for (let i = 0; i < projects.length; i++) {
        let techText = projects[i].projectTech.join(", ");
        if (techText === "") techText = "No technologies selected";

        projectList.innerHTML += `
            <div class="col-md-4">
                <div class="card shadow-sm mb-4">
                    <div class="card-body">
                        <h4 class="card-title">
                            ${projects[i].projectName}
                        </h4>
                        <p class="fs-6 text-muted">
                            ${projects[i].projectStart} - ${projects[i].projectEnd}
                        </p>
                        <p class="fs-5 pt-2">
                             ${projects[i].projectDesc}
                        </p>
                        <p class="text-primary fw-bold">
                            Technologies: ${techText}
                        </p>
                        </div>
                </div>
            </div>
        `;
    }
}

// function renderUsers(){
//     userList.innerHTML = "";

//     for (let i = 0; i < users.length; i++){
//         userList.innerHTML += `
//          <div>
//         <h5>${users[i].firstName}</h5>
//         <h5>${users[i].lastName}</h5>
//         </div>
//         `
        
//     }
// }