const form = document.getElementById("pform");

form.addEventListener("submit", async (e) => {
  

  const formData = new FormData(form);

  const response = await fetch("/myproject", {
    method: "POST",
    body: formData
  });

  const result = await response.json();

  if (result.success) {
    window.location.reload(); // reload page
  }
});





// //get element
// const pform = document.getElementById("pform");
// const projectList = document.getElementById("projectList");

// //state (load local storage)
// let projects = JSON.parse(localStorage.getItem("projects"));
// let projectId = 1;

// //logic to continue Id's number, so no replacement. (ID + 1)
// if (projects.length > 0) {
//     projectId = [projects.length - 1].id + 1;
// }

// //if there were saved file (Documents Object Models)
// document.addEventListener("DOMContentLoaded", () => {
//     renderProjects();
// });

// // submit form
// pform.addEventListener("submit", function (e){
//     e.preventDefault();

//     let projectName  = document.getElementById("pname").value;
//     let projectDesc  = document.getElementById("pdesc").value;
//     let projectStart = document.getElementById("pstart").value;
//     let projectEnd   = document.getElementById("pend").value;
//     const checkedBoxes = document.querySelectorAll('input[name="tech"]:checked');
//     let projectTech  = Array.from(checkedBoxes).map(box => box.value);

//     //let projectTech  = Array.from(checkedBoxes).map(function(box) {
//     // return box.value;
//     // });

//     const project = {
//         id: projectId,
//         projectName, 
//         projectStart, 
//         projectEnd, 
//         projectDesc, 
//         projectTech
//     }

//     projects.push(project);

//     saveProjects();

//     console.log(projects);



//     changeElement();
//     renderProjects();

//     //reset form
//     pform.reset();

//     projectId++
// })

// function saveProjects(){
//     localStorage.setItem("projects",JSON.stringify(projects));
// }

// // notif header about project  submited
// function changeElement(){
//     document.getElementById("header-project").innerHTML = 
//     `<p> project details submited</p>`
// }

// function renderProjects() {
//     projectList.innerHTML = "";

//     for (let i = 0; i < projects.length; i++) {
//         let techText = projects[i].projectTech.join(", ");
//         if (techText === "") techText = "No technologies selected";

//         projectList.innerHTML += `
//             <div class="col-md-4">
//                 <div class="card shadow-sm mb-4 clickable-card" 
//                      style="cursor: pointer; transition: transform 0.2s;"
//                      onclick="viewDetails(${projects[i].id})">

//                     <div class="card-body">
//                         <h4 class="card-title">
//                             ${projects[i].projectName}
//                         </h4>
//                         <p class="fs-6 text-muted">
//                             ${projects[i].projectStart} - ${projects[i].projectEnd}
//                         </p>
//                         <p class="fs-5 pt-2">
//                              ${projects[i].projectDesc}
//                         </p>
//                         <p class="text-primary fw-bold">
//                             Technologies: ${techText}
//                         </p>
//                         </div>
//                 </div>
//             </div>
//         `;
//     }
// }

// function viewDetails(id) {
//     window.location.href = `project-details.html?id=${id}`;
// }

// // filtering
// const sortFilter = document.getElementById("sortFilter");

// sortFilter.addEventListener("change", function() {
//     const sortType = this.value; //az,za,newest

//     if (sortType === "az") {
//         // Sort A-Z (Ascending)
//         projects.sort((a, b) => {
//             return a.projectName.toLowerCase().localeCompare(b.projectName.toLowerCase());
//         });
//     } else if (sortType === "za") {
//         // Sort Z-A (Descending)
//         projects.sort((a, b) => {
//             return b.projectName.toLowerCase().localeCompare(a.projectName.toLowerCase());
//         });
//     } else {
//         // Default Sort (Newest/Normally)
//         projects.sort((a, b) => b.id - a.id);
//     }
//     renderProjects();
// });